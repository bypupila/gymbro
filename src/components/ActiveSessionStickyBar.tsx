import React, { useEffect, useState } from 'react';
import { Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Colors from '@/styles/colors';
import { useUserStore } from '@/stores/userStore';

interface ActiveSessionStickyBarProps {
    layout: 'mobile' | 'desktop';
}

const formatTime = (seconds: number): string => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ActiveSessionStickyBar: React.FC<ActiveSessionStickyBarProps> = ({ layout }) => {
    const navigate = useNavigate();
    const activeSession = useUserStore((state) => state.activeSession);
    const activeWorkoutView = useUserStore((state) => state.activeWorkoutView);
    const resumeActiveWorkout = useUserStore((state) => state.resumeActiveWorkout);
    const [nowMs, setNowMs] = useState(() => Date.now());

    const isVisible = Boolean(activeSession && activeWorkoutView === 'minimized');

    useEffect(() => {
        if (!isVisible) return;
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [isVisible]);

    const elapsedSeconds = (() => {
        if (!activeSession?.startTime) return 0;
        const startMs = Date.parse(activeSession.startTime);
        if (!Number.isFinite(startMs)) return 0;
        return Math.max(0, Math.floor((nowMs - startMs) / 1000));
    })();

    if (!isVisible) return null;

    return (
        <div
            style={{
                ...styles.container,
                top: layout === 'mobile'
                    ? 'calc(10px + env(safe-area-inset-top, 0px))'
                    : '16px',
                left: layout === 'mobile' ? '62px' : '256px',
                right: layout === 'mobile' ? '12px' : '16px',
            }}
        >
            <div style={styles.elapsedWrap}>
                <Clock size={14} color={Colors.primary} />
                <span style={styles.elapsedText}>{formatTime(elapsedSeconds)}</span>
            </div>
            <button
                type="button"
                onClick={() => {
                    resumeActiveWorkout();
                    navigate('/train');
                }}
                style={styles.resumeButton}
            >
                <Play size={14} />
                Continuar entrenamiento
            </button>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        zIndex: 10005,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderRadius: '14px',
        border: `1px solid ${Colors.primary}55`,
        background: `${Colors.surface}F5`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        padding: '8px',
        backdropFilter: 'blur(6px)',
    },
    elapsedWrap: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '10px',
        background: `${Colors.primary}18`,
        padding: '8px 10px',
        flexShrink: 0,
    },
    elapsedText: {
        color: Colors.primary,
        fontWeight: 800,
        fontSize: '13px',
        letterSpacing: '0.3px',
        fontFamily: 'monospace',
    },
    resumeButton: {
        flex: 1,
        minWidth: 0,
        border: 'none',
        borderRadius: '10px',
        padding: '8px 10px',
        background: Colors.primary,
        color: '#111',
        fontSize: '13px',
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
};

export default ActiveSessionStickyBar;
