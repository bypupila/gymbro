// =====================================================
// GymBro PWA - App Update Notifier
// Detects new service worker versions and prompts the
// user to refresh without leaving the app.
// =====================================================

import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { Colors } from '@/styles/colors';
import {
    APP_MANUAL_UPDATE_EVENT,
    type ManualAppUpdateEventDetail,
    type ManualAppUpdateStatus,
} from '@/services/appUpdateService';

export function AppUpdateNotifier() {
    const forcePreview =
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('forceUpdatePreview');

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
            registration?.update().catch(() => undefined);
        },
    });

    useEffect(() => {
        if (!needRefresh && !forcePreview) return;

        const isPreviewOnly = forcePreview && !needRefresh;

        toast(
            (t) => (
                <div style={styles.toastContent}>
                    <div style={styles.iconWrapper}>
                        <RefreshCw size={20} color={Colors.primary} />
                    </div>
                    <div style={styles.textWrapper}>
                        <span style={styles.title}>Nueva versión disponible</span>
                        <span style={styles.subtitle}>Toca para ver los últimos cambios</span>
                    </div>
                    <button
                        style={styles.button}
                        onClick={() => {
                            toast.dismiss(t.id);
                            setNeedRefresh(false);
                            if (!isPreviewOnly) {
                                updateServiceWorker(true);
                            }
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = Colors.primaryDark;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = Colors.primary;
                        }}
                    >
                        Actualizar
                    </button>
                </div>
            ),
            {
                id: 'app-update',
                duration: Infinity,
                style: {
                    background: Colors.surface,
                    border: `1px solid ${Colors.primary}40`,
                    borderRadius: '14px',
                    padding: '4px 8px',
                    maxWidth: '360px',
                    width: '100%',
                    boxShadow: `0 4px 24px rgba(0, 230, 153, 0.15)`,
                },
            }
        );
    }, [forcePreview, needRefresh, setNeedRefresh, updateServiceWorker]);

    useEffect(() => {
        const handleManualUpdate = async (event: Event) => {
            const customEvent = event as CustomEvent<ManualAppUpdateEventDetail>;
            const detail = customEvent.detail ?? {};
            const finish = (status: ManualAppUpdateStatus) => {
                detail.onResult?.(status);
            };

            if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
                if (!detail.silent) toast.error('Actualizacion no disponible en este dispositivo');
                finish('unsupported');
                return;
            }

            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (!registration) {
                    if (!detail.silent) toast.error('No se encontro el actualizador de la app');
                    finish('unsupported');
                    return;
                }

                await registration.update().catch(() => undefined);

                if (!registration.waiting && registration.installing) {
                    await new Promise((resolve) => window.setTimeout(resolve, 800));
                    await registration.update().catch(() => undefined);
                }

                if (registration.waiting || needRefresh) {
                    if (!detail.silent) toast.success('Aplicando actualizacion...');
                    setNeedRefresh(false);
                    updateServiceWorker(true);
                    finish('updated');
                    return;
                }

                if (!detail.silent) toast.success('Ya tienes la ultima version');
                finish('up-to-date');
            } catch (error) {
                console.error('[AppUpdateNotifier] Manual update check failed:', error);
                if (!detail.silent) toast.error('No se pudo buscar una actualizacion');
                finish('error');
            }
        };

        window.addEventListener(APP_MANUAL_UPDATE_EVENT, handleManualUpdate as EventListener);
        return () => {
            window.removeEventListener(APP_MANUAL_UPDATE_EVENT, handleManualUpdate as EventListener);
        };
    }, [needRefresh, setNeedRefresh, updateServiceWorker]);

    return null;
}

const styles: Record<string, React.CSSProperties> = {
    toastContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
    },
    iconWrapper: {
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrapper: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    title: {
        fontSize: '13px',
        fontWeight: 700,
        color: Colors.text,
        letterSpacing: '-0.2px',
    },
    subtitle: {
        fontSize: '11px',
        color: Colors.textSecondary,
    },
    button: {
        flexShrink: 0,
        padding: '8px 14px',
        borderRadius: '10px',
        background: Colors.primary,
        color: '#000',
        fontSize: '12px',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        letterSpacing: '0.2px',
        transition: 'background 0.15s ease',
        whiteSpace: 'nowrap',
    },
};
