// =====================================================
// GymBro PWA - Training Invitation Notifier
// Listens for incoming training invitations via Firestore
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import {
    trainingInvitationService,
    TrainingInvitation,
    InvitationExercisePayload
} from '@/services/trainingInvitationService';
import Colors from '@/styles/colors';
import { Check, X, Dumbbell, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { liveSessionService } from '@/services/liveSessionService';

export const TrainingInvitationNotifier: React.FC = () => {
    const { userId, startSession } = useUserStore();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<TrainingInvitation[]>([]);

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = trainingInvitationService.onIncomingInvitations(
            userId,
            (incoming) => {
                setInvitations(incoming);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    const handleAccept = async (invitation: TrainingInvitation) => {
        try {
            await trainingInvitationService.acceptInvitation(invitation.id);

            const liveSessionId = invitation.liveSessionId || `session_${Date.now()}_${invitation.fromUserId}`;
            const routineExercises = (invitation.exercises || []).map((ex: InvitationExercisePayload) => ({
                id: ex.id,
                nombre: ex.nombre,
                series: ex.targetSeries || ex.series || 1,
                repeticiones: ex.targetReps || ex.repeticiones || '10',
                segundos: ex.sets?.[0]?.duration || 0,
                descanso: ex.sets?.[0]?.rest || 60,
                categoria: ex.categoria || 'maquina',
                isOptional: ex.isOptional || false,
            }));
            const trackingExercises = routineExercises.map((ex) => ({
                id: ex.id,
                nombre: ex.nombre,
                targetSeries: ex.series,
                targetReps: ex.repeticiones,
                categoria: ex.categoria,
                isOptional: ex.isOptional,
                isCompleted: false,
                sets: Array.from({ length: ex.series }, () => ({
                    completed: false,
                    skipped: false,
                    weight: 0,
                    reps: parseInt(ex.repeticiones) || 10,
                    duration: ex.segundos || 0,
                    rest: ex.descanso || 60
                }))
            }));

            if (userId) {
                await liveSessionService.joinLiveSession(
                    liveSessionId,
                    userId,
                    trackingExercises
                );
            }

            startSession(
                invitation.dayName || 'Entrenamiento',
                routineExercises,
                invitation.routineName || 'Rutina',
                'linked',
                undefined,
                undefined,
                undefined,
                { id: invitation.fromUserId, alias: invitation.fromName, nombre: invitation.fromName },
                invitation.trackingDate,
                liveSessionId
            );

            navigate('/train');
            toast.success(`Invitacion aceptada! ${invitation.fromName} y tu van a entrenar`);
            setInvitations(prev => prev.filter(i => i.id !== invitation.id));
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toast.error('No se pudo aceptar la invitacion.');
        }
    };

    const acceptFromDeepLink = useCallback(async (invitation: TrainingInvitation) => {
        await trainingInvitationService.acceptInvitation(invitation.id);

        const liveSessionId = invitation.liveSessionId || `session_${Date.now()}_${invitation.fromUserId}`;
        const routineExercises = (invitation.exercises || []).map((ex: InvitationExercisePayload) => ({
            id: ex.id,
            nombre: ex.nombre,
            series: ex.targetSeries || ex.series || 1,
            repeticiones: ex.targetReps || ex.repeticiones || '10',
            segundos: ex.sets?.[0]?.duration || 0,
            descanso: ex.sets?.[0]?.rest || 60,
            categoria: ex.categoria || 'maquina',
            isOptional: ex.isOptional || false,
        }));
        const trackingExercises = routineExercises.map((ex) => ({
            id: ex.id,
            nombre: ex.nombre,
            targetSeries: ex.series,
            targetReps: ex.repeticiones,
            categoria: ex.categoria,
            isOptional: ex.isOptional,
            isCompleted: false,
            sets: Array.from({ length: ex.series }, () => ({
                completed: false,
                skipped: false,
                weight: 0,
                reps: parseInt(ex.repeticiones) || 10,
                duration: ex.segundos || 0,
                rest: ex.descanso || 60
            }))
        }));

        if (userId) {
            await liveSessionService.joinLiveSession(liveSessionId, userId, trackingExercises);
        }

        startSession(
            invitation.dayName || 'Entrenamiento',
            routineExercises,
            invitation.routineName || 'Rutina',
            'linked',
            undefined,
            undefined,
            undefined,
            { id: invitation.fromUserId, alias: invitation.fromName, nombre: invitation.fromName },
            invitation.trackingDate,
            liveSessionId
        );

        navigate('/train');
        toast.success(`Invitacion aceptada! ${invitation.fromName} y tu van a entrenar`);
    }, [navigate, startSession, userId]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invitationId = params.get('acceptInvitation');
        if (!invitationId || invitations.length === 0) return;

        const invitation = invitations.find((inv) => inv.id === invitationId);
        if (!invitation) return;

        void acceptFromDeepLink(invitation).finally(() => {
            params.delete('acceptInvitation');
            const query = params.toString();
            const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
            window.history.replaceState({}, '', nextUrl);
        });
    }, [acceptFromDeepLink, invitations]);

    if (invitations.length === 0) return null;

    const handleDecline = async (invitation: TrainingInvitation) => {
        try {
            await trainingInvitationService.declineInvitation(invitation.id);
            setInvitations(prev => prev.filter(i => i.id !== invitation.id));
        } catch (error) {
            console.error('Error declining invitation:', error);
            toast.error('No se pudo rechazar la invitacion.');
        }
    };

    return (
        <AnimatePresence>
            {invitations.map((inv) => (
                <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    style={styles.overlay}
                >
                    <div style={styles.card}>
                        <div style={styles.iconContainer}>
                            <Dumbbell size={28} color={Colors.primary} />
                        </div>

                        <div style={styles.content}>
                            <h3 style={styles.title}>Invitacion a Entrenar</h3>
                            <p style={styles.message}>
                                <span style={{ fontWeight: 700, color: Colors.primary }}>{inv.fromName}</span>{' '}
                                te invita a entrenar juntos
                            </p>
                            <div style={styles.details}>
                                <span style={styles.badge}>
                                    {inv.sessionMode === 'shared' ? 'Mismo cel' : 'Cada quien'}
                                </span>
                                <span style={styles.routineName}>{inv.routineName}</span>
                            </div>

                            <div style={styles.timer}>
                                <Clock size={12} color={Colors.textTertiary} />
                                <ExpiryTimer expiresAt={inv.expiresAt} />
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button style={styles.declineBtn} onClick={() => handleDecline(inv)}>
                                <X size={20} />
                            </button>
                            <button style={styles.acceptBtn} onClick={() => handleAccept(inv)}>
                                <Check size={20} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
};

// Small component that shows countdown until expiry
const ExpiryTimer: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
    const [remaining, setRemaining] = useState('');

    useEffect(() => {
        const update = () => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setRemaining('Expirado');
                return;
            }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span style={{ fontSize: '11px', color: Colors.textTertiary }}>{remaining}</span>;
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '400px',
    },
    card: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        background: Colors.surface,
        border: `2px solid ${Colors.primary}`,
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    iconContainer: {
        width: '48px',
        height: '48px',
        background: `${Colors.primary}15`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    content: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    title: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    message: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
        lineHeight: 1.4,
    },
    details: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '4px',
    },
    badge: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.primary,
        background: `${Colors.primary}15`,
        padding: '2px 8px',
        borderRadius: '4px',
    },
    routineName: {
        fontSize: '11px',
        color: Colors.textTertiary,
        fontStyle: 'italic',
    },
    timer: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '4px',
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
    },
    acceptBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: Colors.success,
        border: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    declineBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: `${Colors.error}20`,
        border: `1px solid ${Colors.error}`,
        color: Colors.error,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
};
