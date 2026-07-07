-- Taxi-Ruf fuer lb-phone 2.3.7
-- Diese Datei nach lb-phone/config/zz_taxi_ruf.lua kopieren.
-- Wichtig: keine ui/iframe-Einbindung. Die App startet nur die funktionierende lst_phone_taxi-NUI.

Config.CustomApps = Config.CustomApps or {}

Config.CustomApps["TaxiRuf"] = {
    name = "Taxi-Ruf",
    description = "Taxi rufen",
    icon = "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
    size = 512,
    removable = false,
    defaultApp = true,

    onUse = function()
        ExecuteCommand("taxiapp")
    end
}
