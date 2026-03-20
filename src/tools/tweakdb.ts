import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerTweakDBTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "get_tweakdb_value",
    "Read a TweakDB flat or record by path. TweakDB is Cyberpunk's game data database containing items, stats, vehicles, NPCs, etc. Example paths: 'Items.Preset_Katana_Saburo', 'BaseStats.Health'.",
    {
      path: z
        .string()
        .describe("TweakDB record/flat path (e.g., 'Items.Preset_Katana_Saburo')"),
    },
    async ({ path }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "tweakdb_get",
          args: { path },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "set_tweakdb_value",
    "Write a TweakDB flat value. Changes persist until the game is restarted. Use with caution — wrong values can crash the game. Only works on flat values, not records.",
    {
      path: z.string().describe("TweakDB flat path to set"),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .describe("Value to set (string, number, or boolean)"),
      type: z
        .enum(["Int", "Float", "Bool", "String", "CName"])
        .optional()
        .describe("Value type hint for the engine (auto-detected if omitted)"),
    },
    async ({ path, value, type }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "tweakdb_set",
          args: { path, value, type },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "dump_type",
    "Introspect a game RTTI type, showing its methods, properties, and inheritance. Useful for discovering available APIs on game classes like 'PlayerPuppet', 'vehicleBaseObject', etc.",
    {
      typeName: z
        .string()
        .describe("Game type name to introspect (e.g., 'PlayerPuppet', 'gameItemData')"),
    },
    async ({ typeName }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "dump_type",
          args: { typeName },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "search_tweakdb",
    "Search TweakDB records by pattern. Returns matching record paths. Useful for finding item IDs, stat paths, etc. Example: search for 'Katana' to find all katana-related records.",
    {
      pattern: z.string().describe("Search pattern (case-insensitive substring match)"),
      type: z
        .string()
        .optional()
        .describe("Filter by record type (e.g., 'gamedataItem_Record')"),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Max results to return (default: 20)"),
    },
    async ({ pattern, type, limit }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "search_tweakdb",
          args: { pattern, type, limit },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
