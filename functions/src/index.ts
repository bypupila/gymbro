// =====================================================
// GymBro Cloud Functions
// Push notifications for training invitations
// =====================================================
//
// Deploy: cd functions && npm install && npm run build && firebase deploy --only functions
// Test locally: firebase emulators:start --only functions
// =====================================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Trigger: When a new training invitation is created
 * Action: Send push notification to the recipient
 */
export const onTrainingInvitationCreated = functions.firestore
    .document('trainingInvitations/{invitationId}')
    .onCreate(async (snap, context) => {
        const invitation = snap.data();
        const invitationId = context.params.invitationId;

        if (!invitation || invitation.status !== 'pending') {
            return null;
        }

        const { toUserId, fromName, sessionMode, routineName } = invitation;

        // Get recipient's FCM tokens
        const tokensSnapshot = await db
            .collection('users')
            .doc(toUserId)
            .collection('fcmTokens')
            .get();

        if (tokensSnapshot.empty) {
            console.log(`No FCM tokens found for user ${toUserId}`);
            return null;
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token as string);
        const modeLabel = sessionMode === 'shared' ? 'Mismo celular' : 'Cada quien su cel';

        // Build notification payload
        const payload: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title: 'Invitacion a Entrenar',
                body: `${fromName} te invita a entrenar juntos (${modeLabel})`,
            },
            data: {
                type: 'training_invitation',
                invitationId,
                fromName,
                sessionMode,
                routineName: routineName || '',
            },
            webpush: {
                notification: {
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    tag: 'training-invitation',
                    requireInteraction: true,
                    actions: [
                        { action: 'accept', title: 'Aceptar' },
                        { action: 'decline', title: 'Rechazar' },
                    ] as any,
                    vibrate: [200, 100, 200] as any,
                },
                fcmOptions: {
                    link: '/',
                },
            },
        };

        try {
            const response = await messaging.sendEachForMulticast(payload);
            console.log(
                `Sent ${response.successCount} notifications, ${response.failureCount} failures`
            );

            // Clean up invalid tokens
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (
                        errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered'
                    ) {
                        tokensToRemove.push(tokens[idx]);
                    }
                }
            });

            // Remove invalid tokens
            if (tokensToRemove.length > 0) {
                const batch = db.batch();
                for (const token of tokensToRemove) {
                    // Find the token doc by token value
                    const tokenDocs = await db
                        .collection('users')
                        .doc(toUserId)
                        .collection('fcmTokens')
                        .where('token', '==', token)
                        .get();
                    tokenDocs.forEach(doc => batch.delete(doc.ref));
                }
                await batch.commit();
                console.log(`Removed ${tokensToRemove.length} invalid tokens`);
            }

            return response;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return null;
        }
    });

/**
 * Trigger: Clean up expired invitations (scheduled function)
 * Runs every 10 minutes
 */
export const cleanupExpiredInvitations = functions.pubsub
    .schedule('every 10 minutes')
    .onRun(async () => {
        const now = new Date().toISOString();
        const expiredQuery = db
            .collection('trainingInvitations')
            .where('status', '==', 'pending')
            .where('expiresAt', '<', now);

        const snapshot = await expiredQuery.get();

        if (snapshot.empty) {
            return null;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'expired' });
        });

        await batch.commit();
        console.log(`Marked ${snapshot.size} invitations as expired`);
        return null;
    });
