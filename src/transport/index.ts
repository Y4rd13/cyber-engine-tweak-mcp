import type { BridgeRequest, BridgeResponse } from "../utils/protocol.js";

export interface Transport {
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
  throw new Error(`Transport "${type}" not yet implemented`);
}
