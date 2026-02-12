import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const setUserId = useUserStore((state) => state.setUserId);
    const setLinkRequests = useUserStore((state) => state.setLinkRequests);
    const setPartners = useUserStore((state) => state.setPartners);

    useEffect(() => {
        let unsubscribeLinkRequests: (() => void) | null = null;
        let unsubscribeAcceptedLinkRequests: (() => void) | null = null;

        // Firebase Auth Listener
        const unsubscribeAuth = authService.onAuthChange((user) => {
            if (unsubscribeLinkRequests) {
                unsubscribeLinkRequests();
                unsubscribeLinkRequests = null;
            }
            if (unsubscribeAcceptedLinkRequests) {
                unsubscribeAcceptedLinkRequests();
                unsubscribeAcceptedLinkRequests = null;
            }

            if (user) {
                setUserId(user.uid);

                // Setup listener for link requests
                unsubscribeLinkRequests = firebaseService.onLinkRequestsChange(user.uid, (requests) => {
                    setLinkRequests(requests);
                });

                // Spark-safe fallback: derive current partner from accepted/unlink events.
                // Important: this listener is read-only and must not mutate Firestore.
                unsubscribeAcceptedLinkRequests = firebaseService.onAcceptedLinkRequestsChange(user.uid, (partners) => {
                    const stateBeforeUpdate = useUserStore.getState();
                    const persistedIdsBefore = new Set<string>();
                    if (stateBeforeUpdate.perfil.partnerId) persistedIdsBefore.add(stateBeforeUpdate.perfil.partnerId);
                    (stateBeforeUpdate.perfil.partnerIds || []).forEach((id) => persistedIdsBefore.add(id));
                    (stateBeforeUpdate.perfil.partners || []).forEach((partner) => persistedIdsBefore.add(partner.id));

                    setPartners(partners);

                    const activeIds = new Set(partners.map((partner) => partner.id));
                    persistedIdsBefore.forEach((partnerId) => {
                        if (!activeIds.has(partnerId)) {
                            void firebaseService.removePartnerFromOwnProfile(user.uid, partnerId).catch((error) => {
                                console.error('[AuthProvider] Failed to cleanup stale partner link:', error);
                            });
                        }
                    });
                });
            } else {
                setUserId(null);
                setLinkRequests([]); // Clear requests on logout
                setPartners([]);
            }
        });

        return () => {
            if (unsubscribeLinkRequests) {
                unsubscribeLinkRequests();
            }
            if (unsubscribeAcceptedLinkRequests) {
                unsubscribeAcceptedLinkRequests();
            }
            unsubscribeAuth();
        };
    }, [setLinkRequests, setPartners, setUserId]);

    // Data syncing is now handled by CloudSyncManager
    // leaving AuthProvider responsible only for Auth State

    return <>{children}</>;
};
