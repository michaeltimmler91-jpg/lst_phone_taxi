-- Taxi-Ruf fuer lb-phone
-- Diese Datei nach lb-phone/config/zz_taxi_ruf.lua kopieren.
-- Permanente Custom-App, nicht loeschbar.
-- Keine ui/iframe-Einbindung: Beim Antippen startet die stabile lst_phone_taxi-NUI.

Config.CustomApps = Config.CustomApps or {}

Config.CustomApps["TaxiRuf"] = {
    name = "Taxi-Ruf",
    description = "Taxi rufen",
    developer = "Los Santos Taxi",
    icon = "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
    images = {},
    size = 512,
    defaultApp = true,
    removable = false,
    keepOpen = false,

    onUse = function()
        ExecuteCommand("taxiapp")
    end
}
