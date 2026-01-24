
import React, { useEffect, useRef } from 'react';
import { useUserStore } from '../stores/userStore';
import { cloudService } from '../services/cloudService';

export const CloudSyncManager: React.FC = () => {
    const { userId, perfil, setIsSyncing, setLastSyncError } = useUserStore();
    const lastSavedData = useRef<string>('');
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);

    // Initial Fetch (If userId exists but store is effectively empty/un-onboarded)
    useEffect(() => {
        const loadInitialData = async () => {
            if (userId && !perfil.onboardingCompletado) {
                try {
                    setIsSyncing(true);
                    const cloudData = await cloudService.downloadData(userId);
                    if (cloudData) {
                        useUserStore.setState({ perfil: cloudData });
                        lastSavedData.current = JSON.stringify(cloudData);
                    }
                } catch (err) {
                    console.error('Failed initial load:', err);
                } finally {
                    setIsSyncing(false);
                }
            }
        };

        loadInitialData();
    }, [userId]); // Only run on login or app start with ID

    // Auto-Save Effect
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado) return;

        const currentDataStr = JSON.stringify(perfil);

        // Don't sync if data hasn't changed from last save
        if (currentDataStr === lastSavedData.current) return;

        // Debounce sync
        if (syncTimeout.current) clearTimeout(syncTimeout.current);

        syncTimeout.current = setTimeout(async () => {
            try {
                setIsSyncing(true);
                await cloudService.saveData(perfil, userId);
                lastSavedData.current = currentDataStr;
                setLastSyncError(null);
            } catch (err: any) {
                console.error('Auto-sync failed:', err);
                setLastSyncError(err.message || 'Error guardando en la nube');
            } finally {
                setIsSyncing(false);
            }
        }, 3000); // 3 second debounce

        return () => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
        };
    }, [perfil, userId]);

    return null; // Silent manager
};
