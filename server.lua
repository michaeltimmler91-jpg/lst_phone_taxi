local ESX = exports['es_extended']:getSharedObject()

local ACTIVE_JOB_STATUSES = {
    'Offen',
    'Übernommen',
    'Unterwegs',
    'Fahrer angekommen'
}

local function debugPrint(...)
    if Config.Debug then
        print('[lst_phone_taxi]', ...)
    end
end

local function trim(value)
    value = tostring(value or '')
    return value:gsub('^%s+', ''):gsub('%s+$', '')
end

local function urlEncode(value)
    value = tostring(value or '')

    value = value:gsub('\n', '\r\n')
    value = value:gsub('([^%w%-_%.~])', function(char)
        return string.format('%%%02X', string.byte(char))
    end)

    return value
end

local function postgrestIn(values)
    local encoded = {}

    for _, value in ipairs(values) do
        encoded[#encoded + 1] = urlEncode(value)
    end

    return 'in.(' .. table.concat(encoded, ',') .. ')'
end

local function isoUtc(secondsAgo)
    return os.date('!%Y-%m-%dT%H:%M:%SZ', os.time() - (secondsAgo or 0))
end

local function completedVisibleSeconds()
    return (Config.CompletedStatusVisibleMinutes or 5) * 60
end

local function isSupabaseConfigured()
    return Config.SupabaseUrl
        and Config.SupabaseAnonKey
        and Config.SupabaseUrl ~= ''
        and Config.SupabaseAnonKey ~= ''
        and Config.SupabaseUrl ~= 'https://DEIN-PROJEKT.supabase.co'
        and Config.SupabaseAnonKey ~= 'HIER_DEIN_SUPABASE_ANON_KEY'
end

local function supabaseHeaders(extra)
    local headers = {
        ['apikey'] = Config.SupabaseAnonKey,
        ['Authorization'] = 'Bearer ' .. Config.SupabaseAnonKey,
        ['Content-Type'] = 'application/json'
    }

    if extra then
        for key, value in pairs(extra) do
            headers[key] = value
        end
    end

    return headers
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
    end, 'GET', '', supabaseHeaders())
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

local function getActiveTaxiOrder(identifier, cb)
    if not isSupabaseConfigured() then
        cb(nil)
        return
    end

    local url = Config.SupabaseUrl
        .. '/rest/v1/taxi_jobs'
        .. '?select=id,job_status,pickup_location,destination,assigned_driver,created_at,completed_at,phone_status'
        .. '&customer_identifier=eq.' .. urlEncode(identifier)
        .. '&job_status=' .. postgrestIn(ACTIVE_JOB_STATUSES)
        .. '&order=created_at.desc'
        .. '&limit=1'

    PerformHttpRequest(url, function(statusCode, responseText)
        if statusCode < 200 or statusCode >= 300 then
            debugPrint('Active order check failed', statusCode, responseText or '')
            cb(nil)
            return
        end

        local ok, rows = pcall(json.decode, responseText or '[]')

        if not ok or type(rows) ~= 'table' then
            debugPrint('Active order decode failed', responseText or '')
            cb(nil)
            return
        end

        cb(rows[1])
    end, 'GET', '', supabaseHeaders())
end

local function getRecentCompletedTaxiOrder(identifier, cb)
    if not isSupabaseConfigured() then
        cb(nil)
        return
    end

    local completedSince = isoUtc(completedVisibleSeconds())

    local url = Config.SupabaseUrl
        .. '/rest/v1/taxi_jobs'
        .. '?select=id,job_status,pickup_location,destination,assigned_driver,created_at,completed_at,phone_status'
        .. '&customer_identifier=eq.' .. urlEncode(identifier)
        .. '&job_status=eq.Erledigt'
        .. '&phone_status=eq.completed'
        .. '&completed_at=gte.' .. urlEncode(completedSince)
        .. '&order=completed_at.desc'
        .. '&limit=1'

    PerformHttpRequest(url, function(statusCode, responseText)
        if statusCode < 200 or statusCode >= 300 then
            debugPrint('Completed order check failed', statusCode, responseText or '')
            cb(nil)
            return
        end

        local ok, rows = pcall(json.decode, responseText or '[]')

        if not ok or type(rows) ~= 'table' then
            debugPrint('Completed order decode failed', responseText or '')
            cb(nil)
            return
        end

        cb(rows[1])
    end, 'GET', '', supabaseHeaders())
