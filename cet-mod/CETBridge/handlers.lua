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

return handlers
