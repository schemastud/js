import { expectTypeOf, it } from 'vitest';
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
