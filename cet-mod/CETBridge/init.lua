local bridge = require("bridge")

registerForEvent("onInit", function()
    print("[CETBridge] Ready")
    bridge:Init()
end)

registerForEvent("onUpdate", function(dt)
    bridge:Update(dt)
end)

registerForEvent("onShutdown", function()
    bridge:Shutdown()
end)
