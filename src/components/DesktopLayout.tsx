// =====================================================
// GymBro PWA - Desktop Layout Component
// =====================================================

import Colors from '@/styles/colors';
import {
    Dumbbell, Home, Info, MessageCircle, Share2, TrendingUp, User,
    FileText, ChevronRight, ChevronLeft, Layout, Zap, Activity, Users, Scan
} from 'lucide-react';
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const navItems = [
    { path: '/', icon: Home, label: 'Readiness Check' },
    { path: '/coach', icon: MessageCircle, label: 'AI Coach' },
    { path: '/body-status', icon: Activity, label: 'Body Status' },
    { path: '/train', icon: Zap, label: 'Live Session' },
    { path: '/dual-training', icon: Users, label: 'Dual Training' },
    { path: '/migrator', icon: Scan, label: 'AI Migrator' },
    { path: '/routine', icon: FileText, label: 'Mi Rutina' },
    { path: '/progress', icon: TrendingUp, label: 'Mi Progreso' },
    { path: '/profile', icon: User, label: 'Perfil' },
];

export const DesktopLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const showRightPanel = useMediaQuery('(min-width: 1200px)');
    const [isRightPanelHidden, setIsRightPanelHidden] = useState(false);

    return (
        <div style={styles.container}>
            {/* Sidebar Navigation */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarContent}>
                    <div style={styles.logoContainer}>
                        <div style={styles.logoIcon}>
                            <Dumbbell color="#000" size={28} />
                        </div>
                        <h1 style={styles.logoText}>GymBro</h1>
                    </div>

                    <nav style={styles.nav}>
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    style={{
                                        ...styles.navItem,
                                        backgroundColor: isActive ? `${Colors.primary}15` : 'transparent',
                                        color: isActive ? Colors.primary : Colors.textSecondary,
                                    }}
                                >
                                    <Icon size={22} color={isActive ? Colors.primary : Colors.textSecondary} />
                                    <span style={styles.navLabel}>{item.label}</span>
                                    {isActive && <div style={styles.activeIndicator} />}
                                </button>
                            );
                        })}
                    </nav>

                    <div style={styles.sidebarFooter}>
                        <button style={styles.footerItem}>
                            <Share2 size={18} color={Colors.textMuted} />
                            <span>Compartir</span>
                        </button>
                        <button style={styles.footerItem}>
                            <Info size={18} color={Colors.textMuted} />
                            <span>Soporte</span>
                        </button>
                        <div style={styles.divider} />
                        <p style={styles.copyright}>© 2026 GymBro AI Platform</p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={styles.main}>
                <div style={styles.contentWrapper}>
                    <Outlet />
                </div>

                {/* Restore Right Panel Button */}
                {showRightPanel && isRightPanelHidden && (
                    <button
                        style={styles.restorePanelBtn}
                        onClick={() => setIsRightPanelHidden(false)}
                        title="Mostrar panel lateral"
                    >
                        <ChevronLeft size={20} color={Colors.primary} />
                        <Layout size={18} color={Colors.primary} style={{ opacity: 0.5 }} />
                    </button>
                )}
            </main>

            {/* Right Panel (Optional/Stats) - Only visible on large screens */}
            {showRightPanel && !isRightPanelHidden && (
                <aside style={styles.rightPanel}>
                    <div style={styles.rightPanelHeader}>
                        <button
                            style={styles.hidePanelBtn}
                            onClick={() => setIsRightPanelHidden(true)}
                            title="Ocultar panel"
                        >
                            <ChevronRight size={20} color={Colors.textMuted} />
                        </button>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Sincronización IA</h3>
                        <p style={styles.cardText}>Tu progreso se sincroniza en tiempo real con nuestra nube.</p>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Próximo Hito</h3>
                        <p style={styles.cardText}>Estás a 3 sesiones de completar tu objetivo semanal.</p>
                    </div>
                </aside>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: Colors.background,
        color: Colors.text,
    },
    sidebar: {
        width: '280px',
        borderRight: `1px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        background: '#0D0D0E',
    },
    sidebarContent: {
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '48px',
    },
    logoIcon: {
        width: '44px',
        height: '44px',
        background: Colors.gradientPrimary,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 16px ${Colors.primary}40`,
    },
    logoText: {
        fontSize: '24px',
        fontWeight: 900,
        letterSpacing: '-0.5px',
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1,
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 16px',
        borderRadius: '16px',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        position: 'relative',
        fontSize: '16px',
        fontWeight: 600,
    },
    navLabel: {
        flex: 1,
    },
    activeIndicator: {
        width: '4px',
        height: '20px',
        backgroundColor: Colors.primary,
        borderRadius: '2px',
        position: 'absolute',
        right: '12px',
    },
    main: {
        flex: 1,
        overflow: 'auto',
        background: Colors.background,
        position: 'relative',
    },
    contentWrapper: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px',
    },
    rightPanel: {
        width: '320px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: '#0D0D0E',
        borderLeft: `1px solid ${Colors.border}`,
        '@media (max-width: 1200px)': {
            display: 'none',
        },
    } as any,
    card: {
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        padding: '24px',
        border: `1px solid ${Colors.borderLight}`,
    },
    cardTitle: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.primary,
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    cardText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        lineHeight: 1.6,
    },
    sidebarFooter: {
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    footerItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 4px',
        fontSize: '14px',
        color: Colors.textMuted,
        fontWeight: 500,
        transition: 'color 0.2s',
    },
    divider: {
        height: '1px',
        backgroundColor: Colors.border,
        margin: '12px 0',
    },
    copyright: {
        fontSize: '11px',
        color: Colors.textMuted,
        opacity: 0.6,
    },
    rightPanelHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: '12px',
    },
    hidePanelBtn: {
        background: 'rgba(255,255,255,0.05)',
        border: 'none',
        borderRadius: '8px',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    restorePanelBtn: {
        position: 'absolute',
        top: '40px',
        right: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        padding: '12px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
        backdropFilter: 'blur(10px)',
    },
};

export default DesktopLayout;
