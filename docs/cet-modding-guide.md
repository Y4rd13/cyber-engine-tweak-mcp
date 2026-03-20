# CET Modding Reference Guide

A technical reference for Cyber Engine Tweaks (CET) modding in Cyberpunk 2077, focused on the APIs and patterns relevant to the CET MCP Bridge.

## CET Architecture

CET is a C++ framework that hooks into REDengine 4 via DLL injection. It creates a **Lua 5.4 VM** bound to the game's RTTI (Run-Time Type Information) system through **sol2/sol3**, exposing every game class, function, and property to Lua scripts.

```
Cyberpunk 2077 Process
├── REDengine 4 (Game Engine)
│   └── RTTI System (all game types)
├── RED4ext (Native Plugin Loader)
│   ├── RedSocket (TCP sockets)
│   ├── RedHttpClient (HTTPS client)
│   └── Other plugins...
└── Cyber Engine Tweaks
    ├── Lua VM (sol2 bindings to RTTI)
    ├── ImGui Overlay (Console + Mod UIs)
    └── Mods/
        ├── ModA/init.lua
        ├── ModB/init.lua
        └── CETBridge/init.lua  ← our mod
```

## Mod Structure

Every CET mod lives in:
```
<game>/bin/x64/plugins/cyber_engine_tweaks/mods/<ModName>/init.lua
```

CET discovers mods by scanning for directories containing `init.lua`. Additional Lua files are loaded via `require()`.

## Mod Lifecycle Events

![CET Mod Lifecycle](svg/cet-mod-lifecycle.svg)

### Registration (Root Level of init.lua)

These must be called at the root scope, not inside callbacks:

```lua
registerForEvent("onInit", callback)      -- Game API ready
registerForEvent("onUpdate", callback)    -- Every frame (deltaTime arg)
registerForEvent("onDraw", callback)      -- ImGui rendering
registerForEvent("onOverlayOpen", cb)     -- CET overlay opened
registerForEvent("onOverlayClose", cb)    -- CET overlay closed
registerForEvent("onShutdown", callback)  -- Mod unloading
registerForEvent("onTweak", callback)     -- Pre-TweakDB freeze

registerHotkey("id", "Label", callback)   -- User-assignable hotkey
registerInput("id", "Label", callback)    -- Press/release input
```

### Event Order

1. **Root-level code** executes first (file load)
2. **onTweak** — TweakDB modifications (before freeze)
3. **onInit** — Game fully loaded, RTTI available, Observers registered
4. **onUpdate(dt)** — Every frame (~60fps = every ~16ms)
5. **onDraw** — Every frame when overlay is visible (ImGui calls here)
6. **onShutdown** — Cleanup on game exit or mod reload

## Core APIs

### Game Namespace

```lua
-- Player
local player = Game.GetPlayer()
player:GetDisplayName()
player:SetLevel(50)

-- Singletons
Game.GetTargetingSystem()
Game.GetTransactionSystem()
Game.GetScriptableSystemsContainer()
Game.GetSettingsSystem()

-- Utilities
Game.AddToInventory("Items.Preset_Katana_Saburo", 1)
Game.GetTimeSystem()
GetSingleton("gameTimeSystem")
```

### TweakDB

```lua
-- Read
TweakDB:GetFlat("Items.Preset_Katana_Saburo.cost")
TweakDB:GetRecord("Items.Preset_Katana_Saburo")
TweakDB:GetRecords("gamedataWeapon_Record")

-- Write
TweakDB:SetFlat("Items.Preset_Katana_Saburo.cost", 1000)
TweakDB:SetFlatNoUpdate("path", value)  -- faster, no record update

-- Create/Clone
TweakDB:CloneRecord("Items.MyCustomWeapon", "Items.Preset_Katana_Saburo")
TweakDB:CreateRecord("Items.NewItem", "gamedataItem_Record")
TweakDB:DeleteRecord("Items.NewItem")
```

### Observers / Overrides

```lua
-- Watch a function call (non-destructive)
Observe("PlayerPuppet", "OnAction", function(self, action)
    print("Action: " .. action:GetName())
end)

-- Watch after execution
ObserveAfter("PlayerPuppet", "OnGameAttached", function(self)
    print("Player attached!")
end)

-- Replace a function entirely
Override("PlayerPuppet", "OnAction", function(self, action, wrappedMethod)
    -- Custom logic
    wrappedMethod(action)  -- Call original
end)
```

### GameOptions

```lua
GameOptions.Get("Developer/Logging", "Enabled")
GameOptions.SetBool("Developer/Logging", "Enabled", true)
GameOptions.Toggle("Developer/Logging", "Enabled")
```

