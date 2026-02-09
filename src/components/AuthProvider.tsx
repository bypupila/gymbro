import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserId, setLinkRequests, addPartner } = useUserStore();

    useEffect(() => {
        let unsubscribeLinkRequests: (() => void) | null = null;
        let unsubscribeAcceptedLinks: (() => void) | null = null;

        // Firebase Auth Listener
        const unsubscribeAuth = authService.onAuthChange((user) => {
            if (unsubscribeLinkRequests) {
                unsubscribeLinkRequests();
                unsubscribeLinkRequests = null;
            }
            if (unsubscribeAcceptedLinks) {
                unsubscribeAcceptedLinks();
                unsubscribeAcceptedLinks = null;
            }

            if (user) {
                setUserId(user.uid);

                // Setup listener for link requests
                unsubscribeLinkRequests = firebaseService.onLinkRequestsChange(user.uid, (requests) => {
                    setLinkRequests(requests);
                });

                // Setup listener for accepted links (fallback client-sync if backend trigger is delayed)
                unsubscribeAcceptedLinks = firebaseService.onAcceptedLinkRequestsChange(user.uid, (partners) => {
                    partners.forEach((partner) => {
                        void firebaseService.upsertOwnPartner(user.uid, partner);
                        addPartner(partner);
                    });
                });
            } else {
                setUserId(null);
                setLinkRequests([]); // Clear requests on logout
            }
        });

        return () => {
            if (unsubscribeLinkRequests) {
                unsubscribeLinkRequests();
            }
            if (unsubscribeAcceptedLinks) {
                unsubscribeAcceptedLinks();
            }
            unsubscribeAuth();
        };
    }, [addPartner, setLinkRequests, setUserId]);

    // Data syncing is now handled by CloudSyncManager
    // leaving AuthProvider responsible only for Auth State

    return <>{children}</>;
};

