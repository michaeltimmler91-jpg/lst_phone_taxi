local ESX = exports['es_extended']:getSharedObject()
local appOpen = false
local phoneAppRegistered = false

local function openTaxiApp()
    if appOpen then return end
    appOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', checkInterval = (Config.DriverCheckIntervalSeconds or 10) * 1000 })
end

local function closeTaxiApp()
    if not appOpen then return end
    appOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

local function registerPhoneApp()
    if phoneAppRegistered then return end
    if GetResourceState('lb-phone') ~= 'started' then return end

    local appData = {
        identifier = 'TaxiRuf',
        name = 'Taxi-Ruf',
        description = 'Taxi rufen',
        developer = 'Los Santos Taxi',
        defaultApp = true,
        removable = false,
        size = 512,
        images = {},
        icon = 'https://cfx-nui-lst_phone_taxi/html/icon.png',
        ui = 'lst_phone_taxi/html/phone.html'
    }

    local ok, result = pcall(function()
        return exports['lb-phone']:AddCustomApp(appData)
    end)

    if ok then
        phoneAppRegistered = true
        print('[lst_phone_taxi] Taxi-Ruf App im lb-phone registriert')
    else
        print('[lst_phone_taxi] lb-phone App konnte nicht registriert werden:', result)
    end
end

RegisterCommand(Config.OpenCommand or 'taxiapp', function()
    openTaxiApp()
end, false)

RegisterNUICallback('closeTaxiApp', function(_, cb)
    closeTaxiApp()
    cb({ ok = true })
end)

RegisterNUICallback('checkTaxiDrivers', function(_, cb)
    ESX.TriggerServerCallback('lst_phone_taxi:canOrderTaxi', function(result)
        cb(result or { ok = false, driversOnline = false, message = 'Status konnte nicht geprüft werden.' })
    end)
end)

RegisterNUICallback('createTaxiOrder', function(data, cb)
    local pickupLocation = tostring(data.pickup_location or ''):gsub('^%s+', ''):gsub('%s+$', '')
    local destination = tostring(data.destination or ''):gsub('^%s+', ''):gsub('%s+$', '')
    local notes = tostring(data.notes or ''):gsub('^%s+', ''):gsub('%s+$', '')

    if pickupLocation == '' then
        cb({ ok = false, message = 'Bitte Abholort oder PLZ eintragen.' })
        return
    end

    ESX.TriggerServerCallback('lst_phone_taxi:createOrder', function(result)
        cb(result or { ok = false, message = 'Taxi konnte nicht gerufen werden.' })
        if result and result.ok and data.phoneMode ~= true then
            closeTaxiApp()
        end
    end, { pickup_location = pickupLocation, destination = destination, notes = notes })
end)

CreateThread(function()
    Wait(1000)
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })

    for _ = 1, 20 do
        registerPhoneApp()
        if phoneAppRegistered then break end
        Wait(1000)
    end
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == 'lb-phone' or resourceName == GetCurrentResourceName() then
        Wait(1500)
        phoneAppRegistered = false
        registerPhoneApp()
    end
end)
