import { readFile, writeFile, rename, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Transport } from "./index.js";
import type { BridgeRequest, BridgeResponse } from "../utils/protocol.js";
import { parseResponse } from "../utils/protocol.js";

const COMMAND_FILE = "command.json";
const COMMAND_TMP = "command.json.tmp";
const RESPONSE_FILE = "response.json";
const HEARTBEAT_FILE = "heartbeat.json";
const POLL_INTERVAL_MS = 50;
const TIMEOUT_MS = 5000;

export class FileBridgeTransport implements Transport {
  readonly name = "file";
  private bridgeDir: string;
  private lastHeartbeat: Date | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(bridgeDir: string) {
    this.bridgeDir = bridgeDir;
    this.startHeartbeatMonitor();
  }

  async send(request: BridgeRequest): Promise<BridgeResponse> {
    const cmdPath = join(this.bridgeDir, COMMAND_FILE);
    const tmpPath = join(this.bridgeDir, COMMAND_TMP);
    const resPath = join(this.bridgeDir, RESPONSE_FILE);

    // Clean stale response file
    await this.safeUnlink(resPath);

    // Atomic write: write to .tmp then rename
    await writeFile(tmpPath, JSON.stringify(request), "utf-8");
    await rename(tmpPath, cmdPath);

    // Poll for response
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const data = await readFile(resPath, "utf-8");
        await this.safeUnlink(resPath);
        const response = parseResponse(data);
        if (response.id === request.id) {
          return response;
        }
        // Stale response from a different request — keep polling
      } catch {
        // File doesn't exist yet — keep polling
      }
      await this.sleep(POLL_INTERVAL_MS);
    }

    // Timeout — clean up the command file if still there
    await this.safeUnlink(cmdPath);
    return {
      id: request.id,
      ok: false,
      error: `Bridge timeout: no response within ${TIMEOUT_MS}ms. Is the game running with CETBridge loaded?`,
    };
  }

  async isConnected(): Promise<boolean> {
    if (!this.lastHeartbeat) return false;
    const age = Date.now() - this.lastHeartbeat.getTime();
    return age < 3000; // Heartbeat expected every ~1s, stale after 3s
  }

  getLastHeartbeat(): Date | null {
    return this.lastHeartbeat;
  }

  dispose(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const hbPath = join(this.bridgeDir, HEARTBEAT_FILE);
        const data = await readFile(hbPath, "utf-8");
        const parsed = JSON.parse(data);
        if (parsed.timestamp) {
          this.lastHeartbeat = new Date(parsed.timestamp);
        }
      } catch {
        // Heartbeat file missing — game not running or mod not loaded
      }
    }, 1000);
  }

  private async safeUnlink(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch {
      // File doesn't exist — fine
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
