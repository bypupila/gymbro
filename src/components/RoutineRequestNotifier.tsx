import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Colors from '@/styles/colors';
import { useUserStore } from '@/stores/userStore';
import { RoutineRequest, routineRequestService } from '@/services/routineRequestService';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';

export const RoutineRequestNotifier: React.FC = () => {
    const userId = useUserStore((state) => state.userId);
    const perfil = useUserStore((state) => state.perfil);
    const setRutinaInPlace = useUserStore((state) => state.setRutinaInPlace);
    const [requests, setRequests] = useState<RoutineRequest[]>([]);
    const [authUid, setAuthUid] = useState<string | null>(() => authService.getCurrentUser()?.uid ?? null);

    // Track which requests we've already processed client-side to avoid duplicate toasts.
    const processedTargetIds = useRef(new Set<string>());
    const processedSourceIds = useRef(new Set<string>());

    useEffect(() => {
        return authService.onAuthChange((user) => {
            setAuthUid(user?.uid ?? null);
        });
    }, []);

    // Listener for incoming requests (notifications for toUserId)
    useEffect(() => {
        if (!userId) return;
        if (authUid !== userId) return;

        const unsubscribe = routineRequestService.onIncomingRequests(userId, setRequests);
        return () => unsubscribe();
    }, [authUid, userId]);

    // Listener for accepted requests where I am the target (Case B)
    // Firebase Spark fallback: apply copy client-side for target user.
    useEffect(() => {
        if (!userId) return;
        if (authUid !== userId) return;

        const unsubscribe = routineRequestService.onAcceptedRequestsAsTarget(
            userId,
            async (acceptedRequests) => {
                for (const req of acceptedRequests) {
                    const linkedPartnerId = perfil.activePartnerId || perfil.partnerId;
                    if (linkedPartnerId && req.sourceUserId !== linkedPartnerId) continue;
                    if (processedTargetIds.current.has(req.id)) continue;
                    try {
                        const sourceProfile = await firebaseService.getProfile(req.sourceUserId);
                        if (!sourceProfile?.rutina) {
                            toast.error('No se encontro rutina origen para aplicar.');
                            continue;
                        }

                        const nowIso = new Date().toISOString();
                        const syncId = sourceProfile.routineSync?.syncId || sourceProfile.rutina.syncMeta?.syncId || `sync_${req.id}`;
                        const syncedRoutine = {
                            ...sourceProfile.rutina,
                            syncMeta: {
                                syncId,
                                version: Number(sourceProfile.rutina.syncMeta?.version || 1),
                                updatedBy: req.sourceUserId,
                                updatedAt: sourceProfile.rutina.syncMeta?.updatedAt || nowIso,
                            },
                        };

                        setRutinaInPlace(syncedRoutine);
                        await firebaseService.saveRoutine(userId, syncedRoutine);
                        await firebaseService.configureOwnRoutineSync(userId, req.sourceUserId, syncId);
                        await routineRequestService.markAsApplied(req.id);
                        processedTargetIds.current.add(req.id);
                        toast.success('Rutina aplicada y guardada.');
                    } catch (error) {
                        console.error('[RoutineRequestNotifier] Error applying accepted request:', error);
                        toast.error('No se pudo aplicar la rutina. Reintentando...');
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [authUid, perfil.activePartnerId, perfil.partnerId, setRutinaInPlace, userId]);

    // Listener for accepted requests where I am the source user.
    // Spark fallback: enable auto routineSync on the sender side too.
    useEffect(() => {
        if (!userId) return;
        if (authUid !== userId) return;

        const unsubscribe = routineRequestService.onAcceptedRequestsAsSource(
            userId,
            async (acceptedRequests) => {
                for (const req of acceptedRequests) {
                    if (!req.syncAfterAccept) continue;
                    if (req.applyStatus !== 'applied') continue;
                    const linkedPartnerId = perfil.activePartnerId || perfil.partnerId;
                    if (linkedPartnerId && req.targetUserId !== linkedPartnerId) continue;
                    if (processedSourceIds.current.has(req.id)) continue;
                    try {
                        const syncId = `sync_${req.id}`;
                        await firebaseService.configureOwnRoutineSync(userId, req.targetUserId, syncId);
                        processedSourceIds.current.add(req.id);
                    } catch (error) {
                        console.error('[RoutineRequestNotifier] Error configuring source sync:', error);
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [authUid, perfil.activePartnerId, perfil.partnerId, userId]);

    if (requests.length === 0) return null;

    const handleAccept = async (request: RoutineRequest) => {
        try {
            await routineRequestService.acceptRequest(request.id);
            setRequests((prev) => prev.filter((r) => r.id !== request.id));
            toast.success('Solicitud aceptada. Aplicando rutina...');
        } catch {
            toast.error('No se pudo aceptar la solicitud');
        }
    };

    const handleDecline = async (requestId: string) => {
        try {
            await routineRequestService.declineRequest(requestId);
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch {
            toast.error('No se pudo rechazar la solicitud');
        }
    };

    return (
        <div style={styles.container}>
            {requests.map((req) => (
                <div key={req.id} style={styles.card}>
                    <div style={styles.header}>
                        <Copy size={18} color={Colors.primary} />
                        <span style={styles.title}>Solicitud de rutina</span>
                    </div>
                    <p style={styles.message}>
                        <strong>{req.fromName}</strong> quiere {req.type === 'copy_my_routine_to_partner' ? 'enviarte su rutina' : 'copiar tu rutina'}.
                    </p>
                    <div style={styles.timer}>
                        <Clock size={12} color={Colors.textTertiary} />
                        <span style={styles.timerText}>Expira pronto</span>
                    </div>
                    <div style={styles.actions}>
                        <button style={styles.declineBtn} onClick={() => handleDecline(req.id)}>
                            <X size={16} />
                            Rechazar
                        </button>
                        <button style={styles.acceptBtn} onClick={() => handleAccept(req)}>
                            <Check size={16} />
                            Aceptar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        zIndex: 9998,
        top: 'calc(env(safe-area-inset-top, 0px) + 96px)',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '0 12px',
        pointerEvents: 'none',
    },
    card: {
        pointerEvents: 'auto',
        background: Colors.surface,
        border: `1px solid ${Colors.primary}55`,
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
    },
    title: {
        fontSize: '13px',
        fontWeight: 800,
        color: Colors.text,
    },
    message: {
        margin: 0,
        fontSize: '13px',
        color: Colors.textSecondary,
        lineHeight: 1.35,
    },
    timer: {
        marginTop: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    timerText: {
        fontSize: '11px',
        color: Colors.textTertiary,
    },
    actions: {
        marginTop: '10px',
        display: 'flex',
        gap: '8px',
    },
    declineBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderRadius: '8px',
        border: `1px solid ${Colors.error}`,
        background: `${Colors.error}15`,
        color: Colors.error,
        padding: '10px',
    },
    acceptBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderRadius: '8px',
        border: 'none',
        background: Colors.success,
        color: '#fff',
        padding: '10px',
    },
};
