// =====================================================
// GymBro PWA - Responsive Layout Switcher
// =====================================================

import React from 'react';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { DesktopLayout } from './DesktopLayout';

interface ResponsiveLayoutProps {
    children: React.ReactNode;
}

/**
 * ResponsiveLayout decides whether to show the Desktop experience
 * or the Mobile experience based on screen size.
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
    const isDesktop = useIsDesktop();

    // On desktop, we use the sidebar-based layout
    if (isDesktop) {
        return <DesktopLayout />;
    }

    // On mobile, we let the children render (they will be wrapped by AppLayout where needed)
    return <>{children}</>;
};

export default ResponsiveLayout;

