-- Datei nach lb-phone/config/zz_taxi_ruf.lua kopieren.
-- Nicht direkt in die große config.lua einfügen.

Config.CustomApps = Config.CustomApps or {}

Config.CustomApps["taxi_ruf"] = {
    name = "taxi_ruf",
    label = "Taxi-Ruf",
    description = "Taxi rufen",
    icon = "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
    developer = "Los Santos Taxi",
    size = 120,
    ui = "nui://lst_phone_taxi/html/index.html?phone=1",
    keepOpen = true,
    defaultApp = true
}
