// =====================================================
// GymBro PWA - Push Notification Service (FCM)
// Handles permission requests, token registration, and
// foreground message handling
// =====================================================

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseApp, db } from '../config/firebase';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        return null;
    }

    const scope = '/firebase-cloud-messaging-push-scope';
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing) {
        return existing;
    }

    try {
        return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope });
    } catch (error) {
        console.warn('Unable to register firebase-messaging-sw.js:', error);
        return null;
    }
}

/**
 * Check if FCM is supported in this browser
 */
export async function isFCMSupported(): Promise<boolean> {
    try {
        return await isSupported();
    } catch {
        return false;
    }
}

/**
 * Get or initialize the messaging instance
 */
async function getMessagingInstance() {
    if (messagingInstance) return messagingInstance;

    const supported = await isFCMSupported();
    if (!supported) {
        console.warn('Firebase Messaging is not supported in this browser');
        return null;
    }

    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
}

/**
 * Request notification permission and register FCM token
 * Returns the token if successful, null otherwise
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        // Request browser notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            debugLog('Notification permission denied');
            return null;
        }

        // Get VAPID key from env
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn('VITE_FIREBASE_VAPID_KEY not set - push notifications disabled');
            return null;
        }

        // Get FCM token
        const swRegistration = await ensureMessagingServiceWorker();
        if (!swRegistration) {
            return null;
        }

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
        });

        if (token) {
            // Store token in Firestore
            await saveFCMToken(userId, token);
            debugLog('FCM token registered successfully');
            return token;
        }

        return null;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

/**
 * Save FCM token to Firestore for this user
 */
async function saveFCMToken(userId: string, token: string): Promise<void> {
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', token);
    await setDoc(tokenRef, {
        token,
        createdAt: new Date().toISOString(),
        platform: 'web',
        userAgent: navigator.userAgent,
    });
}

/**
 * Listen for foreground messages (when app is open)
 * Returns unsubscribe function
 */
export async function onForegroundMessage(
    callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): Promise<(() => void) | null> {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
        debugLog('Foreground message received:', payload);
        callback({
            title: payload.notification?.title || 'GymBro',
            body: payload.notification?.body || '',
            data: payload.data as Record<string, string> | undefined,
        });
    });

    return unsubscribe;
}


