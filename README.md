# lst_phone_taxi

Taxi-Ruf-App fuer FiveM / ESX mit lb-phone.

Die App wird fest im lb-phone angezeigt. Spieler koennen darueber ein Taxi rufen. Der Auftrag wird an dein Taxi-System uebergeben.

## Voraussetzungen

```text
es_extended
lb-phone
lst_phone_taxi
```

## Installation

Den Ordner nach `resources/[local]/lst_phone_taxi` kopieren.

## server.cfg

```cfg
ensure es_extended
ensure lb-phone
ensure lst_phone_taxi
```

## Starten

```text
refresh
restart lb-phone
restart lst_phone_taxi
```

Oder den Server komplett neu starten.

## Testen

1. lb-phone öffnen
2. App **Taxi-Ruf** starten
3. Einen Fahrer auf **Im Dienst** setzen
4. Taxi rufen

## Testbefehl

```text
/taxiapp
```

## Fertig

Die benötigten Supabase- und Worker-Daten sind bereits in der Resource hinterlegt. Es ist keine Konfiguration erforderlich.