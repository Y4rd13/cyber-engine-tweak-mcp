import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerQuestTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "get_quest_fact",
    "Read a quest fact (internal progression flag). Quest facts track game state like completed objectives, dialogue choices, and story progression. Example: 'q001_rogue_met'.",
    {
      factName: z.string().describe("Quest fact name (e.g., 'q001_rogue_met')"),
    },
    async ({ factName }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "get_quest_fact",
          args: { factName },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "set_quest_fact",
    "Set a quest fact value. Use with caution — changing quest facts can break quest progression or unlock content. Value is typically 1 (true/done) or 0 (false/not done).",
    {
      factName: z.string().describe("Quest fact name"),
      value: z.number().describe("Fact value (typically 0 or 1)"),
    },
    async ({ factName, value }) => {
      try {
        const transport = getTransport();
        const request = createRequest("query", {
          handler: "set_quest_fact",
          args: { factName, value },
        });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
