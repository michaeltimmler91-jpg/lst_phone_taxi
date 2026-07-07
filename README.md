# lst_phone_taxi - Taxi-Ruf für lb-phone

## Was ist neu?

- `/taxiapp` bleibt als Testbefehl erhalten.
- Die App kann jetzt als echte lb-phone Custom App eingebunden werden.
- App-Name im Handy: `Taxi-Ruf`
- Formular erscheint nur, wenn mindestens ein Fahrer `Im Dienst` ist.
- Kein Fahrer im Dienst: `Aktuell ist leider kein Taxifahrer im Dienst.`
- Abholort / PLZ ist Pflicht.
- Ziel und Notiz sind optional.
- ESX-Charaktername wird automatisch verwendet.
- Cooldown: 10 Minuten.
- Auftrag wird direkt in Supabase `taxi_jobs` erstellt.

## Installation Resource

1. Ordner `lst_phone_taxi` nach `resources/[local]/lst_phone_taxi` kopieren.
2. In `server.cfg` sicherstellen:

```cfg
ensure lst_phone_taxi
ensure lb-phone
```

Wichtig: `lst_phone_taxi` sollte vor `lb-phone` starten.

## lb-phone App einbinden

Die Datei:

```text
lst_phone_taxi/lb-phone-config/zz_taxi_ruf.lua
```

kopierst du nach:

```text
lb-phone/config/zz_taxi_ruf.lua
```

Nicht in die große `config.lua` reinkopieren. Einfach als extra Datei in den `config`-Ordner legen.

Danach:

```text
restart lst_phone_taxi
restart lb-phone
```

Dann sollte im Handy die App `Taxi-Ruf` auftauchen.

## Test

Falls die Handy-App nicht sichtbar ist, erst testen:

```text
/taxiapp
```

Wenn `/taxiapp` funktioniert, aber die Handy-App nicht auftaucht, liegt es nur an der lb-phone-Custom-App-Einbindung.
