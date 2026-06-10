const CACHE_NAME = 'rentmaster-pro-v2.0.6';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/notifications.js',
  '/manifest.json',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/lucide@latest',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll failed, some resources may not be available:', error);
          return Promise.resolve();
        });
      })
  );
});

// Fetch event - network-first for navigation and app shell, cache-first for other assets
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const isNavigate = request.mode === 'navigate';
  const isAppShell = url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/js/app.js';

  if (isNavigate || isAppShell) {
    event.respondWith(
      fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match(request).then(response => response || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || request.method !== 'GET') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        return networkResponse;
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'RentMaster Pro',
    body: 'You have a new notification',
    icon: '/assets/icon-192x192.png',
    badge: '/assets/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: notificationData.vibrate,
    data: notificationData.data,
    requireInteraction: true,
    tag: 'rentmaster-notification'
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if a window is already open
      for (const client of clientList) {
        if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
