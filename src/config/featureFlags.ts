const parseBooleanFlag = (value: string | undefined, fallback: boolean): boolean => {
    if (value === '1' || value?.toLowerCase() === 'true') return true;
    if (value === '0' || value?.toLowerCase() === 'false') return false;
    return fallback;
};

const env = import.meta.env as Record<string, string | undefined>;

// Temporary visual shutdown for API-powered Gemini/AI features.
// Set VITE_ENABLE_API_FEATURES=1 to re-enable the UI entry points.
export const ENABLE_API_FEATURES = parseBooleanFlag(env.VITE_ENABLE_API_FEATURES, false);
