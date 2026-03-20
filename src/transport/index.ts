import type { BridgeRequest, BridgeResponse } from "../utils/protocol.js";

export interface Transport {
  readonly name: string;
  send(request: BridgeRequest): Promise<BridgeResponse>;
  isConnected(): Promise<boolean>;
  getLastHeartbeat(): Date | null;
  dispose(): void;
}

export type TransportType = "file" | "tcp";

export async function createTransport(
  type: TransportType,
  bridgeDir: string
): Promise<Transport> {
  if (type === "file") {
    const { FileBridgeTransport } = await import("./file-bridge.js");
    return new FileBridgeTransport(bridgeDir);
  }
  if (type === "tcp") {
    const { TcpServerTransport } = await import("./tcp-server.js");
    const port = parseInt(process.env.CET_TCP_PORT ?? "27010", 10);
    try {
      const tcp = new TcpServerTransport(port);
      await tcp.waitReady();
      return tcp;
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "EADDRINUSE") {
        console.error(`[cet-mcp] TCP port ${port} in use, falling back to file transport`);
        const { FileBridgeTransport } = await import("./file-bridge.js");
        return new FileBridgeTransport(bridgeDir);
      }
      throw e;
    }
  }
  throw new Error(`Transport "${type}" not supported`);
}
