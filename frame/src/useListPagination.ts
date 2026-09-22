import { useMemo } from 'react';
import { useFrameInjection } from './context';
import type { PaginationSlotProps, ResourcePage } from './types';

/** Cursor predecessors belong to one authority, resource and query, never to a row count. */
export function useListPagination(
    resource: string,
    data: ResourcePage<unknown> | undefined,
    pending: boolean,
): { props: PaginationSlotProps | undefined; visible: boolean } {
    const { transport, useUrlState } = useFrameInjection();
    const [params, setParams] = useUrlState();
    const query = new URLSearchParams(params);
    query.delete('page');
    query.delete('cursor');
    query.sort();
    const fingerprint = query.toString();
    const predecessors = useMemo(
        () => new Map<string, string | null>(),
        [transport, resource, fingerprint],
    );
    const cursor = params.get('cursor');
    const navigate = (next: string | null) =>
        setParams(
            (previous) => {
                previous.delete('page');
                if (next === null) previous.delete('cursor');
                else previous.set('cursor', next);
                return previous;
            },
            { replace: false },
        );
    const onPerPageChange = (size: number) =>
        setParams((previous) => {
            previous.delete('page');
            previous.delete('cursor');
            previous.set('per_page', String(size));
            return previous;
        });
    if (!data) return { props: undefined, visible: false };
    const common = { perPage: data.perPage, disabled: pending, onPerPageChange };
    if ('nextCursor' in data) {
        const next = data.nextCursor;
        return {
            visible: cursor !== null || next !== null,
            props: {
                ...common,
                mode: 'cursor',
                isFirst: cursor === null,
                hasNext: next !== null && next !== cursor,
                hasPrevious: cursor !== null && predecessors.has(cursor),
                onNext: () => {
                    if (pending || next === null || next === cursor) return;
                    predecessors.set(next, cursor);
                    navigate(next);
                },
                onPrevious: () => {
                    if (pending || cursor === null || !predecessors.has(cursor)) return;
                    navigate(predecessors.get(cursor) ?? null);
                },
                onFirst: () => {
                    if (!pending) navigate(null);
                },
            },
        };
    }
    return {
        visible: data.page > 1 || data.total > data.perPage,
        props: {
            ...common,
            mode: 'offset',
            page: data.page,
            total: data.total,
            onPageChange: (page) => {
                if (pending) return;
                setParams(
                    (previous) => {
                        previous.delete('cursor');
                        previous.set('page', String(page));
                        return previous;
                    },
                    { replace: false },
                );
            },
        },
    };
}
