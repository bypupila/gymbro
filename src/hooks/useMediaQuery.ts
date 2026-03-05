import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
    const getInitialMatch = () => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    };

    const [matches, setMatches] = useState(getInitialMatch);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const media = window.matchMedia(query);
        const updateMatch = () => setMatches(media.matches);

        updateMatch();

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', updateMatch);
        } else {
            media.addListener(updateMatch);
        }

        window.addEventListener('resize', updateMatch);
        window.addEventListener('orientationchange', updateMatch);

        return () => {
            if (typeof media.removeEventListener === 'function') {
                media.removeEventListener('change', updateMatch);
            } else {
                media.removeListener(updateMatch);
            }

            window.removeEventListener('resize', updateMatch);
            window.removeEventListener('orientationchange', updateMatch);
        };
    }, [query]);

    return matches;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
