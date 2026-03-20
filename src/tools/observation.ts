import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerObservationTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "observe_events",
    "Subscribe to a game event via CET's Observe/ObserveAfter. Events are buffered in-game and can be retrieved with get_observations. Example: observe 'PlayerPuppet' / 'OnDamageReceived' to watch damage events.",
    {
      className: z.string().describe("Game class name (e.g., 'PlayerPuppet')"),
      eventName: z.string().describe("Event/method name (e.g., 'OnDamageReceived')"),
      maxBuffer: z
        .number()
        .optional()
        .default(50)
        .describe("Max events to buffer before dropping oldest (default: 50)"),
    },
    async ({ className, eventName, maxBuffer }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "observe_events",
          args: { className, eventName, maxBuffer },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "get_observations",
    "Read buffered event observations from a subscription created by observe_events. Returns and clears the buffer.",
    {
      subscriptionId: z.string().describe("Subscription ID returned by observe_events"),
    },
    async ({ subscriptionId }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "get_observations",
          args: { subscriptionId },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
