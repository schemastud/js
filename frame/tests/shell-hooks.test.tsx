import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContextManifest } from '../src/contexts';
import { useEditShell, useListShell, useResourceAction } from '../src';
import { KNOWN_CONTEXTS } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { ListShell } from '../src/ListShell';
import { useListSelection } from '../src/subpaths/picker';
import { createMemoryTransport } from '../src/testing';
import type { FrameManifest, ResourceActionDefinition, ResourcePage, Row } from '../src/types';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

/** Two cursor pages and a manifest declaring one column, on ONE memory transport both lists read. */
const transport = createMemoryTransport({
    cursorPages: {
        '': { data: [{ id: '1', name: 'Ada Lovelace' }, { id: '2', name: 'Grace Hopper' }], perPage: 2, nextCursor: 'c2' },
        c2: { data: [{ id: '3', name: 'Katherine Johnson' }], perPage: 2, nextCursor: null },
    },
    manifest: {
        resources: [],
        contexts: {
            members: { byNode: { name: { 'list-column': { participates: true, sort: 1, label: 'Name' } } }, inherits: {}, known: KNOWN_CONTEXTS },
        },
    },
});

/** A custom list: twenty lines over the hook, drawing its own markup and paging. */
function HookList() {
    const list = useListShell({ resource: 'members' });
    const page = list.pagination.props;
    if (list.status === 'loading') return <p>Loading</p>;
    return (
        <div data-testid="hook-list">
            <ul>
                {list.rows.map((row) => (
                    <li key={String(row.id)}>{String(row.name)}</li>
                ))}
            </ul>
            {page?.mode === 'cursor' && (
                <button type="button" disabled={!page.hasNext} onClick={page.onNext}>
                    Next
                </button>
            )}
        </div>
    );
}

async function pagesOf(list: React.ReactElement, rowNames: (root: HTMLElement) => string[]) {
    const frame = createFrameKit({ transport, urlState: 'memory' });
    const { container } = render(<frame.Provider>{list}</frame.Provider>);
    await screen.findByText('Ada Lovelace');
    const first = rowNames(container);
    fireEvent.click(within(container).getAllByRole('button', { name: /^Next/ })[0]!);
    await screen.findByText('Katherine Johnson');
    const second = rowNames(container);
    cleanup();
    return [first, second];
}

/** frame-foundation 30 (ruling 02 slice 6): list behaviour is a hook, and `ListShell` renders it. */
describe('useListShell', () => {
    it('a twenty-line list over the hook shows the same rows and next page as ListShell', async () => {
        const shell = await pagesOf(<ListShell resource="members" />, (root) =>
            within(root).getAllByRole('row').slice(1).map((tr) => tr.textContent?.trim() ?? ''),
        );
        const hook = await pagesOf(<HookList />, (root) =>
            within(root).getAllByRole('listitem').map((li) => li.textContent?.trim() ?? ''),
        );

        expect(shell).toEqual([['Ada Lovelace', 'Grace Hopper'], ['Katherine Johnson']]);
        expect(hook).toEqual(shell);
    });
});

