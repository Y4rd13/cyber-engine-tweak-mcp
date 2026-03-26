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

  server.tool(
    "kill_nearby_npcs",
    "Kill all hostile NPCs within a radius. Useful for clearing combat encounters during testing. Only affects NPCs currently in combat with the player.",
    {
      radius: z
        .number()
        .optional()
        .default(30)
        .describe("Kill radius in meters (default: 30)"),
      allNpcs: z
        .boolean()
        .optional()
        .default(false)
        .describe("Kill ALL NPCs, not just hostiles (default: false, hostiles only)"),
    },
    async ({ radius, allNpcs }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "kill_nearby_npcs",
          args: { radius, allNpcs },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "show_notification",
    "Show an in-game UI notification/warning message to the player. Useful for testing UI or signaling events.",
    {
      message: z.string().describe("Message text to display"),
    },
    async ({ message }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "show_notification",
          args: { message },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "play_sound",
    "Play a sound event in-game. Example events: 'ui_menu_hover', 'ui_menu_click', 'w_gun_reload'. Use search_tweakdb with pattern 'sound' to discover sound event names.",
    {
      soundEvent: z.string().describe("Sound event name (e.g., 'ui_menu_hover')"),
    },
    async ({ soundEvent }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "play_sound",
          args: { soundEvent },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_scanner_info",
    "Get detailed info about the entity the player is currently looking at (as if scanning). Returns entity type, name, health, level, faction, and more.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const request = createRequest("query", { handler: "get_scanner_info" });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
