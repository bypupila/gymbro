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

                // Derive active partners from accepted/unlink events (works on Firebase Spark without Cloud Functions).
                unsubscribeAcceptedLinkRequests = firebaseService.onAcceptedLinkRequestsChange(user.uid, (partners) => {
                    setPartners(partners);
                    // Keep cloud profile symmetric on unlink even without Cloud Functions:
                    // if a previously persisted partner is no longer active, clear it in own profile.
                    const state = useUserStore.getState();
                    const activeIds = new Set(partners.map((partner) => partner.id));
                    const persistedIds = new Set<string>();
                    if (state.perfil.partnerId) persistedIds.add(state.perfil.partnerId);
                    (state.perfil.partnerIds || []).forEach((id) => persistedIds.add(id));
                    (state.perfil.partners || []).forEach((partner) => persistedIds.add(partner.id));

                    persistedIds.forEach((partnerId) => {
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
