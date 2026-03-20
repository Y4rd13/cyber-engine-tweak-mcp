import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerInventoryTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "get_inventory",
    "List items in the player's inventory. Returns item names, quantities, TweakDB IDs, and quality. Can filter by item type (Weapon, Clothing, Consumable, etc).",
    {
      type: z
        .string()
        .optional()
        .describe("Filter by item type: Weapon, Clothing, Consumable, Gadget, Cyberware, Mod, Crafting, Quest, Junk"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Max items to return (default: 50)"),
    },
    async ({ type, limit }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "get_inventory",
          args: { type, limit },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "remove_item",
    "Remove an item from the player's inventory by TweakDB item ID. Removes specified quantity (default: all).",
    {
      itemId: z.string().describe("TweakDB item ID (e.g., 'Items.Preset_Katana_Saburo')"),
      quantity: z
        .number()
        .optional()
        .describe("Number to remove (default: remove all of that item)"),
    },
    async ({ itemId, quantity }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "remove_item",
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
    "get_equipped",
    "Get the player's currently equipped items: weapons in slots, clothing, cyberware, and active quickslot items.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "get_equipped" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
