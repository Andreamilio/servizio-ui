// Service Worker per gestire notifiche push
// Necessario per ricevere notifiche anche con app chiusa (su iOS richiede PWA installata)

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event ricevuto', event);
  
  let data = { title: 'Notifica', body: '' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[Service Worker] Errore parsing dati push:', e);
    if (event.data) {
      data = {
        title: 'Notifica',
        body: event.data.text() || 'Nuova notifica'
      };
    }
  }

  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notifica', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Click su notifica', event);
  event.notification.close();
  
  // Apri/porta in focus l'app se possibile
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

