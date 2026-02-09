import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserId, setLinkRequests, setPartners } = useUserStore();

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
                    setPartners(partners);
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
            if (unsubscribeAcceptedLinks) {
                unsubscribeAcceptedLinks();
            }
            unsubscribeAuth();
        };
    }, [setLinkRequests, setPartners, setUserId]);

    // Data syncing is now handled by CloudSyncManager
    // leaving AuthProvider responsible only for Auth State

    return <>{children}</>;
};

