import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerPlayerTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "set_stat",
    "Modify a player stat value. Common stats: Health, Stamina, Armor, Level, StreetCred. Use dump_type with 'gamedataStatType' to discover all available stats.",
    {
      stat: z.string().describe("Stat name (e.g., 'Health', 'Armor', 'Level')"),
      value: z.number().describe("New stat value"),
    },
    async ({ stat, value }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "set_stat",
          args: { stat, value },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "apply_status_effect",
    "Apply a status effect (buff/debuff) to the player. Examples: 'BaseStatusEffect.Berserk', 'BaseStatusEffect.Intoxicated'. Effects can be permanent or timed.",
    {
      effectId: z.string().describe("TweakDB status effect ID (e.g., 'BaseStatusEffect.Berserk')"),
    },
    async ({ effectId }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "apply_status_effect",
          args: { effectId },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "remove_status_effect",
    "Remove a status effect from the player by TweakDB ID.",
    {
      effectId: z.string().describe("TweakDB status effect ID to remove"),
    },
    async ({ effectId }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "remove_status_effect",
          args: { effectId },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
