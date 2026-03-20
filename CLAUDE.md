# CET MCP — Project Rules

## Project Overview

MCP (Model Context Protocol) server that bridges Claude Code with Cyber Engine Tweaks (CET) in Cyberpunk 2077. Enables real-time Lua command execution, game state queries, and TweakDB manipulation from Claude Code while the game is running.

## Architecture

Two components:

1. **MCP Server** (TypeScript/Node.js) — stdio transport for Claude Code, TCP client for game bridge
2. **CET Bridge Mod** (Lua) — runs inside the game, dispatches commands to CET's Lua VM

Communication: MCP Server ↔ TCP (RedSocket) ↔ CET Bridge Mod ↔ Game Engine

Fallback: file-based IPC when RedSocket is not installed.

See [docs/architecture.md](docs/architecture.md) for diagrams and detailed design.

## Tech Stack

- **MCP Server:** TypeScript, Node.js >= 18, `@modelcontextprotocol/sdk`, Zod
- **CET Mod:** Lua 5.4 (CET environment), json.lua (bundled)
- **Transport:** TCP via RedSocket (primary), file-based IPC (fallback)
- **Build:** `tsc` for TypeScript compilation
- **Package Manager:** npm

## Key Paths

- **MCP Server source:** `src/`
- **CET Bridge Mod:** `cet-mod/CETBridge/`
- **Documentation:** `docs/`
- **Architecture diagrams:** `docs/svg/`
- **Reference mod:** `/mnt/g/Documentos/Projects/david-sandevistan/`
- **Game CET mods:** `/mnt/g/SteamLibrary/steamapps/common/Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/`

## Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run inspect      # Test with MCP Inspector
```

## Code Conventions

- TypeScript strict mode
- Zod for all MCP tool input schemas
- Error results always include `ok: false` with descriptive `error` field
- Lua code: CET style (no semicolons, local variables, pcall for safety)
- JSON protocol messages are `\r\n` delimited (RedSocket requirement)
- All tool handlers must be async and return `{ content: [{type: "text", text: "..."}] }`

## Important Rules

- **Never write to stdout** in the MCP server — it corrupts the JSON-RPC stdio transport. Use `console.error()` or stderr for logging.
- **Always use pcall()** in the CET mod when executing user-provided Lua code.
- **TCP binds to localhost only** — never expose to network interfaces.
- **RedSocket uses `\r\n`** as internal delimiter — never include bare `\r\n` in command payloads. Escape or encode them.
- **CET file I/O is sandboxed** to the mod directory — file-based IPC files must live in `cet-mod/CETBridge/`.
- **The CET Lua VM runs on the game's main thread** — blocking operations freeze the game. Keep command execution fast.

## Testing

- Use `npx @modelcontextprotocol/inspector` to test MCP tools without Claude Code
- Test CET mod in-game via CET console
- The game must be running with CET loaded for end-to-end testing

## Related Projects

- [david-sandevistan](/mnt/g/Documentos/Projects/david-sandevistan/) — Complex CET mod demonstrating all CET APIs (Observers, ImGui, TweakDB, file I/O, timers)
- [RedSocket](https://github.com/rayshader/cp2077-red-socket) — TCP socket RED4ext plugin
- [CET Wiki](https://wiki.redmodding.org/cyber-engine-tweaks) — Official CET documentation
- [NativeDB](https://nativedb.red4ext.com) — Game RTTI type browser
