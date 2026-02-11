import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Zap, TrendingUp, User, Search, LogOut } from 'lucide-react';
import Colors from '@/styles/colors';
import { Agentation } from 'agentation';
import { useUserStore } from '@/stores/userStore';

const sidebarItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/routine', icon: Dumbbell, label: 'Mi Rutina' },
    { path: '/train', icon: Zap, label: 'Entrenar' },
    { path: '/catalog', icon: Search, label: 'Catalogo' }, // Fixed Label
    { path: '/progress', icon: TrendingUp, label: 'Progreso' },
    { path: '/profile', icon: User, label: 'Perfil' },
];

export const DesktopLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useUserStore((state) => state.logout);

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
                <div style={styles.logoContainer}>
                    <h1 style={styles.logo}>GymBro</h1>
                </div>

                <nav style={styles.nav}>
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    ...styles.navItem,
                                    background: isActive ? 'rgba(0, 230, 153, 0.1)' : 'transparent',
                                    color: isActive ? Colors.primary : Colors.textSecondary,
                                    borderRight: isActive ? `3px solid ${Colors.primary}` : '3px solid transparent',
                                }}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div style={styles.footer}>
                    <button onClick={() => logout()} style={styles.logoutBtn}>
                        <LogOut size={20} />
                        <span>Cerrar Sesion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={styles.main}>
                <div style={styles.contentWrapper}>
                    <Outlet />
                </div>
            </main>

            {import.meta.env.DEV && <Agentation />}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    sidebar: {
        width: '240px',
        backgroundColor: Colors.surface,
        borderRight: `1px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
    },
    logoContainer: {
        padding: '0 24px',
        marginBottom: '40px',
    },
    logo: {
        fontSize: '24px',
        fontWeight: 900,
        background: Colors.gradientPrimary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: 0,
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
        gap: '12px',
        padding: '12px 24px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '15px',
        textAlign: 'left',
        transition: 'all 0.2s',
        width: '100%',
    },
    footer: {
        padding: '24px',
        borderTop: `1px solid ${Colors.border}`,
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'none',
        border: 'none',
        color: Colors.textSecondary,
        cursor: 'pointer',
        fontSize: '14px',
        padding: 0,
    },
    main: {
        flex: 1,
        overflow: 'auto',
        position: 'relative',
    },
    contentWrapper: {
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100%',
    }
};

export default DesktopLayout;
