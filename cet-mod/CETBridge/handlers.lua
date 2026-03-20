local serializer = require("serializer")

local handlers = {}

function handlers.player_info()
    local player = Game.GetPlayer()
    if not player then
        return nil, "Player not available (not in game or loading)"
    end

    local statsSystem = Game.GetStatsSystem()
    local playerID = player:GetEntityID()

    local level = statsSystem:GetStatValue(playerID, gamedataStatType.Level)
    local streetCred = statsSystem:GetStatValue(playerID, gamedataStatType.StreetCred)

    local health = 0
    local maxHealth = 0
    local ok, err = pcall(function()
        local statPoolSystem = Game.GetStatPoolsSystem()
        health = statPoolSystem:GetStatPoolValue(playerID, gamedataStatPoolType.Health)
        maxHealth = statsSystem:GetStatValue(playerID, gamedataStatType.Health)
    end)

    local pos = player:GetWorldPosition()
    local posData = nil
    if pos then
        local pok, _ = pcall(function()
            posData = {x = pos.x, y = pos.y, z = pos.z}
        end)
    end

    local info = {
        level = math.floor(level),
        streetCred = math.floor(streetCred),
        health = math.floor(health),
        maxHealth = math.floor(maxHealth),
        position = posData
    }

    return info
end

function handlers.game_state()
    local timeSystem = Game.GetTimeSystem()
    local gameTime = timeSystem:GetGameTime()

    local hours = GameTime.Hours(gameTime)
    local minutes = GameTime.Minutes(gameTime)

    local sceneTier = "unknown"
    local ok1, _ = pcall(function()
        local player = Game.GetPlayer()
        if player then
            local blackboard = Game.GetBlackboardSystem():GetLocalInstanced(player:GetEntityID(), GetAllBlackboardDefs().PlayerStateMachine)
            if blackboard then
                local tier = blackboard:GetInt(GetAllBlackboardDefs().PlayerStateMachine.SceneTier)
                local tierMap = {
                    [0] = "Tier1_FullGameplay",
                    [1] = "Tier2_StagedGameplay",
                    [2] = "Tier3_LimitedGameplay",
                    [3] = "Tier4_FPPCinematic",
                    [4] = "Tier5_Cinematic"
                }
                sceneTier = tierMap[tier] or ("Tier" .. tostring(tier))
            end
        end
    end)

    local weather = "unknown"
    local ok2, _ = pcall(function()
        local weatherSystem = Game.GetWeatherSystem()
        if weatherSystem then
            weather = NameToString(weatherSystem:GetWeatherState())
        end
    end)

    local zoneType = "unknown"
    local ok3, _ = pcall(function()
        local player = Game.GetPlayer()
        if player then
            local preventionSystem = Game.GetPreventionSystem()
            if preventionSystem then
                local zone = preventionSystem:GetCurrentSecurityZoneType(player)
                zoneType = tostring(zone)
            end
        end
    end)

    local state = {
        time = string.format("%02d:%02d", hours, minutes),
        sceneTier = sceneTier,
        weather = weather,
        zoneType = zoneType
    }

    return state
end

function handlers.tweakdb_get(args)
    if not args or not args.path then
        return nil, "No TweakDB path provided"
    end

    local path = args.path
    local tdbid = TweakDBID.new(path)

    -- Try as flat first
    local ok, flat = pcall(TweakDB.GetFlat, TweakDB, tdbid)
    if ok and flat ~= nil then
        return {path = path, type = "flat", value = flat}
    end

    -- Try as record
    local rok, record = pcall(TweakDB.GetRecord, TweakDB, tdbid)
    if rok and record then
        local info = {path = path, type = "record", className = "unknown", flats = {}}

        pcall(function()
            info.className = record:GetClassName().value
        end)

        -- Get flats under this record
        local fok, flatList = pcall(TweakDB.GetRecordFlats, TweakDB, tdbid)
        if fok and flatList then
            for _, flatId in ipairs(flatList) do
                local fname = TDBID.ToStringDEBUG(flatId)
                local fval = TweakDB:GetFlat(flatId)
                table.insert(info.flats, {name = fname, value = fval})
            end
        end

        return info
    end

    return nil, "TweakDB path not found: " .. path
