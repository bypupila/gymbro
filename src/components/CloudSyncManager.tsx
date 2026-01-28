
import React, { useEffect, useRef } from 'react';
import { useUserStore } from '../stores/userStore';
import { firebaseService } from '../services/firebaseService';

export const CloudSyncManager: React.FC = () => {
    const { userId, perfil, setIsSyncing, setLastSyncError } = useUserStore();
    const lastSavedData = useRef<string>('');
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);

    // Flag to prevent double initial pull
    const initialPullDone = useRef(false);

    // Initial Fetch (On App Start or Login)
    useEffect(() => {
        const loadInitialData = async () => {
            if (!userId || initialPullDone.current) return;

            try {
                setIsSyncing(true);
                const cloudData = await firebaseService.getProfile(userId);
                if (cloudData) {
                    // Update store with cloud data
                    useUserStore.setState({ perfil: cloudData });
                    lastSavedData.current = JSON.stringify(cloudData);
                } else {
                    // If no data in cloud, initialize name with alias if empty
                    const { perfil } = useUserStore.getState();
                    if (!perfil.usuario.nombre) {
                        useUserStore.setState((state) => ({
                            perfil: {
                                ...state.perfil,
                                usuario: { ...state.perfil.usuario, nombre: userId }
                            }
                        }));
                    }
                }
                initialPullDone.current = true;
            } catch (err) {
                console.error('Failed initial load:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        loadInitialData();
    }, [userId]);

    // Real-time Cloud Listener
    useEffect(() => {
        if (!userId) return;

        const unsubscribe = firebaseService.onProfileChange(userId, (cloudProfile) => {
            if (cloudProfile) {
                // Update local store and ref to prevent echo
                useUserStore.setState({ perfil: cloudProfile });
                lastSavedData.current = JSON.stringify(cloudProfile);
                setLastSyncError(null);
            }
        });

        return () => unsubscribe();
    }, [userId, setLastSyncError]);

    // Auto-Save Effect
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado || !initialPullDone.current) return;

        const currentDataStr = JSON.stringify(perfil);

        // Don't sync if data hasn't changed from last save
        if (currentDataStr === lastSavedData.current) return;

        // Debounce sync
        if (syncTimeout.current) clearTimeout(syncTimeout.current);

        syncTimeout.current = setTimeout(async () => {
            try {
                setIsSyncing(true);
                await firebaseService.saveProfile(userId, perfil);
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