### Type Introspection

```lua
DumpType("PlayerPuppet")     -- Prints all methods/properties
Dump(someObject)             -- Dump object state
GameDump(someObject)         -- Detailed dump
NewObject("Vector4")         -- Create instance
```

### Inter-Mod Communication

```lua
local otherMod = GetMod("OtherModName")
if otherMod then
    otherMod.SomePublicFunction()
end
```

## File I/O

CET's Lua environment provides standard `io` library, sandboxed to the mod's directory:

```lua
-- Read
local f = io.open("data/config.json", "r")
if f then
    local content = f:read("*a")
    f:close()
end

-- Write
local f = io.open("data/output.json", "w")
f:write(jsonString)
f:close()
```

**Sandbox:** In newer CET versions, `io.open` paths are relative to the mod directory. Absolute paths may be blocked.

## Logging

```lua
-- Console + scripting.log
print("message")

-- Structured per-mod logging
spdlog.info("Info message")
spdlog.warning("Warning message")
spdlog.error("Error message")
```

**Log locations:**
- Global: `<cet>/scripting.log`
- Per-mod: `<cet>/mods/<ModName>/<ModName>.log`

## Dynamic Code Execution

```lua
-- loadstring (execute arbitrary code)
local fn, err = loadstring("return Game.GetPlayer():GetLevel()")
if fn then
    local ok, result = pcall(fn)
end

-- dofile (execute a file)
dofile("scripts/setup.lua")  -- sandboxed to mod directory
```

## JSON Handling

CET does not include a built-in JSON library. Common approach: bundle a pure-Lua JSON encoder/decoder like `json.lua` (rxi/json.lua) or `dkjson`.

```lua
local json = require("json")  -- bundled json.lua

local encoded = json.encode({level = 50, health = 100})
local decoded = json.decode(jsonString)
```

## RedSocket API (TCP)

Requires [RedSocket](https://github.com/rayshader/cp2077-red-socket) RED4ext plugin.

```lua
registerForEvent("onInit", function()
    local socket = GetMod("RedSocket")
    if not socket then
        print("[CETBridge] RedSocket not found, using file fallback")
        return
    end

    -- Create TCP server on port
    socket.Socket.Create(27010)

    -- Handle incoming commands
    socket.Socket.OnCommand = function(clientId, data)
        -- data is the received string
        local command = json.decode(data)
        local result = executeCommand(command)
        socket.Socket.SendCommand(clientId, json.encode(result))
    end

    -- Connection events
    socket.Socket.OnConnection = function(clientId)
        print("[CETBridge] Client connected: " .. clientId)
    end

    socket.Socket.OnDisconnection = function(clientId)
        print("[CETBridge] Client disconnected: " .. clientId)
    end

    socket.Socket.OnError = function(clientId, error)
        print("[CETBridge] Socket error: " .. error)
    end
end)

registerForEvent("onShutdown", function()
    local socket = GetMod("RedSocket")
    if socket then
        socket.Socket.Destroy()
    end
end)
```

**Important:** RedSocket uses `\r\n` as internal delimiter. Commands can be any length.

## Key Paths

| Path | Content |
|------|---------|
| `<game>/bin/x64/plugins/cyber_engine_tweaks/` | CET installation |
| `<game>/bin/x64/plugins/cyber_engine_tweaks/mods/` | CET mods directory |
| `<game>/bin/x64/plugins/cyber_engine_tweaks/scripting.log` | Global CET log |
| `<game>/red4ext/plugins/` | RED4ext plugins (RedSocket, etc.) |
| `<game>/r6/scripts/` | Redscript files |
| `<game>/r6/tweaks/` | TweakXL YAML files |
| `<game>/archive/pc/mod/` | Mod archive files |

## Useful Console Commands

```lua
-- Player info
print(Game.GetPlayer():GetDisplayName())
print(Game.GetPlayer():GetEntityID().hash)

-- Position
local pos = Game.GetPlayer():GetWorldPosition()
print(pos.x, pos.y, pos.z)

-- Teleport
Game.GetTeleportationFacility():Teleport(Game.GetPlayer(), Vector4.new(x, y, z, 1), EulerAngles.new(0, 0, 0))

-- Time
local time = Game.GetTimeSystem():GetGameTime()
print(GameTime.Hours(time) .. ":" .. GameTime.Minutes(time))

-- Weather
Game.GetWeatherSystem():SetWeather("24h_weather_sunny", 0, 0)

-- Items
Game.AddToInventory("Items.Preset_Katana_Saburo", 1)

-- Stats
Game.GetStatsSystem():GetStatValue(Game.GetPlayer():GetEntityID(), "Level")
```
