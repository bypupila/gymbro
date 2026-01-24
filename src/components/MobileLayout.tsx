// =====================================================
// GymBro PWA - App Layout
// =====================================================

import { Dumbbell, Info, Share2, Smartphone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Colors from '../styles/colors';
import BottomNav from './BottomNav';

export const MobileLayout: React.FC = () => {
    return (
        <div style={styles.container}>
            <main style={styles.main}>
                <Outlet />
            </main>
            <BottomNav />
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