end

function handlers.tweakdb_set(args)
    if not args or not args.path then
        return nil, "No TweakDB path provided"
    end
    if args.value == nil then
        return nil, "No value provided"
    end

    local path = args.path
    local value = args.value
    local valType = args.type

    -- Auto-detect type if not specified
    if not valType then
        local luaType = type(value)
        if luaType == "number" then
            valType = (math.floor(value) == value) and "Int" or "Float"
        elseif luaType == "boolean" then
            valType = "Bool"
        elseif luaType == "string" then
            valType = "String"
        end
    end

    -- Convert value to appropriate type
    if valType == "CName" then
        value = CName.new(value)
    end

    local ok, err = pcall(function()
        TweakDB:SetFlat(TweakDBID.new(path), value)
    end)

    if not ok then
        return nil, "Failed to set TweakDB value: " .. tostring(err)
    end

    return {path = path, value = value, type = valType, success = true}
end

function handlers.dump_type(args)
    if not args or not args.typeName then
        return nil, "No type name provided"
    end

    local typeName = args.typeName
    local rtti = Game.GetRTTISystem()
    local typeObj = rtti:GetClass(CName.new(typeName))

    if not typeObj then
        return nil, "Type not found: " .. typeName
    end

    local info = {
        name = typeName,
        parent = nil,
        properties = {},
        methods = {}
    }

    pcall(function()
        local parent = typeObj:GetParent()
        if parent then
            info.parent = NameToString(parent:GetName())
        end
    end)

    pcall(function()
        local props = typeObj:GetProperties()
        for _, prop in ipairs(props) do
            table.insert(info.properties, {
                name = NameToString(prop:GetName()),
                type = NameToString(prop:GetType():GetName())
            })
        end
    end)

    pcall(function()
        local funcs = typeObj:GetFunctions()
        for _, func in ipairs(funcs) do
            local funcInfo = {
                name = NameToString(func:GetName()),
                returnType = nil,
                params = {}
            }

            pcall(function()
                local ret = func:GetReturnType()
                if ret then
                    funcInfo.returnType = NameToString(ret:GetType():GetName())
                end
            end)

            pcall(function()
                local params = func:GetParameters()
                for _, param in ipairs(params) do
                    table.insert(funcInfo.params, {
                        name = NameToString(param:GetName()),
                        type = NameToString(param:GetType():GetName())
                    })
                end
            end)

            table.insert(info.methods, funcInfo)
        end
    end)

    return info
end

-- Phase 3 handlers

local subscriptions = {}
local subCounter = 0

function handlers.observe_events(args)
    if not args or not args.className or not args.eventName then
        return nil, "className and eventName are required"
    end

    subCounter = subCounter + 1
    local subId = "sub_" .. tostring(subCounter)
    local maxBuffer = args.maxBuffer or 50

    subscriptions[subId] = {
        className = args.className,
        eventName = args.eventName,
        events = {},
        maxBuffer = maxBuffer
    }

    local ok, err = pcall(function()
        ObserveAfter(args.className, args.eventName, function(self, ...)
            local sub = subscriptions[subId]
            if not sub then return end

            local entry = {
                timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
                args = {}
            }

            local eventArgs = {...}
            for i, arg in ipairs(eventArgs) do
                local aok, aval = pcall(tostring, arg)
                entry.args[i] = aok and aval or "[unserializable]"
            end

            table.insert(sub.events, entry)
            if #sub.events > sub.maxBuffer then
                table.remove(sub.events, 1)
            end
        end)
    end)

    if not ok then
        subscriptions[subId] = nil
        return nil, "Failed to observe: " .. tostring(err)
    end

    return {
        subscriptionId = subId,
        className = args.className,
        eventName = args.eventName,
        maxBuffer = maxBuffer
    }
