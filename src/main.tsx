// =====================================================
// GymBro PWA - Entry Point
// =====================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { useUserStore } from './stores/userStore';

if (import.meta.env.DEV) {
    (window as Window & { __gymbroStore?: typeof useUserStore }).__gymbroStore = useUserStore;
}

import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
