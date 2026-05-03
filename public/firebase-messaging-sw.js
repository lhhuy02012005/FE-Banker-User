importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBECwFRaG0Yh4KgFc6cRUlny5Q5tzgokqw",
  authDomain: "banker-16f7a.firebaseapp.com",
  projectId: "banker-16f7a",
  storageBucket: "banker-16f7a.firebasestorage.app",
  messagingSenderId: "93848022195",
  appId: "1:93848022195:web:ca4bc86c77cfd2f3a1d4c6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || 'NeoBank';
  const body = payload.notification?.body || payload.data?.body || 'You have a new notification.';

  const notificationOptions = {
    body,
    data: payload.data || {},
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification?.data?.clickAction || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return Promise.resolve();
    })
  );
});