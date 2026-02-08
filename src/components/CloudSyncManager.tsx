
import React, { useEffect, useRef, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { firebaseService } from '../services/firebaseService';
import { RoutineCopyModal } from './RoutineCopyModal';
import { requestNotificationPermission, onForegroundMessage } from '../services/pushNotificationService';

export const CloudSyncManager: React.FC = () => {
    const { userId, perfil, setIsSyncing, setLastSyncError } = useUserStore();
    const lastSavedData = useRef<string>('');
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);

    // Flag to prevent double initial pull
    const initialPullDone = useRef(false);

    // State for routine copy modal
    const [showRoutineCopyModal, setShowRoutineCopyModal] = useState(false);
    const [partnerDetails, setPartnerDetails] = useState<{ id: string; name: string; alias: string } | null>(null);
    const prevPartnerId = useRef(perfil.partnerId);


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
    }, [userId, setIsSyncing]);

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
            } catch (err: unknown) {
                console.error('Auto-sync failed:', err);
                const errorMessage = err instanceof Error ? err.message : 'Error guardando en la nube';
                setLastSyncError(errorMessage);
            } finally {
                setIsSyncing(false);
            }
        }, 3000); // 3 second debounce

        return () => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
        };
    }, [perfil, userId, setIsSyncing, setLastSyncError]);

    // Push notification setup - request permission after initial load
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado || !initialPullDone.current) return;

        // Request notification permission (non-blocking)
        const initPush = async () => {
            try {
                await requestNotificationPermission(userId);
                // Listen for foreground messages
                const unsubMsg = await onForegroundMessage((payload) => {
                    // Foreground messages are handled by TrainingInvitationNotifier via Firestore
                    // This is just for logging/debugging
                    console.log('Foreground push received:', payload);
                });
                return unsubMsg;
            } catch (e) {
                // Push notifications are optional - don't break the app
                console.warn('Push notification setup skipped:', e);
            }
        };

        // Delay push permission request to not interrupt UX
        const timer = setTimeout(() => {
            initPush();
        }, 5000);

        return () => clearTimeout(timer);
    }, [userId, perfil.onboardingCompletado]);

    // Effect to detect new partner link
    useEffect(() => {
        const currentPartnerId = perfil.partnerId;
        const previousPartnerId = prevPartnerId.current;

        if (currentPartnerId && currentPartnerId !== previousPartnerId) {
            const fetchPartnerDetails = async () => {
                const partnerProfile = await firebaseService.getProfile(currentPartnerId);
                if (partnerProfile && partnerProfile.alias) {
                    setPartnerDetails({
                        id: currentPartnerId,
                        name: partnerProfile.usuario.nombre,
                        alias: partnerProfile.alias,
                    });
                    setShowRoutineCopyModal(true);
                }
            };
            fetchPartnerDetails();
        }

        prevPartnerId.current = currentPartnerId;
    }, [perfil.partnerId]);

    return (
        <>
            {showRoutineCopyModal && partnerDetails && (
                <RoutineCopyModal
                    partnerId={partnerDetails.id}
                    partnerName={partnerDetails.name}
                    partnerAlias={partnerDetails.alias}
                    onClose={() => setShowRoutineCopyModal(false)}
                />
            )}
        </>
    );
};
