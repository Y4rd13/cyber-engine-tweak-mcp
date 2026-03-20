import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerGameStateTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "get_player_info",
    "Get current player information: level, street cred, health, stamina, position coordinates, and current equipped weapon. Requires the player to be spawned in-game.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "player_info" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_game_state",
    "Get current game state: in-game time, scene tier (gameplay/menu/cutscene), weather, and player zone type (safe/combat/restricted). Works from any game screen.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "game_state" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
