import { describe, expect, it } from 'vitest';
import { parseResourcePage } from '../src/resourcePage';

describe('declared resource page envelope', () => {
    it.each([
        { data: [{ id: '1' }], total: 80, page: 2, perPage: 25 },
        { data: [{ id: '1' }], nextCursor: 'opaque+/=', perPage: 50 },
        { data: [], nextCursor: null, perPage: 50 },
        { data: [], total: 0, page: 1, perPage: 1 },
    ])('preserves honest metadata %#', (page) => {
        expect(parseResourcePage(page)).toEqual(page);
    });
    it.each([
        null,
        [],
        {},
        { data: [] },
        { data: [], total: 0, page: 1, perPage: 0 },
        { data: [], total: -1, page: 1, perPage: 25 },
        { data: [], total: 0, page: 0, perPage: 25 },
        { data: [], total: 1.5, page: 1, perPage: 25 },
        { data: [], total: 0, page: 1, perPage: '25' },
        { data: [], nextCursor: '', perPage: 25 },
        { data: [], nextCursor: undefined, perPage: 25 },
        { data: [], nextCursor: false, perPage: 25 },
        { data: [], nextCursor: null, total: 0, perPage: 25 },
        { data: [], nextCursor: null, page: 1, perPage: 25 },
        { data: [null], nextCursor: null, perPage: 25 },
        { data: ['row'], nextCursor: null, perPage: 25 },
    ])('rejects malformed or mixed metadata %#', (page) => {
        expect(() => parseResourcePage(page)).toThrow('pagination');
    });
});
