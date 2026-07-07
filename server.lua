local ESX = exports['es_extended']:getSharedObject()
local lastTaxiOrder = {}

local function debugPrint(...)
    if Config.Debug then
        print('[lst_phone_taxi]', ...)
    end
end

local function trim(value)
    value = tostring(value or '')
    return value:gsub('^%s+', ''):gsub('%s+$', '')
end

local function isSupabaseConfigured()
    return Config.SupabaseUrl
        and Config.SupabaseAnonKey
        and Config.SupabaseUrl ~= ''
        and Config.SupabaseAnonKey ~= ''
        and Config.SupabaseUrl ~= 'https://DEIN-PROJEKT.supabase.co'
        and Config.SupabaseAnonKey ~= 'HIER_DEIN_SUPABASE_ANON_KEY'
end

local function checkDriversOnline(cb)
    if not isSupabaseConfigured() then
        debugPrint('Supabase nicht konfiguriert. Formular wird NICHT freigegeben.')
        cb(false)
        return
    end

    local url = Config.SupabaseUrl .. '/rest/v1/taxi_driver_status?select=id&status=eq.Im%20Dienst&limit=1'

    PerformHttpRequest(url, function(statusCode, responseText)
        if statusCode < 200 or statusCode >= 300 then
            debugPrint('Driver check failed', statusCode, responseText or '')
            cb(false)
            return
        end

        local ok, rows = pcall(json.decode, responseText or '[]')

        if not ok or type(rows) ~= 'table' then
            debugPrint('Driver check decode failed', responseText or '')
            cb(false)
            return
        end

        debugPrint('Drivers online check rows:', #rows)
        cb(#rows > 0)
    end, 'GET', '', {
        ['apikey'] = Config.SupabaseAnonKey,
        ['Authorization'] = 'Bearer ' .. Config.SupabaseAnonKey,
        ['Content-Type'] = 'application/json'
    })
end

local function getIdentifier(source, xPlayer)
    if xPlayer and xPlayer.identifier then
        return xPlayer.identifier
    end

    return GetPlayerIdentifier(source, 0) or ('source:' .. tostring(source))
end

local function getPlayerDisplayName(source)
    local xPlayer = ESX.GetPlayerFromId(source)

    if xPlayer then
        if xPlayer.getName then
            local name = xPlayer.getName()
            if name and name ~= '' then
                return name
            end
        end

        if xPlayer.get then
            local firstName = xPlayer.get('firstName') or xPlayer.get('firstname')
            local lastName = xPlayer.get('lastName') or xPlayer.get('lastname')

            if firstName and lastName then
                return firstName .. ' ' .. lastName
            end
        end
    end

    return GetPlayerName(source) or 'Unbekannt'
end

local function sendToWorker(payload)
    local headers = {
        ['Content-Type'] = 'application/json'
    }

    if Config.WorkerSecret and Config.WorkerSecret ~= '' then
        headers['X-LST-Secret'] = Config.WorkerSecret
    end

    PerformHttpRequest(Config.WorkerUrl, function(statusCode, responseText)
        debugPrint('Worker response', statusCode, responseText or '')
    end, 'POST', json.encode(payload), headers)
end

local function sendToSupabase(payload)
    local url = Config.SupabaseUrl .. '/rest/v1/taxi_jobs'

    PerformHttpRequest(url, function(statusCode, responseText)
        debugPrint('Supabase response', statusCode, responseText or '')
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
        ['apikey'] = Config.SupabaseAnonKey,
        ['Authorization'] = 'Bearer ' .. Config.SupabaseAnonKey,
        ['Prefer'] = 'return=minimal'
    })
end

ESX.RegisterServerCallback('lst_phone_taxi:canOrderTaxi', function(source, cb)
    checkDriversOnline(function(driversOnline)
        cb({
            ok = true,
            driversOnline = driversOnline
        })
    end)
end)

ESX.RegisterServerCallback('lst_phone_taxi:createOrder', function(source, cb, data)
    checkDriversOnline(function(driversOnline)
        if not driversOnline then
            cb({
                ok = false,
                message = 'Aktuell ist leider kein Taxifahrer im Dienst.'
            })
            return
        end

        local src = source
        local xPlayer = ESX.GetPlayerFromId(src)
        local identifier = getIdentifier(src, xPlayer)
        local now = os.time()
        local cooldownSeconds = (Config.OrderCooldownMinutes or 10) * 60

        local lastOrder = lastTaxiOrder[identifier]

        if lastOrder and now - lastOrder < cooldownSeconds then
            local remaining = math.ceil((cooldownSeconds - (now - lastOrder)) / 60)

            cb({
                ok = false,
                message = ('Du hast bereits ein Taxi gerufen. Bitte warte noch ca. %s Minuten.'):format(remaining)
            })
            return
        end

        local pickupLocation = trim(data.pickup_location)
        local destination = trim(data.destination)
        local notes = trim(data.notes)

        if pickupLocation == '' then
            cb({
                ok = false,
                message = 'Bitte Abholort oder PLZ eintragen.'
            })
            return
        end

        local customerName = getPlayerDisplayName(src)

        local payload = {
            created_by = Config.JobDefaults.created_by,
            job_status = Config.JobDefaults.job_status,
            ride_type = Config.JobDefaults.ride_type,
            pickup_location = pickupLocation,
            destination = destination,
            customer_name = customerName,
            notes = notes,
            assigned_driver = nil,
            assigned_at = nil
        }

        lastTaxiOrder[identifier] = now

        if Config.UseWorker then
            sendToWorker(payload)
        else
            sendToSupabase(payload)
        end

        cb({
            ok = true,
            message = 'Deine Anfrage wurde erfolgreich an die Leitstelle übermittelt.'
        })
    end)
end)
