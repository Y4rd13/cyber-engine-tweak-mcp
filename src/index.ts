import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import type { TransportType } from "./transport/index.js";

const bridgeDir =
  process.env.CET_BRIDGE_DIR ??
  "/mnt/g/SteamLibrary/steamapps/common/Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/CETBridge";

const transportType = (process.env.CET_TRANSPORT ?? "file") as TransportType;

console.error(`[cet-mcp] Starting with transport=${transportType}`);
console.error(`[cet-mcp] Bridge dir: ${bridgeDir}`);

const server = await createServer({ bridgeDir, transportType });
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[cet-mcp] Server running on stdio");
