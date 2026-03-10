// ── Reef Tracker Service Worker v1.0 ──────────────────────────
const CACHE_NAME = 'reef-tracker-v1';
const REMINDER_ALARM_KEY = 'reef_reminders_v1';

// ── Install & Cache ───────────────────────────────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// ── Push Notifications (from server, if ever needed) ──────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'Reef Tracker', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || '🐠 Reef Tracker', {
      body: data.body || '',
      icon: data.icon || '/reef-tracker/icon-192.png',
      badge: data.badge || '/reef-tracker/icon-192.png',
      tag: data.tag || 'reef-push',
      data: data.url ? { url: data.url } : {},
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.startsWith(self.registration.scope)) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Background Reminder Checking (via postMessage) ────────────
// The app sends reminders to the SW; the SW fires notifications
// even when the browser tab is closed (on supported platforms).

self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_REMINDERS') {
    var reminders = e.data.reminders || [];
    scheduleAll(reminders);
  }

  if (e.data.type === 'CANCEL_REMINDER') {
    cancelAlarm(e.data.id);
  }

  if (e.data.type === 'PING') {
    e.source.postMessage({ type: 'PONG' });
  }
});

// ── Alarm store (in-memory, SW stays alive via periodic timer) ─
var alarms = {}; // id -> timeoutId

function scheduleAll(reminders) {
  // Clear old alarms
  Object.keys(alarms).forEach(function(id) {
    clearTimeout(alarms[id]);
    delete alarms[id];
  });

  var now = Date.now();
  reminders.forEach(function(r) {
    if (r.done) return;
    var delay = r.dueTs - now;
    if (delay < 0) {
      // Already overdue — fire immediately (once)
      fireNotification(r);
      return;
    }
    // setTimeout has ~24.8 day max — for longer, skip (app will reschedule on next open)
    if (delay > 2147483647) return;
    alarms[r.id] = setTimeout(function() {
      fireNotification(r);
      delete alarms[r.id];
    }, delay);
  });
}

function cancelAlarm(id) {
  if (alarms[id]) {
    clearTimeout(alarms[id]);
    delete alarms[id];
  }
}

function fireNotification(r) {
  var tankLabel = r.tankName ? ' · ' + r.tankName : '';
  self.registration.showNotification('🐠 ' + r.title, {
    body: (r.note || 'Time to take care of your reef! 🪸') + tankLabel,
    icon: self.registration.scope + 'icon-192.png',
    badge: self.registration.scope + 'icon-192.png',
    tag: 'reef-reminder-' + r.id,
    data: { reminderId: r.id, url: self.registration.scope },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'done',  title: '✓ Done' },
      { action: 'snooze', title: '⏰ +1h' }
    ]
  });
}

// ── Notification action buttons ───────────────────────────────
self.addEventListener('notificationclose', function(e) {});

self.addEventListener('notificationclick', function(e) {
  var remId = e.notification.data && e.notification.data.reminderId;
  e.notification.close();

  if (e.action === 'done' && remId) {
    // Tell all open clients to mark as done
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'REMINDER_DONE', id: remId }); });
    });
    return;
  }

  if (e.action === 'snooze' && remId) {
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'REMINDER_SNOOZE', id: remId, minutes: 60 }); });
    });
    return;
  }

  // Default: open / focus app
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
