import type { Transport } from "./index.js";
import type { BridgeRequest, BridgeResponse } from "../utils/protocol.js";

// Phase 3 stub — TCP server transport for RedSocket connections
export class TcpServerTransport implements Transport {
  async send(_request: BridgeRequest): Promise<BridgeResponse> {
    return {
      id: _request.id,
      ok: false,
      error: "TCP transport not yet implemented (Phase 3)",
    };
  }

  async isConnected(): Promise<boolean> {
    return false;
  }

  getLastHeartbeat(): Date | null {
    return null;
  }

  dispose(): void {
    // No-op
  }
}
