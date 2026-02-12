// =====================================================
// GymBro PWA - Entry Point
// =====================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/global.css';
import { useUserStore } from './stores/userStore';

if (import.meta.env.DEV) {
    import('react-grab');

    (window as Window & { __gymbroStore?: typeof useUserStore }).__gymbroStore = useUserStore;
}

import ErrorBoundary from './components/ErrorBoundary';

const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
        registration?.update().catch(() => undefined);
    },
    onNeedRefresh() {
        updateSW(true);
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
