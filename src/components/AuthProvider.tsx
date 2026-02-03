import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserId, setLinkRequests } = useUserStore();

    useEffect(() => {
        // Firebase Auth Listener
        const unsubscribeAuth = authService.onAuthChange((user) => {
            if (user) {
                setUserId(user.uid);

                // Setup listener for link requests
                const unsubscribeLinkRequests = firebaseService.onLinkRequestsChange(user.uid, (requests) => {
                    setLinkRequests(requests);
                });

                // Return the cleanup function for the link requests listener
                return () => unsubscribeLinkRequests();
            } else {
                setUserId(null);
                setLinkRequests([]); // Clear requests on logout
            }
        });

        return () => {
            // This will be called on component unmount
            // It might be a simple unsubscribe, or if the inner function returns a cleanup, it will be called
            if (typeof unsubscribeAuth === 'function') {
                unsubscribeAuth();
            }
        };
    }, [setUserId, setLinkRequests]);

    // Data syncing is now handled by CloudSyncManager
    // leaving AuthProvider responsible only for Auth State

    return <>{children}</>;
};

