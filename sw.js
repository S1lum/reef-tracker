// ── Reef Tracker Service Worker v3.0 ──────────────────────────
// Reliable strategy:
// 1. Store reminders in IndexedDB
// 2. Use a periodic self-fetch every 55s to keep SW alive
// 3. On each wake, check if any reminder is due and fire it

const DB_NAME  = 'reef-sw-db';
const DB_STORE = 'reminders';
const KEEP_ALIVE_URL = '?sw-keepalive';
const CHECK_INTERVAL = 55 * 1000;

// ── Install / Activate ────────────────────────────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// ── FCM Push handler ──────────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) {
    data = { notification: { title: '🐠 Reef Tracker', body: e.data ? e.data.text() : '' } };
  }
  var n = data.notification || {};
  var d = data.data || {};
  e.waitUntil(
    self.registration.showNotification(n.title || '🐠 Reef Tracker', {
      body: n.body || '',
      icon: self.registration.scope + 'icon-192.png',
      tag: d.reminderId ? 'reef-reminder-' + d.reminderId : 'reef-fcm',
      data: d,
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      actions: d.reminderId ? [
        { action: 'done',   title: '✓ Done' },
        { action: 'snooze', title: '⏰ +1h' }
      ] : []
    })
  );
});

// ── Keep-alive fetch handler ──────────────────────────────────
self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('sw-keepalive')) {
    e.respondWith(new Response('ok'));
    checkReminders(); // use each keep-alive ping to check reminders
  }
});

// ── Messages from app ─────────────────────────────────────────
self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_REMINDERS') {
    openDB().then(function(db) {
      setAllReminders(db, e.data.reminders || []).then(function() {
        startKeepAlive();
        checkReminders();
      });
    });
  }
  if (e.data.type === 'PING') {
    if (e.source) e.source.postMessage({ type: 'PONG' });
  }
});

// ── Keep-alive: periodic self-fetch to prevent SW termination ─
var keepAliveTimer = null;
function startKeepAlive() {
  if (keepAliveTimer) return; // already running
  keepAliveTimer = setInterval(function() {
    fetch(self.registration.scope + KEEP_ALIVE_URL).catch(function(){});
  }, CHECK_INTERVAL);
}

// ── Check reminders ───────────────────────────────────────────
var firedRecently = {}; // id -> timestamp, prevent double-fire

function checkReminders() {
  var now = Date.now();
  openDB().then(function(db) {
    getAllReminders(db).then(function(reminders) {
      reminders.forEach(function(r) {
        if (r.done) return;
        var overdue = now - r.dueTs;
        // Fire if due within the last CHECK_INTERVAL window
        if (overdue >= 0 && overdue < CHECK_INTERVAL + 5000) {
          // Prevent double-fire within 5 minutes
          if (firedRecently[r.id] && (now - firedRecently[r.id]) < 5 * 60 * 1000) return;
          firedRecently[r.id] = now;
          fireNotification(r);
        }
      });
    });
  }).catch(function(){});
}

// ── Fire notification ─────────────────────────────────────────
function fireNotification(r) {
  var tankLabel = r.tankName ? ' · ' + r.tankName : '';
  var body = (r.note || 'Time to take care of your reef! 🪸') + tankLabel;
  return self.registration.showNotification('🐠 ' + r.title, {
    body: body,
    icon: self.registration.scope + 'icon-192.png',
    tag: 'reef-reminder-' + r.id,
    data: { reminderId: r.id, url: self.registration.scope },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'done',   title: '✓ Done' },
      { action: 'snooze', title: '⏰ +1h' }
    ]
  });
}

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  var remId = e.notification.data && e.notification.data.reminderId;
  e.notification.close();

  if (e.action === 'done' && remId) {
    openDB().then(function(db) {
      getReminder(db, remId).then(function(r) {
        if (r) { r.done = true; putReminder(db, r); }
      });
    });
    notifyClients({ type: 'REMINDER_DONE', id: remId });
    return;
  }

  if (e.action === 'snooze' && remId) {
    var newTs = Date.now() + 60 * 60 * 1000;
    openDB().then(function(db) {
      getReminder(db, remId).then(function(r) {
        if (r) { r.dueTs = newTs; r.done = false; putReminder(db, r); }
      });
    });
    notifyClients({ type: 'REMINDER_SNOOZE', id: remId, minutes: 60 });
    return;
  }

  // Open / focus app
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.startsWith(self.registration.scope)) return clients[i].focus();
      }
      return self.clients.openWindow(url);
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
    var clearReq = store.clear();
    clearReq.onsuccess = function() {
      if (!reminders.length) { resolve(); return; }
      var pending = reminders.length;
      reminders.forEach(function(r) {
        var req = store.put(r);
        req.onsuccess = req.onerror = function() { if (--pending === 0) resolve(); };
      });
    };
    clearReq.onerror = function() { reject(clearReq.error); };
  });
}
