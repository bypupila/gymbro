// =====================================================
// GymBro PWA - Firebase Cloud Messaging Service Worker
// Handles push notifications in background
// =====================================================

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config - these values are public and safe to include in SW
// They will be replaced at build time or you can hardcode them
firebase.initializeApp({
    apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
    authDomain: self.__FIREBASE_CONFIG__?.authDomain || '',
    projectId: self.__FIREBASE_CONFIG__?.projectId || '',
    storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || '',
    messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
    appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'GymBro';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificacion',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: payload.data?.type || 'default',
        data: payload.data,
        actions: [],
        vibrate: [200, 100, 200],
    };

    // Add custom actions for training invitations
    if (payload.data?.type === 'training_invitation') {
        notificationOptions.actions = [
            { action: 'accept', title: 'Aceptar' },
            { action: 'decline', title: 'Rechazar' },
        ];
        notificationOptions.tag = 'training-invitation';
        notificationOptions.requireInteraction = true;
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;

    if (event.action === 'accept' && data?.invitationId) {
        // Open the app and pass the acceptance info
        event.waitUntil(
            clients.openWindow(`/?acceptInvitation=${data.invitationId}`)
        );
    } else if (event.action === 'decline' && data?.invitationId) {
        // Just close - the invitation will expire or user can decline in-app
        return;
    } else {
        // Default: open the app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow('/');
            })
        );
    }
});
