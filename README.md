# lst_phone_taxi

Taxi-Ruf-App fuer FiveM / ESX mit lb-phone.

Die App wird fest im lb-phone angezeigt. Spieler koennen darueber ein Taxi rufen. Der Auftrag wird an dein Taxi-System uebergeben.

## Voraussetzungen

Du brauchst:

```text
es_extended
lb-phone
lst_phone_taxi
```

## Installation

Lege den Ordner hier ab:

```text
resources/[local]/lst_phone_taxi
```

Der Ordner muss genau so heissen:

```text
lst_phone_taxi
```

## Config einstellen

Oeffne:

```text
lst_phone_taxi/config.lua
```

Trage dort deine Daten ein:

```lua
Config.SupabaseUrl = 'https://DEIN-PROJEKT.supabase.co'
Config.SupabaseAnonKey = 'DEIN_SUPABASE_ANON_KEY'
```

Wenn du den Worker nutzt:

```lua
Config.UseWorker = true
Config.WorkerUrl = 'https://dein-worker.workers.dev'
Config.WorkerSecret = 'DEIN_SECRET'
```

Wenn du direkt Supabase nutzt:

```lua
Config.UseWorker = false
```

## server.cfg

`lb-phone` muss vor `lst_phone_taxi` starten:

```cfg
ensure es_extended
ensure lb-phone
ensure lst_phone_taxi
```

## Starten

Nach dem Einbau:

```text
refresh
restart lb-phone
restart lst_phone_taxi
```

Oder den Server komplett neu starten.

Im Server-Log sollte stehen:

```text
[lst_phone_taxi] Taxi-Ruf App im lb-phone registriert
```

## Testen

1. Ins Spiel gehen
2. lb-phone oeffnen
3. App `Taxi-Ruf` suchen
4. App oeffnen

Wenn kein Taxifahrer im Dienst ist, wird kein Formular angezeigt.

Damit die App genutzt werden kann, muss mindestens ein Fahrer in `taxi_driver_status` den Status haben:

```text
Im Dienst
```

## Testbefehl

Zum Testen gibt es weiterhin:

```text
/taxiapp
```

Normal soll die App aber ueber lb-phone geoeffnet werden.

## Typische Fehler

### App ist nicht sichtbar

Pruefe die Startreihenfolge:

```cfg
ensure lb-phone
ensure lst_phone_taxi
```

`lst_phone_taxi` muss nach `lb-phone` starten.

### Icon bleibt weiss

Pruefe, ob diese Datei vorhanden ist:

```text
lst_phone_taxi/html/icon.png
```

Danach neu starten:

```text
refresh
restart lst_phone_taxi
restart lb-phone
```

Falls es immer noch weiss bleibt, FiveM komplett neu starten.

### Auftrag kommt nicht an

Pruefe:

- Supabase URL
- Supabase Key
- Worker URL
- Worker Secret
- Tabelle `taxi_jobs`
- Server-Konsole auf Fehler

## Fertig

Wenn alles passt, ist im lb-phone die App `Taxi-Ruf` sichtbar und Spieler koennen ein Taxi rufen.
