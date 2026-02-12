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

                // Setup listener for accepted links (kept for side-effects: updating requester profile)
                // We DON'T update local state here because CloudSyncManager handles the profile sync
                // which includes the authoritative partner list with correct names.
                unsubscribeAcceptedLinks = firebaseService.onAcceptedLinkRequestsChange(user.uid, (partners) => {
                    // setPartners(partners); // DISABLED: Let CloudSyncManager handle it to avoid race conditions
                    console.log('Accepted link request detected:', partners.length);
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

