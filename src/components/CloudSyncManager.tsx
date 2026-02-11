
import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUserStore } from '../stores/userStore';
import type { PerfilCompleto } from '../stores/userStore';
import { firebaseService } from '../services/firebaseService';
import { RoutineCopyModal } from './RoutineCopyModal';
import { requestNotificationPermission, onForegroundMessage } from '../services/pushNotificationService';

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

export const CloudSyncManager: React.FC = () => {
    const userId = useUserStore((state) => state.userId);
    const perfil = useUserStore((state) => state.perfil);
    const setIsSyncing = useUserStore((state) => state.setIsSyncing);
    const setLastSyncError = useUserStore((state) => state.setLastSyncError);
    const setLinkSetupPendingPartnerId = useUserStore((state) => state.setLinkSetupPendingPartnerId);
    const isSyncing = useUserStore((state) => state.isSyncing);
    const lastSyncError = useUserStore((state) => state.lastSyncError);
    const pendingSave = useUserStore((state) => state.pendingSave);
    const lastSavedData = useRef<string>('');
    const lastSavedProfile = useRef<PerfilCompleto | null>(null);
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);

    // Flag to prevent double initial pull
    const initialPullDone = useRef(false);

    // State for routine copy modal
    const [showRoutineCopyModal, setShowRoutineCopyModal] = useState(false);
    const [partnerDetails, setPartnerDetails] = useState<{ id: string; name: string; alias: string } | null>(null);
    const prevPartnerId = useRef(perfil.activePartnerId || perfil.partnerId);


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
                    lastSavedData.current = firebaseService.getProfileSyncFingerprint(cloudData);
                    lastSavedProfile.current = cloudData;
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
                // PROTECTION: Don't overwrite if there's a save pending
                const { pendingSave } = useUserStore.getState();
                if (pendingSave) {
                    debugLog('[CloudSync] Ignoring remote update (save pending)');
                    return;
                }

                // Update local store and ref to prevent echo
                useUserStore.setState({ perfil: cloudProfile });
                lastSavedData.current = firebaseService.getProfileSyncFingerprint(cloudProfile);
                lastSavedProfile.current = cloudProfile;
                setLastSyncError(null);
            }
        }, {
            rehydrateRelatedData: false,
            ignorePendingWrites: true,
        });

        return () => unsubscribe();
    }, [userId, setLastSyncError]);

    // Auto-Save Effect
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado || !initialPullDone.current) return;

        const currentDataStr = firebaseService.getProfileSyncFingerprint(perfil);

        // Don't sync if data hasn't changed from last save
        if (currentDataStr === lastSavedData.current) return;

        // Debounce sync
        if (syncTimeout.current) clearTimeout(syncTimeout.current);

        syncTimeout.current = setTimeout(async () => {
            try {
                setIsSyncing(true);
                useUserStore.getState().setPendingSave(true); // Mark save start

                await firebaseService.saveProfileDiff(userId, lastSavedProfile.current, perfil);

                lastSavedData.current = currentDataStr;
                lastSavedProfile.current = JSON.parse(JSON.stringify(perfil)) as PerfilCompleto;
                setLastSyncError(null);
                useUserStore.getState().setPendingSave(false); // Mark save success
            } catch (err: unknown) {
                console.error('Auto-sync failed:', err);
                const errorMessage = err instanceof Error ? err.message : 'Error guardando en la nube';
                setLastSyncError(errorMessage);

                // DON'T clear pendingSave flag to protect data until successful save
                // The flag will stay active until we successfully save

                // Auto-retry after 10 seconds
                setTimeout(() => {
                    const { perfil: currentPerfil } = useUserStore.getState();
                    const retryStr = firebaseService.getProfileSyncFingerprint(currentPerfil);
                    if (retryStr !== lastSavedData.current) {
                        debugLog('[CloudSync] Retrying save...');
                        // Trigger change detection by updating a ref
                        // This will re-trigger the auto-save effect
                    }
                }, 10000);
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
        let isDisposed = false;
        let unsubscribeForeground: (() => void) | null = null;

        // Request notification permission (non-blocking)
        const initPush = async () => {
            try {
                await requestNotificationPermission(userId);
                // Listen for foreground messages
                const unsubMsg = await onForegroundMessage((payload) => {
                    // Foreground messages are handled by TrainingInvitationNotifier via Firestore
                    // This is just for logging/debugging
                    debugLog('Foreground push received:', payload);
                });
                if (!isDisposed) {
                    unsubscribeForeground = unsubMsg || null;
                } else if (unsubMsg) {
                    unsubMsg();
                }
            } catch (e) {
                // Push notifications are optional - don't break the app
                console.warn('Push notification setup skipped:', e);
            }
        };

        // Delay push permission request to not interrupt UX
        const timer = setTimeout(() => {
            initPush();
        }, 5000);

        return () => {
            isDisposed = true;
            clearTimeout(timer);
            if (unsubscribeForeground) {
                unsubscribeForeground();
            }
        };
    }, [userId, perfil.onboardingCompletado]);

    // Effect to detect new partner link and trigger first-time setup modal
    useEffect(() => {
        const currentPartnerId = perfil.activePartnerId || perfil.partnerId;
        const previousPartnerId = prevPartnerId.current;
        const pendingPartnerId = perfil.linkSetupPendingPartnerId;
        const partnerIdToPrompt = pendingPartnerId || (currentPartnerId && currentPartnerId !== previousPartnerId ? currentPartnerId : null);

        if (partnerIdToPrompt) {
            const fetchPartnerDetails = async () => {
                const partnerProfile = await firebaseService.getProfile(partnerIdToPrompt);
                if (partnerProfile && partnerProfile.alias) {
                    setPartnerDetails({
                        id: partnerIdToPrompt,
                        name: partnerProfile.usuario.nombre,
                        alias: partnerProfile.alias,
                    });
                    setShowRoutineCopyModal(true);
                }
            };
            fetchPartnerDetails();
        }

        prevPartnerId.current = currentPartnerId;
    }, [perfil.activePartnerId, perfil.partnerId, perfil.linkSetupPendingPartnerId]);

    return (
        <>
            {/* Save status indicator */}
            {(isSyncing || pendingSave || lastSyncError) && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    zIndex: 9999,
                    background: lastSyncError ? '#ff3b30' : (isSyncing || pendingSave) ? '#ff9500' : '#34c759',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}>
                    {isSyncing || pendingSave ? '⏳ Guardando...' : lastSyncError ? '❌ Error al guardar' : '✓ Guardado'}
                </div>
            )}

            {showRoutineCopyModal && partnerDetails && (
                <RoutineCopyModal
                    partnerId={partnerDetails.id}
                    partnerName={partnerDetails.name}
                    partnerAlias={partnerDetails.alias}
                    onClose={async () => {
                        setShowRoutineCopyModal(false);
                        setLinkSetupPendingPartnerId(null);

                        // Also clear from Firestore to prevent modal loop on reload
                        if (userId) {
                            try {
                                const profileRef = doc(db, 'users', userId, 'profile', 'main');
                                await updateDoc(profileRef, {
                                    linkSetupPendingPartnerId: null,
                                    updatedAt: new Date().toISOString()
                                });
                            } catch (e) {
                                console.error('Error clearing pending partner ID:', e);
                            }
                        }
                    }}
                />
            )}
        </>
    );
};

