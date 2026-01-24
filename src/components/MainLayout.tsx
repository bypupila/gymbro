// =====================================================
// GymBro PWA - Main Layout Switcher
// =====================================================

import { useIsDesktop } from '@/hooks/useMediaQuery';
import React from 'react';
import { DesktopLayout } from './DesktopLayout';
import { MobileLayout } from './MobileLayout';

export const MainLayout: React.FC = () => {
    const isDesktop = useIsDesktop();

    if (isDesktop) {
        return <DesktopLayout />;
    }

    return <MobileLayout />;
};

export default MainLayout;
