local ESX = exports['es_extended']:getSharedObject()

local function trim(value)
    value = tostring(value or '')
    return value:gsub('^%s+', ''):gsub('%s+$', '')
end

local function urlEncode(value)
    value = tostring(value or '')

    return value:gsub('([^%w%-_%.~])', function(char)
        return string.format('%%%02X', string.byte(char))
    end)
end

local function isConfigured()
    return Config.SupabaseUrl
        and Config.SupabaseAnonKey
        and Config.SupabaseUrl ~= ''
        and Config.SupabaseAnonKey ~= ''
end

local function headers(preferMinimal)
    local result = {
        ['apikey'] = Config.SupabaseAnonKey,
        ['Authorization'] = 'Bearer ' .. Config.SupabaseAnonKey,
        ['Content-Type'] = 'application/json'
    }

    if preferMinimal then
        result['Prefer'] = 'return=minimal'
    end

    return result
end

local function getPlayerNameSafe(source, xPlayer)
    if xPlayer and xPlayer.getName then
        local name = xPlayer.getName()
        if name and name ~= '' then return name end
    end

    return GetPlayerName(source) or 'Unbekannt'
end

local function getAllowedBusiness(source)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer or not xPlayer.job then
        return nil, nil
    end

    return xPlayer, Config.AllowedJobs[xPlayer.job.name]
end

ESX.RegisterServerCallback('lst_food_taxi:createDelivery', function(source, cb, data)
    local xPlayer, jobConfig = getAllowedBusiness(source)

    if not xPlayer then
        cb({ ok = false, message = 'Spielerdaten konnten nicht geladen werden.' })
        return
    end

    if not jobConfig then
        cb({ ok = false, message = 'Du bist für diese App nicht berechtigt.' })
        return
    end

    if not isConfigured() then
        cb({ ok = false, message = 'Supabase ist nicht konfiguriert.' })
        return
    end

    local customerName = trim(data.customer_name)
    local destination = trim(data.destination)
    local notes = trim(data.notes)
    local foodCost = tonumber(data.food_cost) or 0

    if customerName == '' then
        cb({ ok = false, message = 'Bitte Kundenname eintragen.' })
        return
    end

    if destination == '' then
        cb({ ok = false, message = 'Bitte Lieferort oder PLZ eintragen.' })
        return
    end

    if foodCost < 0 then foodCost = 0 end

    local creatorName = getPlayerNameSafe(source, xPlayer)
    local combinedNotes = notes ~= '' and ('Bestellung: ' .. notes) or ''

    local payload = {
        created_by = creatorName,
        job_status = 'Offen',
        ride_type = 'Essenslieferung',
        pickup_location = jobConfig.pickup,
        destination = destination,
        customer_name = customerName,
        company_name = jobConfig.label,
        notes = combinedNotes,
        food_cost = foodCost,
        assigned_driver = nil,
        assigned_at = nil
    }

    PerformHttpRequest(Config.SupabaseUrl .. '/rest/v1/taxi_jobs', function(statusCode, responseText)
        if statusCode < 200 or statusCode >= 300 then
            print('[lst_food_taxi] Supabase Fehler:', statusCode, responseText or '')
            cb({ ok = false, message = 'Lieferauftrag konnte nicht an die Leitstelle gesendet werden.' })
            return
        end

        cb({
            ok = true,
            message = 'Auftrag wurde erfolgreich an die Leitstelle verschickt.'
        })
    end, 'POST', json.encode(payload), headers(true))
end)

ESX.RegisterServerCallback('lst_food_taxi:getDeliveryHistory', function(source, cb)
    local _, jobConfig = getAllowedBusiness(source)

    if not jobConfig then
        cb({ ok = false, message = 'Du bist für diese App nicht berechtigt.', orders = {} })
        return
    end

    if not isConfigured() then
        cb({ ok = false, message = 'Supabase ist nicht konfiguriert.', orders = {} })
        return
    end

    local url = Config.SupabaseUrl
        .. '/rest/v1/taxi_jobs'
        .. '?select=id,customer_name,destination,food_cost,job_status,assigned_driver,created_at,completed_at'
        .. '&ride_type=eq.' .. urlEncode('Essenslieferung')
        .. '&company_name=eq.' .. urlEncode(jobConfig.label)
        .. '&order=created_at.desc'
        .. '&limit=10'

    PerformHttpRequest(url, function(statusCode, responseText)
        if statusCode < 200 or statusCode >= 300 then
            print('[lst_food_taxi] Verlauf Fehler:', statusCode, responseText or '')
            cb({ ok = false, message = 'Aufträge konnten nicht geladen werden.', orders = {} })
            return
        end

        local ok, rows = pcall(json.decode, responseText or '[]')

        if not ok or type(rows) ~= 'table' then
            cb({ ok = false, message = 'Aufträge konnten nicht gelesen werden.', orders = {} })
            return
        end

        cb({ ok = true, orders = rows })
    end, 'GET', '', headers(false))
end)