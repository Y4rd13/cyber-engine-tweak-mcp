# CET MCP — Cyberpunk 2077 AI Bridge

MCP server that connects Claude Code to Cyber Engine Tweaks (CET) in Cyberpunk 2077. Execute Lua code, query game state, manipulate TweakDB, manage inventory, and observe game events — all from your terminal while the game is running.

## How it works

```
Claude Code → stdio/JSON-RPC → MCP Server → TCP (RedSocket) → CET Bridge Mod → Game Engine
```

The MCP server runs as a Claude Code subprocess. It opens a TCP server on `localhost:27010`. The CET Bridge Mod (Lua) connects to it via [RedSocket](https://github.com/rayshader/cp2077-red-socket) and executes commands in the game's Lua VM. Falls back to file-based IPC automatically if RedSocket is not installed or if the TCP port is already in use (multiple sessions supported).

Pairs with [WolvenKit MCP](https://github.com/Y4rd13/wolvenkit-mcp) for a complete AI-assisted modding pipeline.

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

# 3. Add to Claude Code globally
claude mcp add cet-bridge -s user \
  -e "CET_BRIDGE_DIR=/path/to/cyber_engine_tweaks/mods/CETBridge" \
  -e "CET_TRANSPORT=tcp" \
  -- node /path/to/cyber-engine-tweak-mcp/build/index.js
```

## Tools (37)

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
| `set_time` | Change in-game time of day |
| `set_weather` | Change weather (Sunny, Rain, Fog, Sandstorm, etc.) |

### Inventory
| Tool | Description |
|------|-------------|
| `get_inventory` | List player inventory with type filtering |
| `remove_item` | Remove items from inventory |
| `get_equipped` | Show currently equipped weapons, clothing, cyberware |

### Player
| Tool | Description |
|------|-------------|
| `set_stat` | Modify player stats (Health, Armor, Level, etc.) |
| `apply_status_effect` | Apply buffs/debuffs to the player |
| `remove_status_effect` | Remove status effects |
| `get_active_effects` | List all active status effects on the player |
| `toggle_god_mode` | Toggle invulnerability on/off |
| `set_level` | Set player level and/or street cred directly |
| `get_appearance_info` | Get player's current visual appearance |
| `get_vehicle_list` | List all vehicles in the player's garage |

### World
| Tool | Description |
|------|-------------|
| `spawn_vehicle` | Spawn a vehicle near the player |
| `get_nearby_entities` | Scan for nearby NPCs, vehicles, items |
| `kill_nearby_npcs` | Kill hostile (or all) NPCs in radius |
| `show_notification` | Show in-game UI notification |
| `play_sound` | Play a sound event in-game |
| `get_scanner_info` | Get info about the entity you're looking at |

### Quest
| Tool | Description |
|------|-------------|
| `get_quest_fact` | Read a quest progression flag |
| `set_quest_fact` | Set a quest progression flag |

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
| `get_connection_status` | Check bridge connectivity and transport type |
| `read_log` | Read CET scripting.log |
| `list_mods` | List installed CET mods |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CET_BRIDGE_DIR` | (see .mcp.json) | Path to CETBridge mod directory |
| `CET_TRANSPORT` | `tcp` | Transport: `tcp` (RedSocket) or `file` (fallback) |
| `CET_TCP_PORT` | `27010` | TCP server port |

## Multi-Session Support

Multiple Claude Code sessions can use `cet-bridge` simultaneously:
- **First session**: binds TCP port 27010 (fast, ~1ms)
- **Additional sessions**: automatically fall back to file-based IPC (~16-33ms)
- No session crashes — the fallback is seamless

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
