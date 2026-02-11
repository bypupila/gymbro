import React from 'react';
import { ActiveWorkout } from '@/components/ActiveWorkout';
import { useUserStore } from '@/stores/userStore';
import { useNavigate } from 'react-router-dom';
import Colors from '@/styles/colors';

const TrainPageComp: React.FC = () => {
    const activeSession = useUserStore((state) => state.activeSession);
    const navigate = useNavigate();

    // If there is an active session, show the overlay
    if (activeSession) {
        return (
            <ActiveWorkout
                onFinish={() => {
                    // Logic is handled inside ActiveWorkout/MoodCheckin
                    navigate('/');
                }}
                onCancel={() => {
                    navigate('/');
                }}
            />
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Entrenar Hoy</h1>
                <p style={styles.subtitle}>Elige tu rutina o inicia una actividad libre</p>
            </div>

            <div style={styles.content}>
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>GYM</div>
                    <h3 style={styles.emptyText}>No hay sesion activa</h3>
                    <p style={styles.emptySubtext}>Ve al Catalogo o Rutina para comenzar.</p>
                    <button
                        onClick={() => navigate('/catalog')}
                        style={{
                            marginTop: '20px',
                            background: Colors.primary,
                            color: '#000',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Ir al Catalogo
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '24px 20px',
        height: '100%',
        overflowY: 'auto',
        paddingBottom: '100px', // Space for bottom nav
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
        marginTop: '4px',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        background: Colors.surface,
        borderRadius: '24px',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '40px',
        marginBottom: '16px',
    },
    emptyText: {
        fontSize: '18px',
        fontWeight: 700,
        color: Colors.text,
        margin: 0,
    },
    emptySubtext: {
        fontSize: '14px',
        color: Colors.textSecondary,
        marginTop: '8px',
    },
};

export const TrainPage = TrainPageComp;

