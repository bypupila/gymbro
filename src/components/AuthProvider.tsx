import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

import { authService } from '@/services/authService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {


    const { setUserId } = useUserStore();

    useEffect(() => {
        // Firebase Auth Listener
        const unsubscribe = authService.onAuthChange((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
        });

        return () => unsubscribe();
    }, [setUserId]);

    // Data syncing is now handled by CloudSyncManager
    // leaving AuthProvider responsible only for Auth State


    return <>{children}</>;
};
