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

  server.tool(
    "add_item",
    "Add an item to the player's inventory by TweakDB item ID. Example: 'Items.Preset_Katana_Saburo' for Satori katana. Quantity defaults to 1.",
    {
      itemId: z
        .string()
        .describe("TweakDB item ID (e.g., 'Items.Preset_Katana_Saburo')"),
      quantity: z.number().optional().default(1).describe("Number of items to add (default: 1)"),
    },
    async ({ itemId, quantity }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "add_item",
          args: { itemId, quantity },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "teleport",
    "Teleport the player to specific world coordinates. Use get_player_info first to see current position for reference.",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
    },
    async (args) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "teleport",
          args: { x: args.x, y: args.y, z: args.z },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
