local json = require("json")
local config = require("config")
local serializer = require("serializer")
local handlers = require("handlers")

local bridge = {
    initialized = false,
    heartbeatTimer = 0
}

function bridge:Init()
    self.initialized = true
    self:WriteHeartbeat()
    print("[CETBridge] Bridge initialized (transport: " .. config.transport .. ")")
end

function bridge:Update(dt)
    if not self.initialized then return end

    -- Heartbeat
    self.heartbeatTimer = self.heartbeatTimer + dt
    if self.heartbeatTimer >= config.heartbeat_interval then
        self.heartbeatTimer = 0
        self:WriteHeartbeat()
    end

    -- Poll for commands (file transport)
    if config.transport == "file" then
        self:PollFileCommand()
    end
end

function bridge:PollFileCommand()
    local cmdPath = "command.json"
    local file = io.open(cmdPath, "r")
    if not file then return end

    local content = file:read("*a")
    file:close()

    -- Delete command file immediately to signal receipt
    os.remove(cmdPath)

    if not content or content == "" then return end

    local ok, request = pcall(json.decode, content)
    if not ok or not request then
        print("[CETBridge] Failed to parse command: " .. tostring(request))
        return
    end

    local response = self:Execute(request)

    local resOk, resJson = pcall(json.encode, response)
    if not resOk then
        response = {id = request.id, ok = false, error = "Failed to encode response: " .. tostring(resJson)}
        resJson = json.encode(response)
    end

    -- Atomic write: tmp then rename
    local tmpPath = "response.json.tmp"
    local resPath = "response.json"
    local tmpFile = io.open(tmpPath, "w")
    if tmpFile then
        tmpFile:write(resJson)
        tmpFile:close()
        os.rename(tmpPath, resPath)
    end
end

function bridge:Execute(request)
    local id = request.id or "unknown"
    local reqType = request.type

    if reqType == "exec" then
        return self:ExecCode(id, request.code)
    elseif reqType == "eval" then
        return self:EvalExpr(id, request.expr)
    elseif reqType == "query" then
        return self:RunQuery(id, request.handler, request.args)
    else
        return {id = id, ok = false, error = "Unknown request type: " .. tostring(reqType)}
    end
end

function bridge:ExecCode(id, code)
    if not code then
        return {id = id, ok = false, error = "No code provided"}
    end

    -- Capture print output
    local output = {}
    local originalPrint = print
    print = function(...)
        local args = {...}
        local parts = {}
        for i = 1, select("#", ...) do
            parts[i] = tostring(args[i])
        end
        local line = table.concat(parts, "\t")
        table.insert(output, line)
        originalPrint(...)
    end

    local fn, loadErr = loadstring(code)
    if not fn then
        print = originalPrint
        return {id = id, ok = false, error = "Syntax error: " .. tostring(loadErr)}
    end

    local ok, execErr = pcall(fn)
    print = originalPrint

    if not ok then
        return {id = id, ok = false, error = "Runtime error: " .. tostring(execErr)}
    end

    local resultText = table.concat(output, "\n")
    return {id = id, ok = true, result = resultText}
end

function bridge:EvalExpr(id, expr)
    if not expr then
        return {id = id, ok = false, error = "No expression provided"}
    end

    local fn, loadErr = loadstring("return " .. expr)
    if not fn then
        return {id = id, ok = false, error = "Syntax error: " .. tostring(loadErr)}
    end

    local ok, result = pcall(fn)
    if not ok then
        return {id = id, ok = false, error = "Runtime error: " .. tostring(result)}
    end

    local serialized = serializer.serialize(result)
    return {id = id, ok = true, result = serialized}
end

function bridge:RunQuery(id, handlerName, args)
    if not handlerName then
        return {id = id, ok = false, error = "No handler specified"}
    end

    local handler = handlers[handlerName]
    if not handler then
        return {id = id, ok = false, error = "Unknown handler: " .. tostring(handlerName)}
    end

    local ok, result, err = pcall(handler, args)
    if not ok then
        return {id = id, ok = false, error = "Handler error: " .. tostring(result)}
    end

    if err then
        return {id = id, ok = false, error = err}
    end

    local serialized = serializer.serialize(result)
    return {id = id, ok = true, result = serialized}
end

function bridge:WriteHeartbeat()
    local hbPath = "heartbeat.json"
    local data = json.encode({
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        mod = "CETBridge",
        version = "0.1.0"
    })
    local file = io.open(hbPath, "w")
    if file then
        file:write(data)
        file:close()
    end
end

function bridge:Shutdown()
    self.initialized = false
    -- Clean up files
    pcall(os.remove, "heartbeat.json")
    pcall(os.remove, "command.json")
    pcall(os.remove, "response.json")
    print("[CETBridge] Bridge shut down")
end

return bridge
