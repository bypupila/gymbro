const TRUSTED_VIDEO_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'vimeo.com',
    'www.vimeo.com',
    'player.vimeo.com',
]);

export const toTrustedExternalVideoUrl = (rawUrl?: string | null): string | null => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:') return null;
        return TRUSTED_VIDEO_HOSTS.has(parsed.hostname) ? parsed.toString() : null;
    } catch {
        return null;
    }
};
