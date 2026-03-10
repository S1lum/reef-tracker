# 🐠 Reef Tracker

A mobile-first reef aquarium water parameter tracking app — built as a single HTML file with Firebase sync, push notifications, and PWA support.

**Live:** [s1lum.github.io/reef-tracker](https://s1lum.github.io/reef-tracker/)

---

## ✨ Features

### 📋 Log
- Add manual water parameter measurements with date & time
- Edit and delete existing measurements
- Measurements grouped by month with visual gauge circles
- Color-coded status indicators (green / yellow / red) based on reference ranges
- ICP badge for automated ICP imports
- Note field per measurement

### 📈 Charts
- Time-series line charts per tank and parameter
- ICP measurements shown as teal ◆ diamond markers
- Dashed reference range lines (min/max)
- Parameter selector pills — only shows parameters that have data
- Automatically switches to the active tank

### 🧂 Salt Calculator
- **Salt Calculator** — Tropic Marin formula: how much salt to add to reach a target salinity
  - Also calculates freshwater to add when salinity is too high
- **Water Change Calculator** — volume needed to reach target parameters
- **Refractometer Correction** — converts freshwater-calibrated readings to seawater PSU

### ⚗️ Balling Light Calculator
- Based on Fauna Marin Balling Light dosing rates
- Calculates ml of each solution needed for a one-time correction:
  - 🟠 Solution 1 — Calcium: 10 ml/100L → +11 mg/L
  - 🩷 Solution 2 — Magnesium: 10 ml/100L → +5 mg/L
  - 🟣 Solution 3 — Alkalinity (KH): 10 ml/100L → +0.5 dKH
- Pre-fills current values from the latest measurement of the active tank
- Warns if a value is already above target (recommends water change)
- Supports liters and gallons

### 🔔 Reminders
- Create reminders for water changes, ICP tests, dosing checks etc.
- Title, note, due date & time, repeat interval, tank assignment
- Repeat options: daily / weekly / every 2 weeks / monthly — auto-reschedules on completion
- Color-coded badges: 🔴 overdue / 🟡 due soon / 🟢 on track
- ✓ Done, ✏️ Edit, ⏰ Snooze (+1h), 🗑️ Delete
- **Push notifications** via Service Worker — fires even when browser tab is closed
  - Action buttons directly in the notification: ✓ Done and ⏰ +1h snooze
- Synced to Firebase — available across all devices

### 🧬 ICP Import
- Upload Fauna Marin REEF ICP TOTAL PDF reports
- Automatically parses 40+ parameters including all trace elements and heavy metals
- Matched by reference ranges — robust against PDF formatting differences
- Sample date extracted from the PDF and used as measurement date

---

## 📊 Tracked Parameters

| Category | Parameters |
|---|---|
| **Core** | Salinity, Temperature, KH, pH |
| **Macros** | Ca, Mg, Na, K, Sr, B, Br, F, I |
| **Nutrients** | NO₃, NO₂, PO₄, SiO₂ |
| **Trace elements** | Zn, V, Cu, Ni, Mo, Ba, Fe, Li, Co, Cr, Mn, Se, Al |
| **Heavy metals** | Sn, Sb, As, Pb, Cd, La, Hg, Ag, Ti, W, Zr, Be |

All parameters have reference ranges based on Fauna Marin ICP standards.

---

## 🗂️ Files

```
reef-tracker/
├── index.html   — entire app (HTML + CSS + JS, single file)
└── sw.js        — Service Worker for background push notifications
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Charts | Chart.js 4.4.1 |
| PDF parsing | PDF.js 3.11.174 |
| Auth & Sync | Firebase 10.12.0 (Auth + Firestore, Compat SDK) |
| Notifications | Web Notifications API + Service Worker |
| Fonts | Google Fonts — Outfit |
| Hosting | GitHub Pages |

No build step. No framework. No npm. Just two files.

---

## ☁️ Firebase Setup

The app uses Firebase for Google login and Firestore real-time sync. The project is `reef-tracker-21935`.

**Firestore data structure:**
```
users/
  {uid}/
    data/
      state         ← { tanks: [...], activeTank: "...", reminders: [...] }
```

To use your own Firebase project:
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google** sign-in
3. Enable **Firestore Database**
4. Replace the `FIREBASE_CONFIG` object in `index.html` with your own config

---

## 📲 PWA — Install on iPhone

1. Open the app in **Safari** (Chrome does not support PWA installation on iOS)
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. The app opens fullscreen like a native app

> Push notifications on iOS require the app to be installed as a PWA (iOS 16.4+).

---

## 🔔 Push Notifications

Notifications are handled by `sw.js` (Service Worker):

- The app registers the SW on first load
- When a reminder is saved, all reminders are sent to the SW via `postMessage`
- The SW schedules `setTimeout` timers and fires `showNotification` at the right time
- **Works when the browser tab is closed** (Android Chrome, iOS Safari PWA)
- Notification action buttons (Done / Snooze) send messages back to the app

> **Limitation:** Service Workers are unloaded by the browser after inactivity. For reminders more than ~30 days out, the SW may have been unloaded. The app reschedules all reminders on every startup to compensate.

---

## 💾 Data & Privacy

- All aquarium data is stored in **your personal Firebase account** under your Google UID
- No data is shared or visible to anyone else
- Reminders are stored as part of the main state in Firestore — synced across all logged-in devices
- A localStorage copy is always kept as a fallback / offline cache

---

## 🛠️ Development

Everything lives in `index.html`. There is no build process.

**To run locally:**
```bash
# Any static file server works — e.g.:
npx serve .
# or
python3 -m http.server 8080
```

> Service Workers require HTTPS or `localhost`. Opening `index.html` as a `file://` URL will not register the SW.

**Version history** is tracked in the HTML comment on line 2:
```html
<!-- reef-tracker v5.2 -->
```

---

## 🐠 Credits

- ICP reference ranges based on [Fauna Marin REEF ICP](https://www.faunamarin.de)
- Balling Light dosing rates from [lab.faunamarin.de](https://lab.faunamarin.de/de/calc-balling-light)
- Salt formula verified against [Tropic Marin](https://www.tropic-marin.com)
