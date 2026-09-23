import type { ResourcePage, Row } from './types';

function isRow(value: unknown): value is Row {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate the two declared HTTP envelopes; never synthesize pagination metadata. */
export function parseResourcePage<Result>(value: ResourcePage<Result>): ResourcePage<Result>;
export function parseResourcePage(value: unknown): ResourcePage<Row>;
export function parseResourcePage(value: unknown): ResourcePage<Row> {
    const invalid = () => new Error('Resource returned invalid pagination.');
    if (!isRow(value) || !Array.isArray(value.data) || !value.data.every(isRow)) throw invalid();
    const { data, perPage } = value;
    if (typeof perPage !== 'number' || !Number.isSafeInteger(perPage) || perPage < 1)
        throw invalid();
    if ('nextCursor' in value) {
        const { nextCursor } = value;
        if (
            'page' in value ||
            'total' in value ||
            !(nextCursor === null || (typeof nextCursor === 'string' && nextCursor.length > 0))
        )
            throw invalid();
        return { data, perPage, nextCursor };
    }
    const { page, total } = value;
    if (
        typeof page !== 'number' ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        typeof total !== 'number' ||
        !Number.isSafeInteger(total) ||
        total < 0
    )
        throw invalid();
    return { data, perPage, page, total };
}
