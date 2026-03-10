// ── Reef Tracker Service Worker v2.0 ──────────────────────────
// Strategy: Store reminders in IndexedDB, check every minute via
// a self-sustaining setInterval. This keeps the SW alive and fires
// notifications reliably even when the app tab is closed.

const DB_NAME   = 'reef-sw-db';
const DB_STORE  = 'reminders';
const CHECK_MS  = 60 * 1000; // check every 60 seconds
const FIRED_KEY = 'reef-fired'; // prefix for fired tracking

var checkInterval = null;

// ── Install / Activate ────────────────────────────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    self.clients.claim().then(function() {
      startChecking();
    })
  );
});

// ── Keep SW alive + check reminders ──────────────────────────
function startChecking() {
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkReminders, CHECK_MS);
  checkReminders(); // also check immediately on activation
}

function checkReminders() {
  openDB().then(function(db) {
    getAllReminders(db).then(function(reminders) {
      var now = Date.now();
      reminders.forEach(function(r) {
        if (r.done) return;
        // Fire if due within the last 60s (to catch missed minute boundaries)
        if (r.dueTs <= now && r.dueTs > now - CHECK_MS) {
          fireNotification(r);
        }
      });
    });
  }).catch(function(){});
}

// ── Messages from the app ────────────────────────────────────
self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_REMINDERS') {
    openDB().then(function(db) {
      setAllReminders(db, e.data.reminders || []).then(function() {
        // Confirm back to app
        if (e.source) e.source.postMessage({ type: 'SW_READY' });
        // Start checking loop if not already running
        startChecking();
      });
    });
  }

  if (e.data.type === 'PING') {
    if (e.source) e.source.postMessage({ type: 'PONG' });
  }
});

// ── Fire notification ─────────────────────────────────────────
function fireNotification(r) {
  var tankLabel = r.tankName ? ' · ' + r.tankName : '';
  var body = (r.note ? r.note : 'Time to take care of your reef! 🪸') + tankLabel;

  self.registration.showNotification('🐠 ' + r.title, {
    body: body,
    icon: self.registration.scope + 'icon-192.png',
    tag: 'reef-reminder-' + r.id,
    data: { reminderId: r.id, url: self.registration.scope },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'done',   title: '✓ Done'  },
      { action: 'snooze', title: '⏰ +1h'  }
    ]
  });
}

// ── Notification click / action ───────────────────────────────
self.addEventListener('notificationclick', function(e) {
  var remId = e.notification.data && e.notification.data.reminderId;
  e.notification.close();

  if (e.action === 'done' && remId) {
    // Mark done in IndexedDB and notify open tabs
    openDB().then(function(db) {
      getReminder(db, remId).then(function(r) {
        if (!r) return;
        r.done = true;
        putReminder(db, r);
      });
    });
    notifyClients({ type: 'REMINDER_DONE', id: remId });
    return;
  }

  if (e.action === 'snooze' && remId) {
    var snoozeTs = Date.now() + 60 * 60 * 1000; // +1 hour
    openDB().then(function(db) {
      getReminder(db, remId).then(function(r) {
        if (!r) return;
        r.dueTs = snoozeTs;
        r.done  = false;
        putReminder(db, r);
      });
    });
    notifyClients({ type: 'REMINDER_SNOOZE', id: remId, minutes: 60 });
    return;
  }

  // Default: focus or open app
  var scopeUrl = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.startsWith(self.registration.scope)) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(scopeUrl);
    })
  );
});

function notifyClients(msg) {
  self.clients.matchAll({ type: 'window' }).then(function(clients) {
    clients.forEach(function(c) { c.postMessage(msg); });
  });
}

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

function getAllReminders(db) {
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(DB_STORE, 'readonly');
    var req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = function() { resolve(req.result || []); };
    req.onerror   = function() { reject(req.error); };
  });
}

function getReminder(db, id) {
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(DB_STORE, 'readonly');
    var req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror   = function() { reject(req.error); };
  });
}

function putReminder(db, r) {
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(DB_STORE, 'readwrite');
    var req = tx.objectStore(DB_STORE).put(r);
    req.onsuccess = function() { resolve(); };
    req.onerror   = function() { reject(req.error); };
  });
}

function setAllReminders(db, reminders) {
  return new Promise(function(resolve, reject) {
    var tx    = db.transaction(DB_STORE, 'readwrite');
    var store = tx.objectStore(DB_STORE);
    // Clear old, then write all
    var clearReq = store.clear();
    clearReq.onsuccess = function() {
      var pending = reminders.length;
      if (!pending) { resolve(); return; }
      reminders.forEach(function(r) {
        var putReq = store.put(r);
        putReq.onsuccess = function() { if (--pending === 0) resolve(); };
        putReq.onerror   = function() { if (--pending === 0) resolve(); };
      });
    };
    clearReq.onerror = function() { reject(clearReq.error); };
  });
}