end

function handlers.get_observations(args)
    if not args or not args.subscriptionId then
        return nil, "subscriptionId is required"
    end

    local sub = subscriptions[args.subscriptionId]
    if not sub then
        return nil, "Subscription not found: " .. tostring(args.subscriptionId)
    end

    local events = sub.events
    sub.events = {}

    return {
        subscriptionId = args.subscriptionId,
        className = sub.className,
        eventName = sub.eventName,
        count = #events,
        events = events
    }
end

function handlers.batch_execute(args)
    if not args or not args.commands then
        return nil, "commands array is required"
    end

    local results = {}
    for i, code in ipairs(args.commands) do
        local fn, loadErr = loadstring(code)
        if not fn then
            results[i] = {ok = false, error = "Syntax error: " .. tostring(loadErr)}
        else
            local ok, execErr = pcall(fn)
            if ok then
                results[i] = {ok = true}
            else
                results[i] = {ok = false, error = "Runtime error: " .. tostring(execErr)}
            end
        end
    end

    return {count = #results, results = results}
end

function handlers.add_item(args)
    if not args or not args.itemId then
        return nil, "itemId is required"
    end

    local player = Game.GetPlayer()
    if not player then
        return nil, "Player not available"
    end

    local quantity = args.quantity or 1
    local tdbid = TweakDBID.new(args.itemId)

    local ok, err = pcall(function()
        local transSystem = Game.GetTransactionSystem()
        local itemID = ItemID.new(tdbid)
        transSystem:GiveItem(player, itemID, quantity)
    end)

    if not ok then
        return nil, "Failed to add item: " .. tostring(err)
    end

    return {itemId = args.itemId, quantity = quantity, success = true}
end

function handlers.teleport(args)
    if not args or not args.x or not args.y or not args.z then
        return nil, "x, y, z coordinates are required"
    end

    local player = Game.GetPlayer()
    if not player then
        return nil, "Player not available"
    end

    local ok, err = pcall(function()
        local pos = Vector4.new(args.x, args.y, args.z, 1.0)
        local angle = player:GetWorldOrientation():IsValid() and player:GetWorldOrientation() or EulerAngles.new(0, 0, 0):ToQuat()
        Game.GetTeleportationFacility():Teleport(player, pos, angle)
    end)

    if not ok then
        return nil, "Failed to teleport: " .. tostring(err)
    end

    return {x = args.x, y = args.y, z = args.z, success = true}
end

function handlers.search_tweakdb(args)
    if not args or not args.pattern then
        return nil, "pattern is required"
    end

    local pattern = string.lower(args.pattern)
    local limit = args.limit or 20
    local filterType = args.type

    local results = {}
    local count = 0

    local ok, err = pcall(function()
        local flatList = TweakDB:GetRecords()
        if not flatList then return end

        for _, record in ipairs(flatList) do
            if count >= limit then break end

            local rok, path = pcall(function()
                return TDBID.ToStringDEBUG(record:GetID())
            end)

            if rok and path and string.find(string.lower(path), pattern, 1, true) then
                local entry = {path = path}

                if filterType then
                    local tok, typeName = pcall(function()
                        return NameToString(record:GetClassName())
                    end)
                    if tok and typeName == filterType then
                        entry.type = typeName
                        table.insert(results, entry)
                        count = count + 1
                    end
                else
                    pcall(function()
                        entry.type = NameToString(record:GetClassName())
                    end)
                    table.insert(results, entry)
                    count = count + 1
                end
            end
        end
    end)

    if not ok then
        return nil, "Search failed: " .. tostring(err)
    end

    return {pattern = args.pattern, count = count, results = results}
end

return handlers
