# lst_phone_taxi - Taxi-Ruf fuer lb-phone

Eine kleine Taxi-Ruf-App fuer FiveM / ESX mit lb-phone.

Die App wird als feste lb-phone App registriert und ist dauerhaft im Handy sichtbar.

## Funktionen

- Native App im lb-phone: `Taxi-Ruf`
- App ist dauerhaft installiert und nicht loeschbar
- Formular wird nur angezeigt, wenn mindestens ein Taxifahrer `Im Dienst` ist
- Statusanzeige im Handy:
  - Auftrag eingegangen
  - Fahrer unterwegs
  - Fahrt abgeschlossen
- Abschlussmeldung verschwindet automatisch nach 30 Sekunden
- Abholort / PLZ ist Pflicht
- Ziel und Notiz sind optional
- Auftrag wird in Supabase in `taxi_jobs` erstellt
- ESX-Name des Spielers wird automatisch als Kunde verwendet

## Voraussetzungen

Du brauchst auf dem Server:

```text
es_extended
lb-phone
lst_phone_taxi
```

Die Resource ist fuer ESX gebaut.

## Installation

### 1. Resource kopieren

Den Ordner so auf den Server legen:

```text
resources/[local]/lst_phone_taxi
```

Wichtig: Der Ordner muss wirklich genau so heissen:

```text
lst_phone_taxi
```

Nicht umbenennen, sonst funktionieren die NUI-Pfade fuer die App und das Icon nicht richtig.

## 2. Config einstellen

Oeffne:

```text
lst_phone_taxi/config.lua
```

Dort muessen deine Werte eingetragen sein:

```lua
Config.SupabaseUrl = 'https://DEIN-PROJEKT.supabase.co'
Config.SupabaseAnonKey = 'DEIN_SUPABASE_ANON_KEY'
```

Falls du den Worker nutzt:

```lua
Config.UseWorker = true
Config.WorkerUrl = 'https://dein-worker.workers.dev'
Config.WorkerSecret = 'DEIN_SECRET'
```

Wenn du direkt Supabase nutzt:

```lua
Config.UseWorker = false
```

## 3. server.cfg eintragen

In deiner `server.cfg` muss `lb-phone` vor `lst_phone_taxi` starten:

```cfg
ensure lb-phone
ensure lst_phone_taxi
```

Die Resource hat zusaetzlich in der `fxmanifest.lua`:

```lua
dependency 'lb-phone'
```

Trotzdem ist die Reihenfolge in der `server.cfg` wichtig.

## 4. Starten / Neustarten

Nach dem Einbau:

```text
refresh
restart lb-phone
restart lst_phone_taxi
```

Oder Server komplett neu starten.

Im Server-Log sollte danach stehen:

```text
[lst_phone_taxi] Taxi-Ruf App im lb-phone registriert
```

Erst wenn diese Meldung kommt, ist die App im Handy sauber registriert.

## 5. App im Handy testen

1. Ins Spiel gehen
2. lb-phone oeffnen
3. App `Taxi-Ruf` suchen
4. App oeffnen

Wenn kein Fahrer im Dienst ist, erscheint:

```text
Aktuell ist leider kein Taxifahrer im Dienst.
```

Wenn ein Fahrer im Dienst ist, erscheint das Formular.

## 6. Fahrerstatus

Damit Spieler ein Taxi rufen koennen, muss mindestens ein Fahrer in der Tabelle `taxi_driver_status` den Status haben:

```text
Im Dienst
```

Sonst wird das Formular absichtlich nicht angezeigt.

## 7. Auftrag in der Leitstelle

Wenn ein Spieler ein Taxi ruft, wird ein Eintrag in `taxi_jobs` erstellt.

Wichtige Felder:

```text
pickup_location
customer_name
customer_identifier
destination
notes
job_status
phone_status
```

Die Handy-App wertet `job_status` und `phone_status` aus, um den passenden Status anzuzeigen.

## 8. Statuslogik im Handy

Die App zeigt:

```text
Offen -> Auftrag eingegangen
Uebernommen / Unterwegs / Fahrer angekommen -> Fahrer unterwegs
Erledigt + phone_status completed -> Fahrt abgeschlossen
```

Nach 30 Sekunden wird der Abschlussstatus auf:

```text
completed_seen
```

gesetzt. Danach kann der Spieler wieder einen neuen Auftrag erstellen.

## 9. Testbefehl

Der alte Testbefehl bleibt erhalten:

```text
/taxiapp
```

Der Befehl ist nur zum Testen gedacht. Normal soll die App ueber lb-phone geoeffnet werden.

## 10. Wichtig bei Updates

Nach Aenderungen an HTML, CSS oder JS am besten immer:

```text
refresh
restart lst_phone_taxi
restart lb-phone
```

Wenn das Icon oder Design nicht aktualisiert wird, einmal FiveM komplett neu starten. lb-phone cached App-Icons und Custom-App-Dateien teilweise sehr stark.

## 11. Typische Fehler

### App ist nicht im Handy sichtbar

Pruefen:

```text
ensure lb-phone
ensure lst_phone_taxi
```

`lst_phone_taxi` muss nach `lb-phone` starten.

### App-Icon bleibt weiss

Pruefen, ob diese Datei existiert:

```text
lst_phone_taxi/html/icon.png
```

Und ob sie in der `fxmanifest.lua` bei `files` eingetragen ist:

```lua
'html/icon.png'
```

Danach:

```text
refresh
restart lst_phone_taxi
restart lb-phone
```

### Formular wird nicht angezeigt

Dann ist wahrscheinlich kein Fahrer `Im Dienst`.

Pruefe die Tabelle:

```text
taxi_driver_status
```

### Auftrag kommt nicht in der Leitstelle an

Pruefen:

- Supabase URL korrekt?
- Supabase Key korrekt?
- Worker URL korrekt?
- Worker Secret korrekt?
- Tabelle `taxi_jobs` vorhanden?
- Server-Konsole auf Fehler pruefen

## 12. Empfohlene Startreihenfolge

Beispiel:

```cfg
ensure es_extended
ensure lb-phone
ensure lst_phone_taxi
```

Falls du andere Abhaengigkeiten hast, bleiben die wie gewohnt davor.

## Fertig

Wenn alles passt, hast du im lb-phone eine feste App:

```text
Taxi-Ruf
```

Damit koennen Spieler direkt ueber das Handy ein Taxi rufen.
