import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "./transport/index.js";
import { createTransport } from "./transport/index.js";
import type { TransportType } from "./transport/index.js";
import { registerExecutionTools } from "./tools/execution.js";
import { registerGameStateTools } from "./tools/game-state.js";
import { registerDevTools } from "./tools/dev-tools.js";
import { registerTweakDBTools } from "./tools/tweakdb.js";

export interface ServerConfig {
  bridgeDir: string;
  transportType: TransportType;
}

export async function createServer(config: ServerConfig): Promise<McpServer> {
  const server = new McpServer({
    name: "cet-bridge",
    version: "0.1.0",
  });

  const transport = await createTransport(config.transportType, config.bridgeDir);

  // Cleanup on process exit
  process.on("exit", () => transport.dispose());
  process.on("SIGINT", () => {
    transport.dispose();
    process.exit(0);
  });

  const getTransport = () => transport;

  registerExecutionTools(server, getTransport);
  registerGameStateTools(server, getTransport);
  registerDevTools(server, getTransport, config.bridgeDir);
  registerTweakDBTools(server, getTransport);

  return server;
}
