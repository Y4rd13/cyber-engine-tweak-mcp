import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerWorldTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "spawn_vehicle",
    "Spawn a vehicle near the player. Examples: 'Vehicle.v_sport2_quadra_type66', 'Vehicle.v_sport1_rayfield_caliburn'. Use search_tweakdb with pattern 'Vehicle.' to find vehicle IDs.",
    {
      vehicleId: z.string().describe("TweakDB vehicle record ID (e.g., 'Vehicle.v_sport2_quadra_type66')"),
      distance: z
        .number()
        .optional()
        .default(5)
        .describe("Distance in meters in front of the player to spawn (default: 5)"),
    },
    async ({ vehicleId, distance }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "spawn_vehicle",
          args: { vehicleId, distance },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_nearby_entities",
    "Scan for entities near the player within a given radius. Returns entity names, types, distances, and positions. Useful for finding NPCs, vehicles, items in the world.",
    {
      radius: z
        .number()
        .optional()
        .default(20)
        .describe("Search radius in meters (default: 20)"),
      type: z
        .string()
        .optional()
        .describe("Filter by entity type: NPC, Vehicle, Item, Device (default: all)"),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Max entities to return (default: 20)"),
    },
    async ({ radius, type, limit }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "get_nearby_entities",
          args: { radius, type, limit },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "set_time",
    "Set the in-game time of day. Useful for testing lighting, NPC schedules, or triggering time-dependent events.",
    {
      hours: z.number().min(0).max(23).describe("Hour (0-23)"),
      minutes: z.number().min(0).max(59).optional().default(0).describe("Minutes (0-59, default: 0)"),
      seconds: z.number().min(0).max(59).optional().default(0).describe("Seconds (0-59, default: 0)"),
    },
    async ({ hours, minutes, seconds }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "set_time",
          args: { hours, minutes, seconds },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "set_weather",
    "Change the in-game weather. Available presets: Sunny, Cloudy, Rain, HeavyRain, Fog, Toxic, Sandstorm, Pollution. Changes take effect gradually.",
    {
      weather: z.string().describe("Weather preset name (e.g., 'Rain', 'Sunny', 'Fog', 'Sandstorm')"),
    },
    async ({ weather }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "set_weather",
          args: { weather },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
