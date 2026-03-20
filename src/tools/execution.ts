import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";
import { createRequest } from "../utils/protocol.js";
import { formatToolResult, formatError } from "../utils/serializer.js";

export function registerExecutionTools(
  server: McpServer,
  getTransport: () => Transport
): void {
  server.tool(
    "execute_lua",
    "Execute Lua code in the CET console. The code runs in the game's Lua VM via loadstring(). Use for side effects (spawning entities, changing state, etc). Output from print() is captured and returned.",
    { code: z.string().describe("Lua code to execute in the CET console") },
    async ({ code }) => {
      try {
        const transport = getTransport();
        const request = createRequest("exec", { code });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.tool(
    "evaluate_expression",
    "Evaluate a Lua expression and return its result as a string. Unlike execute_lua, this returns the value of the expression. Use for reading game state (e.g., 'Game.GetPlayer():GetLevel()').",
    {
      expression: z
        .string()
        .describe("Lua expression to evaluate (e.g., 'Game.GetPlayer():GetLevel()')"),
    },
    async ({ expression }) => {
      try {
        const transport = getTransport();
        const request = createRequest("eval", { expr: expression });
        const response = await transport.send(request);
        return formatToolResult(response);
      } catch (e) {
        return formatError(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
