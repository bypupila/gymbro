// =====================================================
// GymBro PWA - App Layout
// =====================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

import { Agentation } from 'agentation';

export const MobileLayout: React.FC = () => {
    return (
        <div style={styles.container}>
            <main style={styles.main}>
                <Outlet />
            </main>
            <BottomNav />
            {import.meta.env.DEV && <Agentation />}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
    },
    main: {
        flex: 1,
        overflow: 'auto',
        overscrollBehavior: 'contain',
    },
};

export default MobileLayout;
