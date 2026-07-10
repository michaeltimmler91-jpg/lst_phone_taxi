local ESX = exports['es_extended']:getSharedObject()

local function trim(value)
    value = tostring(value or '')
    return value:gsub('^%s+', ''):gsub('%s+$', '')
end

local function isConfigured()
    return Config.SupabaseUrl
        and Config.SupabaseAnonKey
        and Config.SupabaseUrl ~= ''
        and Config.SupabaseAnonKey ~= ''
end

local function headers()
    return {
        ['apikey'] = Config.SupabaseAnonKey,
        ['Authorization'] = 'Bearer ' .. Config.SupabaseAnonKey,
        ['Content-Type'] = 'application/json',
        ['Prefer'] = 'return=minimal'
    }
end

local function getPlayerNameSafe(source, xPlayer)
    if xPlayer and xPlayer.getName then
        local name = xPlayer.getName()
        if name and name ~= '' then return name end
    end

    return GetPlayerName(source) or 'Unbekannt'
end

ESX.RegisterServerCallback('lst_food_taxi:createDelivery', function(source, cb, data)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer or not xPlayer.job then
        cb({ ok = false, message = 'Spielerdaten konnten nicht geladen werden.' })
        return
    end

    local jobName = xPlayer.job.name
    local jobConfig = Config.AllowedJobs[jobName]

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
    local paidBy = trim(data.food_paid_by)
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
    if paidBy ~= 'fahrer' and paidBy ~= 'firma' then paidBy = 'firma' end

    local creatorName = getPlayerNameSafe(source, xPlayer)
    local paymentText = paidBy == 'fahrer' and 'Fahrer bezahlt Essen aus eigener Tasche' or 'Essen wird über Schließfach/Firma bezahlt'
    local combinedNotes = paymentText

    if notes ~= '' then
        combinedNotes = combinedNotes .. ' | Bestellung: ' .. notes
    end

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
        food_paid_by = paidBy,
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
            message = 'Lieferauftrag wurde an Los Santos Taxi gesendet.'
        })
    end, 'POST', json.encode(payload), headers())
end)