end

local function sendToWorker(payload, cb)
    local headers = {
        ['Content-Type'] = 'application/json'
    }

    if Config.WorkerSecret and Config.WorkerSecret ~= '' then
        headers['X-LST-Secret'] = Config.WorkerSecret
    end

    PerformHttpRequest(Config.WorkerUrl, function(statusCode, responseText)
        debugPrint('Worker response', statusCode, responseText or '')

        cb(statusCode >= 200 and statusCode < 300, responseText)
    end, 'POST', json.encode(payload), headers)
end

local function sendToSupabase(payload, cb)
    local url = Config.SupabaseUrl .. '/rest/v1/taxi_jobs'

    PerformHttpRequest(url, function(statusCode, responseText)
        debugPrint('Supabase response', statusCode, responseText or '')

        cb(statusCode >= 200 and statusCode < 300, responseText)
    end, 'POST', json.encode(payload), supabaseHeaders({
        ['Prefer'] = 'return=minimal'
    }))
end

ESX.RegisterServerCallback('lst_phone_taxi:canOrderTaxi', function(source, cb)
    local xPlayer = ESX.GetPlayerFromId(source)
    local identifier = getIdentifier(source, xPlayer)

    getActiveTaxiOrder(identifier, function(activeOrder)
        if activeOrder then
            cb({
                ok = true,
                driversOnline = true,
                hasActiveOrder = true,
                activeOrder = activeOrder
            })
            return
        end

        getRecentCompletedTaxiOrder(identifier, function(completedOrder)
            if completedOrder then
                cb({
                    ok = true,
                    driversOnline = false,
                    hasActiveOrder = false,
                    hasCompletedOrder = true,
                    completedOrder = completedOrder
                })
                return
            end

            checkDriversOnline(function(driversOnline)
                cb({
                    ok = true,
                    driversOnline = driversOnline,
                    hasActiveOrder = false,
                    hasCompletedOrder = false
                })
            end)
        end)
    end)
end)

ESX.RegisterServerCallback('lst_phone_taxi:createOrder', function(source, cb, data)
    local src = source
    local xPlayer = ESX.GetPlayerFromId(src)
    local identifier = getIdentifier(src, xPlayer)

    getActiveTaxiOrder(identifier, function(activeOrder)
        if activeOrder then
            cb({
                ok = false,
                hasActiveOrder = true,
                activeOrder = activeOrder,
                message = 'Du hast bereits eine offene Taxianfrage.'
            })
            return
        end

        checkDriversOnline(function(driversOnline)
            if not driversOnline then
                cb({
                    ok = false,
                    message = 'Aktuell ist leider kein Taxifahrer im Dienst.'
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
                customer_identifier = identifier,
                phone_status = 'request_received',
                notes = notes,
                assigned_driver = nil,
                assigned_at = nil
            }

            local function onCreated(success, responseText)
                if not success then
                    cb({
                        ok = false,
                        message = 'Taxi konnte nicht gerufen werden. Bitte versuche es später erneut.'
                    })
                    return
                end

                cb({
                    ok = true,
                    message = 'Deine Anfrage ist bei unserer Leitstelle eingegangen.',
                    hasActiveOrder = true,
                    activeOrder = {
                        job_status = 'Offen',
                        phone_status = 'request_received',
                        pickup_location = pickupLocation,
                        destination = destination,
                        assigned_driver = nil
                    }
                })
            end

            if Config.UseWorker then
                sendToWorker(payload, onCreated)
            else
                sendToSupabase(payload, onCreated)
            end
        end)
    end)
end)
