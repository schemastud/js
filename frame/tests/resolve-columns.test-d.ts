import { createWidgetRegistry } from '@schemastud/seam';
import { expectTypeOf, it } from 'vitest';
import { resolveColumns, useRemoveResource, type FrameColumn, type RowActionsSlotProps } from '../src';

// frame-foundation 105 (unregistered program): resolveColumns is generic over the row type.
it('passes a row-typed column array through with no cast and returns it row-typed', () => {
    type EvidenceRow = { id: string; title: string; score: number };
    const typed: FrameColumn<EvidenceRow>[] = [{ field: 'title', cell: (record) => record.title.toUpperCase() }];
    expectTypeOf(resolveColumns('evidence', undefined, typed, undefined, createWidgetRegistry())).toEqualTypeOf<
        FrameColumn<EvidenceRow>[]
    >();
});

it('keeps an existing untyped caller unchanged', () => {
    const untyped: FrameColumn[] = [{ field: 'name' }];
    expectTypeOf(resolveColumns('widgets', null, untyped, undefined, createWidgetRegistry())).toEqualTypeOf<FrameColumn[]>();
});

// frame-foundation 100 (unregistered): ResourceKey is string, so a slot's resource is any string, as before.
it('keeps an unregistered row-actions slot unchanged', () => {
    expectTypeOf<RowActionsSlotProps['resource']>().toEqualTypeOf<string>();
    function Remove({ resource }: RowActionsSlotProps) {
        return useRemoveResource(resource);
    }
    expectTypeOf(Remove).toBeFunction();
});
