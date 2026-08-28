import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCalendarServices, useSubscribe } from './provider';
import type { FoundationCalendarEvent } from './types';

/** react-query key factory — kept inside the package (rehome-ui: the data layer travels with it). */
export const calendarKeys = {
    all: ['big-calendar'] as const,
    events: (range?: { start: Date; end: Date }) =>
        ['big-calendar', 'events', range ? `${+range.start}-${+range.end}` : 'all'] as const,
};

/**
 * The events query + the real-time subscription wiring (PRD §7.2). On mount the injected
 * `subscribe` is called; on change the relevant query keys are invalidated (scoped by
 * `sourceId`/`ref` when supplied, else a broad refetch). The host provides an
 * already-wired transport; the foundation stays source-blind.
 */
export function useCalendarEvents<E = FoundationCalendarEvent>(range?: { start: Date; end: Date }) {
    const { client } = useCalendarServices<E>();
    const subscribe = useSubscribe();
    const qc = useQueryClient();

    useEffect(() => {
        return subscribe(() => {
            void qc.invalidateQueries({ queryKey: calendarKeys.all });
        });
    }, [subscribe, qc]);

    return useQuery({
        queryKey: calendarKeys.events(range),
        queryFn: () => client.listEvents(range),
        // Calendar reads self-refresh via `subscribe` + mutation invalidation, so a failed fetch
        // needn't be hammered — retrying a forbidden/broken read just storms the network + logs.
        retry: false,
    });
}

/** Invalidate all calendar queries — used by the surface after a mutation resolves. */
export function useInvalidateCalendar(): () => void {
    const qc = useQueryClient();
    return () => {
        void qc.invalidateQueries({ queryKey: calendarKeys.all });
    };
}
