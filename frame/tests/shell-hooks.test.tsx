import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditShell, useListShell } from '../src';
import { KNOWN_CONTEXTS } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { ListShell } from '../src/ListShell';
import { createMemoryTransport } from '../src/testing';
import type { FrameManifest, ResourceActionDefinition, Row } from '../src/types';

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

const MEMBERS: Row[] = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Grace Hopper' },
];

/** A custom form over the hook: the draft, an edit, a save, the bound record actions and the notice region. */
function HookForm({ id, onSaved }: { id: string | null; onSaved?: (record: unknown) => void }) {
    const edit = useEditShell({ resource: 'members', id, onSaved });
    const { RecordActions } = edit.actions;
    return (
        <div>
            <span data-testid="draft">{String(edit.draft.name ?? '')}</span>
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
