import React, { useEffect, useState } from 'react';
import { Check, Clock, Copy, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Colors from '@/styles/colors';
import { useUserStore } from '@/stores/userStore';
import { RoutineRequest, routineRequestService } from '@/services/routineRequestService';

export const RoutineRequestNotifier: React.FC = () => {
    const userId = useUserStore((state) => state.userId);
    const [requests, setRequests] = useState<RoutineRequest[]>([]);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = routineRequestService.onIncomingRequests(userId, setRequests);
        return () => unsubscribe();
    }, [userId]);

    if (requests.length === 0) return null;

    const handleAccept = async (requestId: string) => {
        try {
            await routineRequestService.acceptRequest(requestId);
            toast.success('Solicitud aceptada. Copiando rutina...');
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
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
                        <button style={styles.acceptBtn} onClick={() => handleAccept(req.id)}>
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
