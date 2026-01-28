// =====================================================
// GymBro PWA - Bottom Navigation Component
// =====================================================

import Colors from '@/styles/colors';
import { Dumbbell, Home, MessageCircle, TrendingUp, User, Zap } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
    { path: '/', icon: Home, label: 'Hoy' },
    { path: '/routine', icon: Dumbbell, label: 'Rutina' },
    { path: '/train', icon: Zap, label: 'Entrenar', isMain: true },
    { path: '/progress', icon: TrendingUp, label: 'Progreso' },
    { path: '/profile', icon: User, label: 'Perfil' },
];

export const BottomNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav style={styles.container}>
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                const Icon = tab.icon;

                if (tab.isMain) {
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            style={styles.mainTab}
                        >
                            <div style={styles.mainIconWrapper}>
                                <Icon size={28} color="#000" strokeWidth={2.5} />
                            </div>
                        </button>
                    );
                }

                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        style={styles.tab}
                    >
                        <Icon
                            size={24}
                            color={isActive ? Colors.primary : Colors.textTertiary}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span
                            style={{
                                ...styles.label,
                                color: isActive ? Colors.primary : Colors.textTertiary,
                                fontWeight: isActive ? 600 : 500,
                            }}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 16px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        background: Colors.surface,
        borderTop: `1px solid ${Colors.border}`,
        position: 'relative',
    },
    tab: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    label: {
        fontSize: '10px',
        transition: 'color 0.2s',
    },
    mainTab: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '-30px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    mainIconWrapper: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: Colors.gradientPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0, 230, 153, 0.4)',
    },
};

export default BottomNav;
