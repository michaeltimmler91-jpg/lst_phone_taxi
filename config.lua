Config = {}

-- Erstmal direkt nach Supabase schreiben. Worker bauen wir später sauber dazu.
Config.UseWorker = false
Config.WorkerUrl = 'https://los-santos-taxi.michaeltimmler91.workers.dev/'
Config.WorkerSecret = ''

Config.SupabaseUrl = 'https://unkfqoplynwabulnzpar.supabase.co'
Config.SupabaseAnonKey = 'sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK'

Config.JobDefaults = {
    created_by = 'lb-phone',
    job_status = 'Offen',
    ride_type = 'Normale Fahrt'
}

Config.OrderCooldownMinutes = 10
Config.DriverCheckIntervalSeconds = 10
Config.Debug = true
