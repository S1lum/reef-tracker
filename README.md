# 🐠 Reef Tracker

Eine Progressive Web App (PWA) zur Überwachung und Auswertung von Meerwasseraquarien. Entwickelt für den täglichen Einsatz auf dem Smartphone — installierbar, offline-fähig und mit Cloud-Sync via Firebase.

---

## Features

### Messtabellen & Log
- Manuelle Eingabe aller relevanten Wasserparameter
- ICP-Analyse-Import (Eingabe als eigener Messtyp)
- Focustronic-Import (Cloud-Integration, erfordert Blaze-Plan)
- Hanna PO₄ Checker Umrechner (ppb → ppm, mit Referenztabelle 1–200 ppb)
- Notizfeld pro Messung

### Parameter-Gruppen
| Gruppe | Parameter |
|---|---|
| Core | Salinität, Temperatur, KH, pH |
| Makroelemente | Ca, Mg, Na, K, Sr, B, Br, F, I |
| Nährstoffe | NO₃, NO₂, PO₄, SiO₂ |
| Dynamische Elemente | Zn, V, Cu, Ni, Mo |
| Spurenelemente | Ba, Co, Cr, Fe, Li, Mn, Se |
| Schadstoffe | Al, Sn, Sb, As, Be, Pb, Cd, La, Hg, Ag, Ti, W, Zr |

### Kalibrierung
- Offset-Kalibrierung pro ICP-Analyse: Differenz zwischen ICP-Wert und eigener Messung als Offset
- Rohmesswerte bleiben immer erhalten — Offset wird nur zur Anzeige addiert
- Offset-Toggle pro Messung (ein/aus)
- Zeitabhängige Kalibrierung: jede manuelle Messung verwendet den Offset der letzten vorausgegangenen ICP
- Kalibrierungs-Indikator ⚖️ auf Gauges und in Charts

### Charts
- Interaktive Zeitverlauf-Diagramme pro Parametergruppe
- Kalibrierte Messpunkte als Dreiecke ▲ in Cyan
- ICP-Werte als Rauten ◆

### Stats
- Ampel-Bewertung aller Parameter (Zielbereich)
- Min / Max / Durchschnitt

### Inhabitants
- Fische, Korallen, Wirbellose erfassen
- Emoji, Artname, Hinzufügedatum, Notizen

### Reminders
- Einmalige oder wiederkehrende Erinnerungen
- Tankbezogen oder allgemein
- Push-Benachrichtigungen (iOS: nur wenn als App installiert)

### Tools (Dropdown)
- **💊 Dosing Journal** — tägliche Dosierungen dokumentieren
- **🧂 Salt Calculator** — Wasserwechsel-Berechnung
- **⚗️ Balling Light** — Drei-Komponenten-Berechnung (Ca, Alk, Mg)

### Mehrere Becken
- Unbegrenzte Becken, Farbkodierung pro Becken

---

## Datenspeicherung

| Speicherort | Verwendung |
|---|---|
| Google Firestore | Primär — Echtzeit-Sync zwischen Geräten |
| localStorage | Sofort-Cache beim App-Start |
| JSON Export/Import | Backup über das Avatar-Menü |

---

## Installation als iPhone App

1. Seite in **Safari** öffnen
2. Teilen-Button → „Zum Home-Bildschirm"
3. Name bestätigen → „Hinzufügen"

---

## Stack

| Bibliothek | Version | Verwendung |
|---|---|---|
| Chart.js | 4.4.1 | Diagramme |
| PDF.js | 3.11.174 | Focustronic PDF-Import |
| Firebase | 10.12.0 | Auth + Firestore |
| Google Fonts | — | Outfit |

Kein Framework — reines HTML / CSS / JavaScript.

---

## Deployment

```bash
firebase deploy
```

- Firestore-Pfad: `users/{uid}/data/state`
- Firebase-Projekt: `reef-tracker-21935`
- Region: `europe-west1`

---

## Bekannte Einschränkungen

- Focustronic Cloud Function erfordert Firebase Blaze Plan
- iOS Push-Benachrichtigungen bei gesperrtem Display erfordern Apple Developer Account + APNs
