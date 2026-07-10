local ESX = exports['es_extended']:getSharedObject()
local appRegistered = false
local currentJob = nil

local function debugPrint(...)
    if Config.Debug then
        print('[lst_food_taxi]', ...)
    end
end

local function getJobConfig(jobName)
    if not jobName then return nil end
    return Config.AllowedJobs[jobName]
end

local function removeFoodApp()
    if not appRegistered then return end

    pcall(function()
        exports['lb-phone']:RemoveCustomApp('FoodTaxi')
    end)

    appRegistered = false
    debugPrint('Essensliefer-App entfernt')
end

local function registerFoodApp()
    if appRegistered then return true end
    if GetResourceState('lb-phone') ~= 'started' then return false end

    local jobConfig = getJobConfig(currentJob)
    if not jobConfig then return false end

    local appData = {
        identifier = 'FoodTaxi',
        name = 'Liefer-Taxi',
        description = 'Essenslieferung an Taxi senden',
        developer = 'Los Santos Taxi',
        defaultApp = true,
        removable = false,
        size = 512,
        images = {},
        icon = 'https://cfx-nui-lst_phone_taxi/html/icon.png',
        ui = 'lst_food_taxi/html/index.html?v=1'
    }

    local ok, result = pcall(function()
        return exports['lb-phone']:AddCustomApp(appData)
    end)

    if ok then
        appRegistered = true
        debugPrint('Essensliefer-App registriert fuer Job', currentJob)
        return true
    end

    debugPrint('App konnte noch nicht registriert werden:', result)
    return false
end

local function refreshAppVisibility()
    local allowed = getJobConfig(currentJob) ~= nil

    if allowed then
        CreateThread(function()
            while GetResourceState('lb-phone') ~= 'started' do
                Wait(1000)
            end

            Wait(Config.PhoneRegisterDelayMs or 8000)

            for _ = 1, 20 do
                if registerFoodApp() then return end
                Wait(2000)
            end
        end)
    else
        removeFoodApp()
    end
end

RegisterNUICallback('getFoodBusinessData', function(_, cb)
    local jobConfig = getJobConfig(currentJob)

    if not jobConfig then
        cb({ ok = false, allowed = false, message = 'Du arbeitest in keinem freigeschalteten Essensgewerbe.' })
        return
    end

    cb({
        ok = true,
        allowed = true,
        job = currentJob,
        company = jobConfig.label,
        pickup = jobConfig.pickup
    })
end)

RegisterNUICallback('createFoodDelivery', function(data, cb)
    ESX.TriggerServerCallback('lst_food_taxi:createDelivery', function(result)
        cb(result or { ok = false, message = 'Lieferauftrag konnte nicht erstellt werden.' })
    end, data or {})
end)

RegisterNetEvent('esx:playerLoaded', function(xPlayer)
    currentJob = xPlayer and xPlayer.job and xPlayer.job.name or nil
    refreshAppVisibility()
end)

RegisterNetEvent('esx:setJob', function(job)
    currentJob = job and job.name or nil
    refreshAppVisibility()
end)

CreateThread(function()
    while not ESX.IsPlayerLoaded() do
        Wait(500)
    end

    local playerData = ESX.GetPlayerData()
    currentJob = playerData and playerData.job and playerData.job.name or nil
    refreshAppVisibility()
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == 'lb-phone' or resourceName == GetCurrentResourceName() then
        appRegistered = false
        refreshAppVisibility()
    end
end)
