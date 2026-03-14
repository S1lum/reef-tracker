# 🐠 Reef Tracker v10.19

A Progressive Web App (PWA) for monitoring and analysing marine reef aquariums. Built for daily use on your phone — installable, offline-capable, and with real-time cloud sync via Firebase.

👉 **[Open App](https://s1lum.github.io/reef-tracker/)**  
👉 **[Open Demo (no login)](https://s1lum.github.io/reef-tracker-demo/)**

---

## Features

### 📋 Log
- Manual entry of all relevant water parameters
- ICP analysis import (stored as a dedicated measurement type)
- Focustronic import (Cloud Function, requires Firebase Blaze plan)
- Hanna PO₄ checker converter (ppb → ppm, reference table 1–200 ppb)
- Notes field per measurement
- Month navigation with all-months toggle
- Parameter filter pills and search

### 📊 Parameter Groups

| Group | Parameters |
|---|---|
| Core | Salinity, Temperature, Alkalinity (KH), pH |
| Macro elements | Ca, Mg, Na, K, Sr, B, Br, F, I |
| Nutrients | NO₃, NO₂, PO₄, SiO₂ |
| Dynamic elements | Zn, V, Cu, Ni, Mo |
| Trace elements | Ba, Co, Cr, Fe, Li, Mn, Se |
| Pollutants | Al, Sn, Sb, As, Be, Pb, Cd, La, Hg, Ag, Ti, W, Zr |

### ⚖️ Calibration
- Per-ICP offset calibration: difference between ICP value and own measurement stored as offset
- Raw measurement values always preserved — offset applied only for display
- Per-measurement offset toggle (on/off)
- Time-based calibration: each manual measurement uses the offset from the most recent preceding ICP
- Calibration indicator ⚖️ on gauges and in charts

### 📈 Charts
- Interactive time-series charts per parameter group
- Calibrated data points shown as triangles ▲ in cyan
- ICP values shown as diamonds ◆
- Dynamic Y-axis range with green target band

### 📊 Stats
- **Overview widget** at the top: tank summary, status banner, 8 key parameters with trend arrows (↑↓→), recent dosing, upcoming reminders
- Traffic-light rating for all parameters against reference ranges
- Min / Max / Average per parameter
- Sparklines for the last 30 days

### 🐠 Inhabitants
- Log fish, corals, and invertebrates
- Emoji, species name, date added, notes

### 🔔 Reminders
- One-time or recurring reminders (daily / weekly / every 2 weeks / monthly)
- Tank-specific or general
- Push notifications (iOS: requires app to be installed)

### 🧰 Tools (dropdown)

| Tool | Description |
|---|---|
| 💊 Dosing Journal | Log daily dosing with product, amount, and chart |
| 🧂 Salt Calculator | Calculate salt for water changes and salinity correction |
| ⚗️ Balling Light | Three-part dosing calculator (Ca, Alk, Mg) based on Fauna Marin rates |
| 🧪 Trace Dosing | Reef Zlements Advanced Traces — 14 elements, dose history, time-series chart per element |

### 🌙 Dark / Light Mode
- Toggle between dark and light theme via the ☀️ button in the header
- Preference saved persistently

### Multiple Tanks
- Unlimited tanks with colour coding
- All views switch per tank

---

## Data Storage

| Location | Use |
|---|---|
| Google Firestore | Primary — real-time sync across devices |
| localStorage | Instant cache on app start |
| JSON export / import | Manual backup via the avatar menu |

---

## Install as iPhone App

1. Open in **Safari**
2. Tap Share → "Add to Home Screen"
3. Confirm → "Add"

---

## Stack

| Library | Version | Purpose |
|---|---|---|
| Chart.js | 4.4.1 | Charts |
| PDF.js | 3.11.174 | Focustronic PDF import |
| Firebase | 10.12.0 | Auth + Firestore |
| Google Fonts | — | Outfit |

No framework — plain HTML / CSS / JavaScript.

---

## Deployment

```bash
firebase deploy
```

- Firestore path: `users/{uid}/data/state`
- Firebase project: `reef-tracker-21935`
- Region: `europe-west1`

---

## Known Limitations

- Focustronic Cloud Function requires Firebase Blaze plan
- iOS push notifications on locked screen require Apple Developer Account + APNs
