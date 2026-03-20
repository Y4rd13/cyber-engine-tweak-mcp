# CET MCP — Cyberpunk 2077 AI Bridge

MCP server that connects Claude Code to Cyber Engine Tweaks (CET) in Cyberpunk 2077. Execute Lua code, query game state, manipulate TweakDB, and observe game events — all from your terminal while the game is running.

## How it works

```
Claude Code → stdio/JSON-RPC → MCP Server → TCP (RedSocket) → CET Bridge Mod → Game Engine
```

The MCP server runs as a Claude Code subprocess. It opens a TCP server on `localhost:27010`. The CET Bridge Mod (Lua) connects to it via [RedSocket](https://github.com/rayshader/cp2077-red-socket) and executes commands in the game's Lua VM. Falls back to file-based IPC if RedSocket is not installed.

## Requirements

- **Node.js** >= 18
- **Cyberpunk 2077** with [Cyber Engine Tweaks](https://github.com/maximegmd/CyberEngineTweaks) >= 1.32
- **[RED4ext](https://github.com/WopsS/RED4ext)** >= 1.25
- **[RedSocket](https://github.com/rayshader/cp2077-red-socket)** (recommended — enables TCP transport, ~1ms latency vs ~16-33ms with file IPC)

## Setup

```bash
# 1. Clone and build
git clone https://github.com/y4rd13/cyber-engine-tweak-mcp.git
cd cyber-engine-tweak-mcp
npm install
npm run build

# 2. Copy CET mod to game directory
cp -r cet-mod/CETBridge "/path/to/Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/CETBridge"

# 3. Claude Code picks up .mcp.json automatically when you open this project
# Edit .mcp.json if your game path differs from the default
```

## Tools (16)

### Execution
| Tool | Description |
|------|-------------|
| `execute_lua` | Run Lua code in the CET console |
| `evaluate_expression` | Evaluate a Lua expression and return the result |
| `batch_execute` | Execute multiple Lua statements in one round-trip |

### Game State
| Tool | Description |
|------|-------------|
| `get_player_info` | Player level, health, street cred, position |
| `get_game_state` | In-game time, scene tier, weather, zone type |
| `add_item` | Add item to inventory by TweakDB ID |
| `teleport` | Teleport player to world coordinates |

### TweakDB
| Tool | Description |
|------|-------------|
| `get_tweakdb_value` | Read a TweakDB flat or record |
| `set_tweakdb_value` | Write a TweakDB flat value |
| `search_tweakdb` | Search TweakDB records by pattern |
| `dump_type` | Introspect a game RTTI type (methods, properties) |

### Observation
| Tool | Description |
|------|-------------|
| `observe_events` | Subscribe to game events via CET Observe |
| `get_observations` | Read buffered event observations |

### Dev Tools
| Tool | Description |
|------|-------------|
| `get_connection_status` | Check bridge connectivity (works without game) |
| `read_log` | Read CET scripting.log |
| `list_mods` | List installed CET mods |

## Configuration

`.mcp.json` in the project root configures Claude Code:

```json
{
  "mcpServers": {
    "cet-bridge": {
      "command": "node",
      "args": ["build/index.js"],
      "env": {
        "CET_BRIDGE_DIR": "/path/to/cyber_engine_tweaks/mods/CETBridge",
        "CET_TRANSPORT": "tcp"
      }
    }
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `CET_BRIDGE_DIR` | (see .mcp.json) | Path to CETBridge mod directory |
| `CET_TRANSPORT` | `tcp` | Transport: `tcp` (RedSocket) or `file` (fallback) |
| `CET_TCP_PORT` | `27010` | TCP server port |

CET mod config in `cet-mod/CETBridge/config.lua`:

```lua
local config = {
    transport = "tcp",      -- "tcp" or "file"
    tcp_host = "127.0.0.1",
    tcp_port = 27010,
}
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed diagrams.

| Component | Language | Role |
|-----------|----------|------|
| MCP Server | TypeScript | stdio transport for Claude Code, TCP server for game bridge |
| CET Bridge Mod | Lua | Runs in-game, dispatches commands to CET Lua VM |

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm run inspect  # Test with MCP Inspector
```

After changing Lua files, copy them to the game directory:
```bash
cp cet-mod/CETBridge/*.lua "/path/to/cyber_engine_tweaks/mods/CETBridge/"
```

## Safety

- TCP binds to `localhost` only — no network exposure
- All user code runs in `pcall()` — errors are caught, never crash the game
- This is a **development tool** — not intended for multiplayer or production use
- Infinite loops in executed Lua **will freeze the game** (no mitigation possible without native code)

## License

MIT
