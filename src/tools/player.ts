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

  server.tool(
    "get_active_effects",
    "List all active status effects on the player. Shows effect IDs, remaining duration, and stack count.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "get_active_effects" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "toggle_god_mode",
    "Toggle invulnerability on/off for the player. Useful for testing combat mods without dying.",
    {
      enabled: z.boolean().describe("true to enable god mode, false to disable"),
    },
    async ({ enabled }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "toggle_god_mode",
          args: { enabled },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "set_level",
    "Set the player's level and/or street cred directly.",
    {
      level: z.number().optional().describe("Player level (1-60)"),
      streetCred: z.number().optional().describe("Street cred level (1-50)"),
    },
    async ({ level, streetCred }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "set_level",
          args: { level, streetCred },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_appearance_info",
    "Get the current visual appearance of the player or a target NPC (if scanned). Shows equipped appearance name and body customization state.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "get_appearance_info" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_vehicle_list",
    "List all vehicles owned by the player (garage). Shows vehicle names and TweakDB IDs.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "get_vehicle_list" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
