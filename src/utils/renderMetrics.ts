import { useEffect } from 'react';

type RenderMetric = {
    renders: number;
    lastUpdatedAt: number;
};

declare global {
    interface Window {
        __gymbroRenderMetrics?: Record<string, RenderMetric>;
    }
}

export const useRenderMetric = (componentName: string) => {
    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        if (!window.__gymbroRenderMetrics) {
            window.__gymbroRenderMetrics = {};
        }

        const prev = window.__gymbroRenderMetrics[componentName];
        window.__gymbroRenderMetrics[componentName] = {
            renders: (prev?.renders ?? 0) + 1,
            lastUpdatedAt: Date.now(),
        };
    });
};

