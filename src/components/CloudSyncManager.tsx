
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUserStore } from '../stores/userStore';
import type { PerfilCompleto } from '../stores/userStore';
import { firebaseService } from '../services/firebaseService';
import { authService } from '../services/authService';
import { RoutineCopyModal } from './RoutineCopyModal';
import { requestNotificationPermission, onForegroundMessage } from '../services/pushNotificationService';

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

const getProfileUpdatedAtMs = (profile: PerfilCompleto | null): number => {
    const updatedAt = profile?.updatedAt;
    if (!updatedAt) return 0;
    const ms = Date.parse(updatedAt);
    return Number.isFinite(ms) ? ms : 0;
};

const getRoutineVersion = (profile: PerfilCompleto | null): number => {
    if (!profile?.rutina?.syncMeta?.version) return 0;
    const version = Number(profile.rutina.syncMeta.version);
    return Number.isFinite(version) ? version : 0;
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
    const [authUid, setAuthUid] = useState<string | null>(() => authService.getCurrentUser()?.uid ?? null);
    const lastSavedData = useRef<string>('');
    const lastSavedProfile = useRef<PerfilCompleto | null>(null);
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);
    const retryTimeout = useRef<NodeJS.Timeout | null>(null);
    const deferredRemoteProfile = useRef<PerfilCompleto | null>(null);
    const lastAppliedRemoteUpdatedAtMs = useRef(0);
    const [retryTick, setRetryTick] = useState(0);

    // Flag to prevent double initial pull
    const initialPullDone = useRef(false);

    // State for routine copy modal
    const [showRoutineCopyModal, setShowRoutineCopyModal] = useState(false);
    const [partnerDetails, setPartnerDetails] = useState<{ id: string; name: string; alias: string } | null>(null);
    const prevPartnerId = useRef(perfil.activePartnerId || perfil.partnerId);

    useEffect(() => {
        return authService.onAuthChange((user) => {
            setAuthUid(user?.uid ?? null);
        });
    }, []);

    const applyRemoteProfile = useCallback((cloudProfile: PerfilCompleto, source: 'initial' | 'live' | 'deferred') => {
        const remoteUpdatedAtMs = getProfileUpdatedAtMs(cloudProfile);
        if (remoteUpdatedAtMs > 0 && remoteUpdatedAtMs < lastAppliedRemoteUpdatedAtMs.current) {
            debugLog('[CloudSync] Ignoring stale remote snapshot', { source, remoteUpdatedAtMs });
            return;
        }

        useUserStore.setState({ perfil: cloudProfile });
        lastSavedData.current = firebaseService.getProfileSyncFingerprint(cloudProfile);
        lastSavedProfile.current = cloudProfile;
        if (remoteUpdatedAtMs > 0) {
            lastAppliedRemoteUpdatedAtMs.current = remoteUpdatedAtMs;
        }
        setLastSyncError(null);
    }, [setLastSyncError]);


    // Initial Fetch (On App Start or Login)
    useEffect(() => {
        const loadInitialData = async () => {
            if (!userId || initialPullDone.current) return;
            if (authUid !== userId) return;

            try {
                setIsSyncing(true);
                const cloudData = await firebaseService.getProfile(userId);
                if (cloudData) {
                    applyRemoteProfile(cloudData, 'initial');
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
    }, [applyRemoteProfile, authUid, userId, setIsSyncing]);

    // Real-time Cloud Listener
    useEffect(() => {
        if (!userId) return;
        if (authUid !== userId) return;

        const unsubscribe = firebaseService.onProfileChange(userId, (cloudProfile) => {
            if (cloudProfile) {
                const state = useUserStore.getState();
                const hasUnsavedLocalChanges =
                    firebaseService.getProfileSyncFingerprint(state.perfil) !== lastSavedData.current;
                if (state.pendingSave || hasUnsavedLocalChanges) {
                    const incomingUpdatedAtMs = getProfileUpdatedAtMs(cloudProfile);
                    const deferredUpdatedAtMs = getProfileUpdatedAtMs(deferredRemoteProfile.current);
                    if (incomingUpdatedAtMs >= deferredUpdatedAtMs) {
                        deferredRemoteProfile.current = cloudProfile;
                    }
                    debugLog('[CloudSync] Deferred remote update', {
                        pendingSave: state.pendingSave,
                        hasUnsavedLocalChanges,
                        incomingUpdatedAtMs,
                    });
                    return;
                }

                applyRemoteProfile(cloudProfile, 'live');
            }
        }, {
            rehydrateRelatedData: false,
            ignorePendingWrites: true,
        });

        return () => unsubscribe();
    }, [applyRemoteProfile, authUid, userId]);

    // Spark fallback: keep routine synced from partner profile when routineSync is enabled in auto mode.
    useEffect(() => {
        if (!userId) return;
        if (authUid !== userId) return;
        const routineSync = perfil.routineSync;
        if (!routineSync?.enabled || routineSync.mode !== 'auto' || !routineSync.partnerId || !routineSync.syncId) {
            return;
        }

        const unsubscribe = firebaseService.onProfileChange(routineSync.partnerId, (partnerProfile) => {
            if (!partnerProfile?.rutina || !partnerProfile.routineSync) return;
            const partnerSync = partnerProfile.routineSync;
            const partnerRoutine = partnerProfile.rutina;

            if (!partnerSync.enabled || partnerSync.mode !== 'auto') return;
            if (partnerSync.partnerId !== userId) return;
            if (partnerSync.syncId !== routineSync.syncId) return;
            if (partnerRoutine.syncMeta?.syncId !== routineSync.syncId) return;
            if (partnerRoutine.syncMeta?.updatedBy !== routineSync.partnerId) return;

            const localVersion = getRoutineVersion(useUserStore.getState().perfil);
            const incomingVersion = Number(partnerRoutine.syncMeta?.version || 0);
            if (!Number.isFinite(incomingVersion) || incomingVersion <= localVersion) return;

            useUserStore.setState((state) => ({
                perfil: {
                    ...state.perfil,
                    rutina: partnerRoutine,
                    updatedAt: new Date().toISOString(),
                },
            }));
        }, {
            rehydrateRelatedData: false,
            ignorePendingWrites: true,
        });

        return () => unsubscribe();
    }, [
        authUid,
        perfil.routineSync,
        userId,
    ]);

    // Auto-Save Effect
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado || !initialPullDone.current) return;
        if (authUid !== userId) return;

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
                const savedUpdatedAtMs = getProfileUpdatedAtMs(perfil);
                if (savedUpdatedAtMs > 0) {
                    lastAppliedRemoteUpdatedAtMs.current = Math.max(
                        lastAppliedRemoteUpdatedAtMs.current,
                        savedUpdatedAtMs
                    );
                }
                setLastSyncError(null);
            } catch (err: unknown) {
                console.error('Auto-sync failed:', err);
                const errorMessage = err instanceof Error ? err.message : 'Error guardando en la nube';
                setLastSyncError(errorMessage);

                // Auto-retry after 10 seconds
                if (retryTimeout.current) {
                    clearTimeout(retryTimeout.current);
                }
                retryTimeout.current = setTimeout(() => {
                    const { perfil: currentPerfil } = useUserStore.getState();
                    const retryStr = firebaseService.getProfileSyncFingerprint(currentPerfil);
                    if (retryStr !== lastSavedData.current) {
                        debugLog('[CloudSync] Retrying save...');
                        setRetryTick((value) => value + 1);
                    }
                }, 10000);
            } finally {
                useUserStore.getState().setPendingSave(false);
                setIsSyncing(false);

                if (deferredRemoteProfile.current) {
                    const deferredProfile = deferredRemoteProfile.current;
                    const { perfil: currentPerfil } = useUserStore.getState();
                    const hasUnsavedLocalChanges =
                        firebaseService.getProfileSyncFingerprint(currentPerfil) !== lastSavedData.current;

                    if (!hasUnsavedLocalChanges) {
                        deferredRemoteProfile.current = null;
                        applyRemoteProfile(deferredProfile, 'deferred');
                    }
                }
            }
        }, 3000); // 3 second debounce

        return () => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
        };
    }, [applyRemoteProfile, authUid, perfil, retryTick, userId, setIsSyncing, setLastSyncError]);

    useEffect(() => {
        return () => {
            if (retryTimeout.current) {
                clearTimeout(retryTimeout.current);
            }
        };
    }, []);

    // Push notification setup - request permission after initial load
    useEffect(() => {
        if (!userId || !perfil.onboardingCompletado || !initialPullDone.current) return;
        if (authUid !== userId) return;
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
    }, [authUid, userId, perfil.onboardingCompletado]);

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

