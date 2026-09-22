import { useMemo, useSyncExternalStore } from 'react';
import type { UrlStateSetter, UseUrlState } from './types';

const changed = 'schemastud:query-changed';
const subscribe = (notify: () => void) => {
    window.addEventListener(changed, notify);
    window.addEventListener('popstate', notify);
    return () => {
        window.removeEventListener(changed, notify);
        window.removeEventListener('popstate', notify);
    };
};
const snapshot = () => window.location.search;
const serverSnapshot = () => '';
const update: UrlStateSetter = (updater, options) => {
    const url = new URL(window.location.href);
    url.search = updater(new URLSearchParams(url.search)).toString();
    window.history[options?.replace === false ? 'pushState' : 'replaceState'](
        window.history.state,
        '',
        url,
    );
    window.dispatchEvent(new Event(changed));
};

/** Shared browser subscription; hosts with a router can inject its own equivalent. */
export const useBrowserUrlState: UseUrlState = () => {
    const query = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    return [useMemo(() => new URLSearchParams(query), [query]), update] as const;
};
