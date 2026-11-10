import { useLayoutEffect, useRef, useState } from 'react';
import type { ResourceKey } from './resources';
import { ListFilters } from '@schemastud/facets';
import { useFrameInjection } from './context';
import { listItemRendersCards } from './listItemRendersCards';
import { useListShellOf, type ListShellOptionsOf } from './useListShell';
import type { ListShellProps, ListShellPropsOf, Row } from './types';

/**
 * The list surface, generalized from the app substrate. Renders any resource from
 * its schema + host-supplied columns with no per-resource UI code: the facets bar
 * is fully schema-driven (rides FilterSchemaController where a filter schema
 * exists), pagination is transport-driven, columns resolve through the columns seam.
 *
 * It is `useListShell`'s default rendering and reads nothing else: a custom list takes the same behaviour from
 * the hook and draws its own markup.
 */
export function ListShell<K extends ResourceKey = ResourceKey>(props: ListShellProps<K>) {
    const { paginationPlacement = 'both', ...options } = props as unknown as ListShellPropsOf<string>;
    const list = useListShellOf(options as ListShellOptionsOf<string>);
    const { manifest, filters, collection, rows, pagination, slots, create, notice, ResourceActions } = list;
    const { SimpleSelect } = useFrameInjection().primitives;
    const { Toolbar, Filters: FiltersSlot, Table, Cards, Cell, Empty, ErrorState, Loading, Pagination } = slots;
    const onOpen = options.onOpen as ((record: Row | { id: null }) => void) | undefined;

    // The controls row (filters, saved views, Toolbar) keeps a gap above the content only while it
    // renders something: every slot in it may render nothing (a resource with no filter vocabulary,
    // no saved views and no create verb), and an empty row must not push the table down. Measured,
    // because a slot returning null leaves no trace the shell can read before layout.
    const controlsRef = useRef<HTMLDivElement>(null);
    const [controlsShown, setControlsShown] = useState(true);
    useLayoutEffect(() => {
        const el = controlsRef.current;
        if (!el) return;
        const measure = () => setControlsShown(el.offsetHeight > 0);
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const showTopPagination =
        pagination.visible && (paginationPlacement === 'top' || paginationPlacement === 'both');
    const showBottomPagination =
        pagination.visible && (paginationPlacement === 'bottom' || paginationPlacement === 'both');
    const paginationBar = pagination.props ? <Pagination {...pagination.props} /> : null;

    return (
        <div data-frame-shell="list">
            {/* `marginBottom`: the filters row (facets bar, saved views, Toolbar) sat flush on the
                table or the empty-state box beneath it (beam VR pass 2, frame console). */}
            <div
                ref={controlsRef}
                data-frame-list-controls=""
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: controlsShown ? '0.75rem' : 0,
                }}
            >
                {collection.choices.length > 1 && SimpleSelect && (
                    <SimpleSelect
                        aria-label="Collection"
                        value={collection.selected}
                        options={collection.choices.map(({ stem, label }) => ({ value: stem, label }))}
                        onValueChange={collection.select}
                    />
                )}
                {/* The facets bar fills the row (flex:1) so it spans full-width like
                    the bespoke list surfaces; any Toolbar (e.g. a New button) sits at
                    the right edge. `minWidth:0` lets the bar's chips wrap instead of
                    forcing the row wider. The default is rendered INLINE, not wrapped in a
                    component: a wrapper would be a new component type on every render and
                    remount the filters row, dropping its local state mid-interaction. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {FiltersSlot ? <FiltersSlot /> : <ListFilters {...filters} />}
                </div>
                {ResourceActions ? <ResourceActions /> : null}
                <Toolbar
                    resource={list.resource}
                    canCreate={create.canCreate}
                    framesCreate={create.framesCreate}
                    singularLabel={create.singularLabel}
                    onNew={create.onNew}
                />
            </div>

            {notice.element}
            {list.status === 'loading' ? (
                <Loading />
            ) : list.status === 'error' ? (
                <ErrorState error={list.error} retry={list.retry} />
            ) : (
                <>
                    {/* Top bar gets breathing room below it before the table header. When the page is
                        EMPTY, this renders the single pagination boundary (C17: one empty state with one
                        boundary, never the top+bottom pair that sandwiched "No records."), including the
                        bottom-only placement so an emptied high page can always page back. */}
                    {(showTopPagination || (rows.length === 0 && showBottomPagination)) && (
                        <div className="mb-3">{paginationBar}</div>
                    )}
                    {list.status === 'empty' ? (
                        <Empty />
                    ) : list.view === 'cards' && manifest ? (
                        <Cards
                            resource={list.resource}
                            rows={rows}
                            manifest={manifest}
                            schema={list.rootSchema}
                            onOpen={onOpen}
                            Card={list.Card}
                        />
                    ) : (
                        <Table
                            columns={list.columns}
                            rows={rows}
                            onOpen={onOpen}
                            Cell={Cell}
                            RowActions={list.RowActions}
                            sort={{
                                // Column headers and the facets-bar Sort control share ONE
                                // `sort` param — the shadcn Table slot renders click-to-sort
                                // headers for any column whose `sortField` the resource lists.
                                sort: filters.sort,
                                onSortChange: filters.onSortChange,
                                sortableFields: filters.sortableFields,
                            }}
                        />
                    )}
                    {showBottomPagination && rows.length > 0 && paginationBar}
                </>
            )}
        </div>
    );
}

// The cards gate lives in its own module (a card asks it too, of another resource); the
// shell re-exports it so the public import path is unchanged.
export { listItemRendersCards };