/** A custom table that selects (ruling 02 slice 12): `useListSelection` beside `useListShell`, its own markup. */
function SelectingList() {
    const list = useListShell({ resource: 'members' });
    const selection = useListSelection(list);
    const page = list.pagination.props;
    if (list.status === 'loading') return <p>Loading</p>;
    return (
        <div>
            <ul>
                {list.rows.map((row) => (
                    <li key={String(row.id)}>
                        <label>
                            <input type="checkbox" checked={selection.isPicked(row)} onChange={() => selection.toggle(row)} />
                            {String(row.name)}
                        </label>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={() => selection.setPage(selection.page !== 'all')}>
                Tick page ({selection.page})
            </button>
            {page?.mode === 'cursor' && (
                <button type="button" disabled={!page.hasNext} onClick={page.onNext}>
                    Next
                </button>
            )}
            <button type="button" onClick={selection.selectAllMatching}>
                All matching
            </button>
            <button type="button" onClick={() => list.filters.onFilterChange('role', 'admin')}>
                Admins only
            </button>
            <output data-testid="count">{selection.count ?? 'unknown'}</output>
            <output data-testid="value">{JSON.stringify(selection.value)}</output>
        </div>
    );
}

describe('useListSelection', () => {
    it('a custom list ticks a row, ticks the page, pages forward and still counts; "all matching" follows the filters', async () => {
        const frame = createFrameKit({ transport, urlState: 'memory' });
        render(
            <frame.Provider>
                <SelectingList />
            </frame.Provider>,
        );
        const count = () => screen.getByTestId('count').textContent;
        const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null');

        // One row, then the whole page.
        fireEvent.click(await screen.findByRole('checkbox', { name: 'Ada Lovelace' }));
        expect(count()).toBe('1');
        expect(screen.getByRole('button', { name: 'Tick page (some)' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Tick page (some)' }));
        expect(count()).toBe('2');
        expect(value()).toEqual({ mode: 'ids', ids: ['1', '2'] });

        // Page forward: the picks from page one are kept and still counted; this page starts unticked.
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(await screen.findByRole('checkbox', { name: 'Katherine Johnson' }));
        expect(count()).toBe('3');
        expect(screen.getByRole('button', { name: 'Tick page (all)' })).toBeTruthy();

        // "All matching" is a set over the list's facets, and it follows a filter change.
        fireEvent.click(screen.getByRole('button', { name: 'All matching' }));
        expect(value()).toMatchObject({ mode: 'set', filter: {}, exclude: [] });
        fireEvent.click(screen.getByRole('button', { name: 'Admins only' }));
        await waitFor(() => expect(value()).toMatchObject({ mode: 'set', filter: { role: 'admin' }, exclude: [] }));
    });

    /** A bare probe: the selection's calls as buttons, and its value, count and exactness as text. */
    function SelectionProbe({ select }: { select?: 'single' | 'multi' }) {
        const list = useListShell({ resource: 'members' });
        const selection = useListSelection(list, { select });
        if (list.status === 'loading') return <p>Loading</p>;
        return (
            <div>
                {list.rows.map((row) => (
                    <button key={String(row.id)} type="button" onClick={() => selection.toggle(row)}>
                        Toggle {String(row.name)}
                    </button>
                ))}
                <button type="button" onClick={() => selection.setPage(true)}>
                    Tick page
                </button>
                <button type="button" onClick={selection.selectAllMatching}>
                    All matching
                </button>
                <button type="button" onClick={() => list.filters.onFilterChange('role', 'admin')}>
                    Admins only
                </button>
                <output data-testid="value">{JSON.stringify(selection.value)}</output>
                <output data-testid="count">{String(selection.count)}</output>
                <output data-testid="exact">{String(selection.exact)}</output>
            </div>
        );
    }

    it('in single mode, ticking the page and "all matching" do nothing: at most one id', async () => {
        const frame = createFrameKit({ transport: createMemoryTransport({ rows: { members: MEMBERS } }), urlState: 'memory' });
        render(
            <frame.Provider>
                <SelectionProbe select="single" />
            </frame.Provider>,
        );
        const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null');

        fireEvent.click(await screen.findByRole('button', { name: 'Tick page' }));
        fireEvent.click(screen.getByRole('button', { name: 'All matching' }));
        expect(value()).toEqual({ mode: 'ids', ids: [] });

        fireEvent.click(screen.getByRole('button', { name: 'Toggle Ada Lovelace' }));
        fireEvent.click(screen.getByRole('button', { name: 'Toggle Grace Hopper' }));
        fireEvent.click(screen.getByRole('button', { name: 'Tick page' }));
        fireEvent.click(screen.getByRole('button', { name: 'All matching' }));
        expect(value()).toEqual({ mode: 'ids', ids: ['2'] });
    });

    it('while the rows shown are the previous request\'s, count is null and exact false, until the current result arrives', async () => {
        // Two filters with different totals; the filtered answer waits until the test releases it.
        let release: () => void = () => {};
        const transport = createMemoryTransport(
            {},
            {
                list: async <Result,>(_resource: string, params: Record<string, string>) => {
                    if (params['filter[role]'] === 'admin') {
                        await new Promise<void>((resolve) => (release = resolve));
                        return { data: [MEMBERS[0]], total: 1, page: 1, perPage: 2 } as unknown as ResourcePage<Result>;
                    }
                    return { data: MEMBERS, total: 5, page: 1, perPage: 2 } as unknown as ResourcePage<Result>;
                },
            },
        );
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, placeholderData: keepPreviousData } } });
        const frame = createFrameKit({ transport, queryClient, urlState: 'memory' });
        render(
            <frame.Provider>
                <SelectionProbe />
            </frame.Provider>,
        );
        const count = () => screen.getByTestId('count').textContent;
        const exact = () => screen.getByTestId('exact').textContent;

        // "All matching" over five: the set's count is the total.
        fireEvent.click(await screen.findByRole('button', { name: 'All matching' }));
        expect([count(), exact()]).toEqual(['5', 'true']);

        // The filter changes; the previous request's rows (and its total of five) stay on screen meanwhile.
        fireEvent.click(screen.getByRole('button', { name: 'Admins only' }));
        await waitFor(() => expect([count(), exact()]).toEqual(['null', 'false']));
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect([count(), exact()]).toEqual(['null', 'false']);

        await act(async () => release());
        await waitFor(() => expect([count(), exact()]).toEqual(['1', 'true']));
    });
});

const MEMBERS: Row[] = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Grace Hopper' },
];

/** A custom form over the hook: the draft, an edit, a save, the bound record actions and the notice region. */
function HookForm({ id, onSaved, manifest }: { id: string | null; onSaved?: (record: unknown) => void; manifest?: ContextManifest }) {
    const edit = useEditShell({ resource: 'members', id, onSaved, manifest });
    const { RecordActions } = edit.actions;
    return (
        <div>
            <span data-testid="draft">{String(edit.draft.name ?? '')}</span>
            <span data-testid="status">{edit.status}</span>
            <span data-testid="actions">{RecordActions ? 'bound' : 'none'}</span>
            <button type="button" onClick={() => edit.setDraft({ ...edit.draft, name: 'Edited' })}>
                Edit
            </button>
            <button type="button" onClick={() => edit.save.submit(edit.draft)}>
                Save
            </button>
            {edit.notice.element}
            {RecordActions ? <RecordActions /> : null}
        </div>
    );
}

const draft = () => screen.getByTestId('draft').textContent;

/** frame-foundation 30 (interface decision, edits C and E): form behaviour is a hook, and `EditShell` renders it. */
describe('useEditShell', () => {
    it('a new id inside one mount starts over: the edited draft is replaced by the new record', async () => {
        const frame = createFrameKit({ transport: createMemoryTransport({ rows: { members: MEMBERS } }), urlState: 'memory' });
        const { rerender } = render(
            <frame.Provider>
                <HookForm id="1" />
            </frame.Provider>,
        );
        await waitFor(() => expect(draft()).toBe('Ada Lovelace'));
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(draft()).toBe('Edited');

        rerender(
            <frame.Provider>
                <HookForm id="2" />
            </frame.Provider>,
        );
        await waitFor(() => expect(draft()).toBe('Grace Hopper'));
    });

    it('a save that settles after the id changed leaves the new record alone: no draft write, no onSaved', async () => {
        let settle: (row: Row) => void = () => {};
        const save = vi.fn(() => new Promise<Row>((resolve) => (settle = resolve)));
        const onSaved = vi.fn();
        const frame = createFrameKit({
            transport: createMemoryTransport({ rows: { members: MEMBERS } }, { save }),
            urlState: 'memory',
            can: () => true,
        });
        const { rerender } = render(
            <frame.Provider>
                <HookForm id="1" onSaved={onSaved} />
            </frame.Provider>,
        );
        await waitFor(() => expect(draft()).toBe('Ada Lovelace'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

        rerender(
            <frame.Provider>
                <HookForm id="2" onSaved={onSaved} />
            </frame.Provider>,
        );
        await waitFor(() => expect(draft()).toBe('Grace Hopper'));
        await act(async () => settle({ id: '1', name: 'Ada, saved' }));

        expect(draft()).toBe('Grace Hopper');
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('returns the record actions bound: pressing one invokes once and its result shows in the notice', async () => {
        const archive: ResourceActionDefinition = {
            key: 'archive',
            label: 'Archive',
            scope: 'record',
            method: 'POST',
            url: '/members/{id}/archive',
            input: null,
            result: 'toast',
            destructive: false,
        };
        const manifest: FrameManifest = {
            resources: [],
            contexts: {
                members: { byNode: {}, inherits: {}, known: KNOWN_CONTEXTS, actions: [archive], can: { actions: { archive: true } } },
            },
        };
        const invoke = vi.fn(async () => ({ message: 'Archived.', data: null }));
        const frame = createFrameKit({ transport: createMemoryTransport({ rows: { members: MEMBERS }, manifest }, { invoke }), urlState: 'memory' });

        const { rerender } = render(
            <frame.Provider>
                <HookForm id="1" />
            </frame.Provider>,
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));

        await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
        expect(invoke).toHaveBeenCalledWith(archive, { id: '1', data: undefined });
        expect((await screen.findByRole('status')).textContent).toContain('Archived.');

        rerender(
            <frame.Provider>
                <HookForm id={null} />
            </frame.Provider>,
        );
        await waitFor(() => expect(screen.getByTestId('actions').textContent).toBe('none'));
    });
});

/** frame-foundation 30 amend: the two defects the reviews found. */
describe('useEditShell and useListShell: amend regressions', () => {
    it('with a host keepPreviousData default, the previous record is never ready or saved under the new id', async () => {
        let second: (row: Row) => void = () => {};
        const save = vi.fn(async (_resource: string, id: string | null, data: unknown) => ({ id, ...(data as object) }) as Row);
        const transport = createMemoryTransport(
            {},
            {
                get: async (_resource: string, id: string) =>
                    id === '1' ? { id: '1', name: 'Ada Lovelace' } : new Promise<Row>((resolve) => (second = resolve)),
                save,
            },
        );
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, placeholderData: keepPreviousData } } });
        const frame = createFrameKit({ transport, queryClient, urlState: 'memory', can: () => true });
        const view = render(
            <frame.Provider>
                <HookForm id="1" />
            </frame.Provider>,
        );
        await waitFor(() => expect(draft()).toBe('Ada Lovelace'));

        view.rerender(
            <frame.Provider>
                <HookForm id="2" />
            </frame.Provider>,
        );
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(screen.getByTestId('status').textContent).not.toBe('ready');
        expect(draft()).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(save).not.toHaveBeenCalled();

        await act(async () => second({ id: '2', name: 'Grace Hopper' }));
        await waitFor(() => expect(draft()).toBe('Grace Hopper'));
        expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    const confirmOnly = (key: string, scope: 'record' | 'resource'): ResourceActionDefinition => ({
        key,
        label: key === 'archive' ? 'Archive' : 'Reindex',
        scope,
        method: 'POST',
        url: scope === 'record' ? '/members/{id}/' + key : '/members/' + key,
        input: null,
        result: 'toast',
        destructive: false,
    });
    const withActions = (): ContextManifest => ({
        byNode: {},
        inherits: {},
        known: KNOWN_CONTEXTS,
        actions: [confirmOnly('archive', 'record'), confirmOnly('reindex', 'resource')],
        can: { actions: { archive: true, reindex: true } },
    } as ContextManifest);

    it('an open record-action dialog survives a refresh to an equal manifest', async () => {
        const frame = createFrameKit({ transport: createMemoryTransport({ rows: { members: MEMBERS } }), urlState: 'memory' });
        const manifest = withActions();
        const view = render(
            <frame.Provider>
                <HookForm id="1" manifest={manifest} />
            </frame.Provider>,
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
        expect(await screen.findByRole('dialog')).toBeTruthy();

        view.rerender(
            <frame.Provider>
                <HookForm id="1" manifest={structuredClone(manifest)} />
            </frame.Provider>,
        );
        expect(screen.queryByRole('dialog')).toBeTruthy();
    });

    it('an open resource-action dialog survives a refresh to an equal manifest', async () => {
        function HookBar({ manifest }: { manifest: ContextManifest }) {
            const { ResourceActions } = useListShell({ resource: 'members', manifest });
            return ResourceActions ? <ResourceActions /> : null;
        }
        const frame = createFrameKit({ transport: createMemoryTransport({ rows: { members: MEMBERS } }), urlState: 'memory' });
        const manifest = withActions();
        const view = render(
            <frame.Provider>
                <HookBar manifest={manifest} />
            </frame.Provider>,
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Reindex' }));
        expect(await screen.findByRole('dialog')).toBeTruthy();

        view.rerender(
            <frame.Provider>
                <HookBar manifest={structuredClone(manifest)} />
            </frame.Provider>,
        );
        expect(screen.queryByRole('dialog')).toBeTruthy();
    });
});

/** frame-foundation 32 (interface decision, edits A and C): a typed action call that never rejects. */
describe('useResourceAction', () => {
    const archive: ResourceActionDefinition = {
        key: 'archive',
        label: 'Archive',
        scope: 'record',
        method: 'POST',
        url: '/members/{id}/archive',
        input: null,
        result: 'toast',
        destructive: false,
    };
    const manifest: FrameManifest = {
        resources: [],
        contexts: {
            members: { byNode: {}, inherits: {}, known: KNOWN_CONTEXTS, actions: [archive], can: { actions: { archive: true } } },
        },
    };

    async function call(target: { id?: string | null; data: null }, invoke: ReturnType<typeof vi.fn>) {
        const seen: { result?: unknown; error?: Error | null; available?: boolean } = {};
        let run: () => Promise<unknown> = async () => undefined;
        function Probe() {
            const action = useResourceAction('members', 'archive');
            seen.error = action.error;
            seen.available = action.available;
            run = () => action.invoke(target as never);
            return null;
        }
        const frame = createFrameKit({ transport: createMemoryTransport({ manifest }, { invoke: invoke as never }), urlState: 'memory' });
        render(
            <frame.Provider>
                <Probe />
            </frame.Provider>,
        );
        await waitFor(() => expect(seen.available).toBe(true));
        await act(async () => {
            seen.result = await run();
        });
        // The refusal lands on the mutation's state in the render that follows.
        await waitFor(() => expect(seen.error).toBeTruthy());
        return seen;
    }

    it('a record action with no id is refused on error and never reaches the transport', async () => {
        const invoke = vi.fn(async () => ({ message: 'Archived.' }));
        const seen = await call({ data: null }, invoke);

        expect(seen.result).toBeUndefined();
        expect(seen.error?.message).toContain('needs the record');
        expect(invoke).not.toHaveBeenCalled();
    });

    it("a server refusal resolves undefined and is the hook's error, unwrapped", async () => {
        const refusal = new Error('Not allowed.');
        const invoke = vi.fn(async () => {
            throw refusal;
        });
        const seen = await call({ id: '1', data: null }, invoke);

        expect(seen.result).toBeUndefined();
        expect(seen.error).toBe(refusal);
        expect(invoke).toHaveBeenCalledWith(archive, { id: '1', data: null });
    });
});
