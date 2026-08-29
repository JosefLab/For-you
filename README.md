# Mini-Website 

## Starten
Einfach `index.html` im Browser öffnen.

Am zuverlässigsten testest du sie später über GitHub Pages, weil manche Smartphone-Browser lokale Dateien etwas eingeschränkt behandeln.

## Was bereits funktioniert
- romantisch-neutrales, mobiles Design
- Name „Biljana“ mit Herz über dem i
- mehrere Seiten / Fragen
- flüchtende, nicht wählbare Buttons
- gesperrte Antworten mit sarkastischen Meldungen
- automatische Änderung von „Man kann ihn aushalten“ zu „Schon ziemlich toll ❤️“
- Freitextfeld bei „Ich hätte da schon eine Idee …“
- Abschlussseite
- Ereignisprotokoll technisch vorbereitet

## Protokoll im Testmodus
Aktuell werden alle Ereignisse nur lokal im Browser gespeichert:
- Seitenaufrufe
- gewählte Antworten
- Versuche auf gesperrte/flüchtende Buttons
- Freitext
- Abschluss

Das geschieht über `localStorage` unter dem Schlüssel:

`biljana-events`

Jede Sitzung erhält eine zufällige Session-ID.

## Online-Protokoll
In `script.js` gibt es:

`const LOG_ENDPOINT = "";`

Sobald wir einen kleinen kostenlosen/ günstigen Logging-Endpunkt eingerichtet haben, tragen wir dort die URL ein. Dann werden die Events zusätzlich online gespeichert und du kannst sie von deinem Gerät aus ansehen.

Wichtig: GitHub Pages selbst kann keine Antworten speichern.


## Version 2
- Nach Auswahl von „Ich hätte da schon eine Idee …“ werden die anderen Antwortmöglichkeiten sofort deaktiviert.
