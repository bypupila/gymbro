// =====================================================
// GymBro PWA - Push Notification Service (FCM)
// Handles permission requests, token registration, and
// foreground message handling
// =====================================================

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { firebaseApp, db } from '../config/firebase';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

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
            console.log('Notification permission denied');
            return null;
        }

        // Get VAPID key from env
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn('VITE_FIREBASE_VAPID_KEY not set - push notifications disabled');
            return null;
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
        });

        if (token) {
            // Store token in Firestore
            await saveFCMToken(userId, token);
            console.log('FCM token registered successfully');
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
 * Remove FCM token from Firestore (on logout)
 */
export async function removeFCMToken(userId: string, token: string): Promise<void> {
    try {
        const tokenRef = doc(db, 'users', userId, 'fcmTokens', token);
        await deleteDoc(tokenRef);
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
}

/**
 * Get a user's FCM tokens (for sending notifications)
 */
export async function getUserFCMTokens(userId: string): Promise<string[]> {
    try {
        // This would normally be done server-side (Cloud Function)
        // Client-side reading is for debugging only
        const { getDocs, collection } = await import('firebase/firestore');
        const tokensRef = collection(db, 'users', userId, 'fcmTokens');
        const snapshot = await getDocs(tokensRef);
        return snapshot.docs.map(d => d.data().token as string);
    } catch (error) {
        console.error('Error getting FCM tokens:', error);
        return [];
    }
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
        console.log('Foreground message received:', payload);
        callback({
            title: payload.notification?.title || 'GymBro',
            body: payload.notification?.body || '',
            data: payload.data as Record<string, string> | undefined,
        });
    });

    return unsubscribe;
}

/**
 * Check if notifications are enabled for this user
 */
export function areNotificationsEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}
