import { z } from "zod";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "../transport/index.js";

export function registerDevTools(
  server: McpServer,
  getTransport: () => Transport,
  bridgeDir: string
): void {
  server.tool(
    "get_connection_status",
    "Check bridge connectivity status. Reports whether the CET Bridge Mod is running and responsive. This tool works locally — it does not require the game to be running to check.",
    {},
    async () => {
      try {
        const transport = getTransport();
        const connected = await transport.isConnected();
        const heartbeat = transport.getLastHeartbeat();

        const status = {
          connected,
          transport: transport.name,
          bridgeDir,
          lastHeartbeat: heartbeat ? heartbeat.toISOString() : null,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error checking status: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "read_log",
    "Read the CET scripting.log file. This reads directly from disk — no bridge connection needed. Useful for debugging CET mods and seeing game console output.",
    {
      lines: z
        .number()
        .optional()
        .default(50)
        .describe("Number of lines to read from the end of the log (default: 50)"),
    },
    async ({ lines }) => {
      try {
        // CET log lives in the mods parent directory
        const cetRoot = dirname(dirname(bridgeDir));
        const logPath = join(cetRoot, "scripting.log");

        const content = await readFile(logPath, "utf-8");
        const allLines = content.split("\n");
        const tail = allLines.slice(-lines).join("\n");

        return {
          content: [{ type: "text" as const, text: tail || "(log is empty)" }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Cannot read log: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "list_mods",
    "List all installed CET mods by scanning the mods directory. Reads directly from disk — no bridge connection needed.",
    {},
    async () => {
      try {
        const modsDir = dirname(bridgeDir);
        const entries = await readdir(modsDir, { withFileTypes: true });
        const mods: string[] = [];

        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Check if it has init.lua (actual CET mod)
            try {
              await stat(join(modsDir, entry.name, "init.lua"));
              mods.push(entry.name);
            } catch {
              // Not a CET mod directory
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: mods.length > 0
                ? `Installed CET mods (${mods.length}):\n${mods.map((m) => `  - ${m}`).join("\n")}`
                : "No CET mods found",
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Cannot list mods: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
