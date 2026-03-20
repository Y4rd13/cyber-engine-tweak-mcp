import { createServer, type Server, type Socket } from "node:net";
import type { Transport } from "./index.js";
import type { BridgeRequest, BridgeResponse } from "../utils/protocol.js";
import { parseResponse } from "../utils/protocol.js";

const DELIMITER = "\r\n";
const TIMEOUT_MS = 5000;

interface PendingRequest {
  resolve: (response: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class TcpServerTransport implements Transport {
  readonly name = "tcp";
  private server: Server;
  private client: Socket | null = null;
  private pending = new Map<string, PendingRequest>();
  private buffer = "";
  private lastHeartbeat: Date | null = null;
  private port: number;
  private ready: Promise<void>;

  constructor(port: number = 27010) {
    this.port = port;
    this.server = createServer((socket) => this.handleConnection(socket));
    this.ready = new Promise((resolve, reject) => {
      this.server.listen(this.port, "127.0.0.1", () => {
        console.error(`[cet-mcp] TCP server listening on 127.0.0.1:${this.port}`);
        resolve();
      });
      this.server.on("error", (err) => {
        console.error(`[cet-mcp] TCP server error: ${err.message}`);
        reject(err);
      });
    });
  }

  async waitReady(): Promise<void> {
    return this.ready;
  }

  private handleConnection(socket: Socket): void {
    if (this.client) {
      console.error("[cet-mcp] New client connected, replacing previous");
      this.client.destroy();
    }

    this.client = socket;
    this.buffer = "";
    this.lastHeartbeat = new Date();
    console.error("[cet-mcp] CET Bridge connected via TCP");

    socket.on("data", (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    socket.on("close", () => {
      console.error("[cet-mcp] CET Bridge disconnected");
      if (this.client === socket) {
        this.client = null;
      }
      // Reject all pending requests
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.resolve({ id, ok: false, error: "Bridge disconnected" });
      }
      this.pending.clear();
    });

    socket.on("error", (err) => {
      console.error(`[cet-mcp] Socket error: ${err.message}`);
    });
  }

  private processBuffer(): void {
    let idx: number;
    while ((idx = this.buffer.indexOf(DELIMITER)) !== -1) {
      const message = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + DELIMITER.length);

      if (!message) continue;

      try {
        const parsed = JSON.parse(message);

        // Heartbeat message
        if (parsed.type === "heartbeat") {
          this.lastHeartbeat = new Date();
          continue;
        }

        // Response to a pending request
        const response = parseResponse(message);
        const pending = this.pending.get(response.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(response.id);
          pending.resolve(response);
        }
      } catch (e) {
        console.error(`[cet-mcp] Failed to parse message: ${e}`);
      }
    }
  }

  async send(request: BridgeRequest): Promise<BridgeResponse> {
    await this.ready;

    if (!this.client || this.client.destroyed) {
      return {
        id: request.id,
        ok: false,
        error: "CET Bridge not connected. Is the game running with CETBridge and RedSocket loaded?",
      };
    }

    return new Promise<BridgeResponse>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.id);
        resolve({
          id: request.id,
          ok: false,
          error: `Bridge timeout: no response within ${TIMEOUT_MS}ms`,
        });
      }, TIMEOUT_MS);

      this.pending.set(request.id, { resolve, timer });

      const frame = JSON.stringify(request) + DELIMITER;
      this.client!.write(frame);
    });
  }

  async isConnected(): Promise<boolean> {
    return this.client !== null && !this.client.destroyed;
  }

  getLastHeartbeat(): Date | null {
    return this.lastHeartbeat;
  }

  dispose(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.resolve({ id, ok: false, error: "Server shutting down" });
    }
    this.pending.clear();

    if (this.client) {
      this.client.destroy();
      this.client = null;
    }

    this.server.close();
  }
}
