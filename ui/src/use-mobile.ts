import { useSyncExternalStore } from 'react';

// useIsMobile — a portable media-query hook (below the 768px breakpoint). Foundation
// utility rehomed off the app-local `@/hooks/use-mobile`; SSR-safe (server snapshot is
// `false`). The `Sidebar` block reads it to swap the desktop rail for a `Sheet` drawer.
const MOBILE_BREAKPOINT = 768;

// Guard both `window` (SSR) and `matchMedia` (jsdom / older/embedded runtimes omit it) so a
// mere import never throws — the hook then degrades to the server snapshot (`false`).
const mql =
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
        ? undefined
        : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

function mediaQueryListener(callback: (event: MediaQueryListEvent) => void) {
    if (!mql) {
        return () => {};
    }

    mql.addEventListener('change', callback);

    return () => {
        mql.removeEventListener('change', callback);
    };
}

function isSmallerThanBreakpoint(): boolean {
    return mql?.matches ?? false;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useIsMobile(): boolean {
    return useSyncExternalStore(mediaQueryListener, isSmallerThanBreakpoint, getServerSnapshot);
}
