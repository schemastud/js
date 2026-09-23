import { expectTypeOf, it } from 'vitest';
import { parseResourcePage } from '../src/resourcePage';
import type { ResourcePage, Paginated, Row } from '../src/types';

it('requires explicit narrowing before offset metadata is available', () => {
    function inspect(page: ResourcePage<Row>) {
        // @ts-expect-error Cursor results have no total.
        page.total;
        if ('nextCursor' in page) {
            expectTypeOf(page.nextCursor).toEqualTypeOf<string | null>();
            // @ts-expect-error Cursor results have no numbered page.
            page.page;
        } else {
            expectTypeOf(page).toEqualTypeOf<Paginated<Row>>();
            expectTypeOf(page.total).toEqualTypeOf<number>();
        }
    }
    expectTypeOf(inspect).toBeFunction();
});

it('preserves declared list rows and summary payloads through the resource transport', () => {
    type ReviewRow = { id: string; payload: { answer: number } };
    function inspect(
        transport: import('../src/types').FrameTransport,
        declared: ResourcePage<ReviewRow>,
    ) {
        expectTypeOf(transport.list('things', {})).toEqualTypeOf<Promise<ResourcePage<Row>>>();
        expectTypeOf(transport.list<ReviewRow>('things', {})).toEqualTypeOf<
            Promise<ResourcePage<ReviewRow>>
        >();
        expectTypeOf(transport.summary('things', {})).toEqualTypeOf<
            Promise<import('../src/cards/types').SummaryPayload>
        >();
        expectTypeOf(parseResourcePage(declared)).toEqualTypeOf<ResourcePage<ReviewRow>>();
    }
    expectTypeOf(inspect).toBeFunction();
});
