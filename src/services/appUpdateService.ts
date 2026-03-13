export const APP_MANUAL_UPDATE_EVENT = 'gymbro:manual-app-update';

export type ManualAppUpdateStatus = 'updated' | 'up-to-date' | 'unsupported' | 'error';

export interface ManualAppUpdateEventDetail {
    silent?: boolean;
    onResult?: (status: ManualAppUpdateStatus) => void;
}

/**
 * Requests a manual update check through the mounted AppUpdateNotifier.
 * Falls back to "error" if no listener answers within timeout.
 */
export const requestManualAppUpdate = (
    detail: Omit<ManualAppUpdateEventDetail, 'onResult'> = {},
    timeoutMs = 12000
): Promise<ManualAppUpdateStatus> => {
    if (typeof window === 'undefined') {
        return Promise.resolve('error');
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = (status: ManualAppUpdateStatus) => {
            if (settled) return;
            settled = true;
            resolve(status);
        };

        const timeoutId = window.setTimeout(() => finish('error'), timeoutMs);

        window.dispatchEvent(new CustomEvent<ManualAppUpdateEventDetail>(APP_MANUAL_UPDATE_EVENT, {
            detail: {
                ...detail,
                onResult: (status) => {
                    window.clearTimeout(timeoutId);
                    finish(status);
                },
            },
        }));
    });
};
