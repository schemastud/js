import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import type { FrameInjection } from '../src/types';

afterEach(cleanup);

/**
 * ⚠️ `container="page"` used to render a DRAWER, and it typechecked.
 *
 * `PageContainer` resolved `primitives.Dialog ?? primitives.SidePanel`. `Dialog` is optional on
 * `FramePrimitives`, and no host in this estate registers one — the flagship's
 * `ui/src/frame/primitives.tsx` registers `SidePanel` and nothing else — so every route asking for a
 * full page got a side panel. Nothing reported it: the types allowed it, the component rendered, and the
 * only symptom was a form appearing in the wrong chrome.
 *
 * It matters more now than it did, because `createMountDispatcher` drives `container: 'page'` from a
 * DECLARATION. Shipping the dispatcher without this fix would have put a drawer on every full-page edit
 * route the manifest declares, at once.
 */
const transport = {
    list: async () => ({ data: [], total: 0, page: 1, perPage: 25 }),
    get: async (_r: string, id: string) => ({ id, title: 'Alpha' }),
    getFormSchema: async () => ({ type: 'object', properties: { title: { type: 'string' } } }),
    save: async (_r: string, id: string | null, data: Record<string, unknown>) => ({ id: id ?? '1', ...data }),
    remove: async () => undefined,
};

const basePrimitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <div>{children}</div>,
    Skeleton: () => <div />,
};

// A lightweight FormBody, so this file tests the shell's CONTAINER rather than RJSF in jsdom.
const MockFormBody = () => <div data-testid="form-body" />;

const wrap = (primitives: Record<string, unknown>) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const value = {
        transport,
        primitives: { ...basePrimitives, ...primitives },
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref: string) => ({ $id: ref }),
        can: () => true,
    } as unknown as FrameInjection;

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={value}>{children}</FrameProvider>
        </QueryClientProvider>
    );
};

const SidePanel = ({ children }: any) => <div data-testid="side-panel">{children}</div>;

const renderPageEdit = (primitives: Record<string, unknown>) =>
    render(<EditShell resource="widgets" id="1" container="page" slots={{ FormBody: MockFormBody }} />, {
        wrapper: wrap({ SidePanel, ...primitives }),
    });

describe('EditShell container="page"', () => {
    it('renders a plain full-surface region when the host registers no Page primitive', async () => {

        renderPageEdit({});

        // The regression: this used to be a side panel, because Dialog was absent and SidePanel was the
        // fallback. A page and an overlay are different things, not stronger and weaker versions of one.
        await waitFor(() => expect(document.querySelector('[data-frame-container="page"]')).not.toBeNull());
        expect(screen.queryByTestId('side-panel')).toBeNull();
    });

    it('never falls back to SidePanel even when the host registers a Dialog', async () => {
        const Dialog = ({ children }: any) => <div data-testid="dialog">{children}</div>;

        renderPageEdit({ Dialog });

        // Waited for, so this asserts the RENDERED container rather than the loading state — the shape of
        // a test that would otherwise pass by not getting there.
        await waitFor(() => expect(document.querySelector('[data-frame-container="page"]')).not.toBeNull());
        // A registered Dialog is for a MODAL, and `container="page"` is not asking for one.
        expect(screen.queryByTestId('dialog')).toBeNull();
        expect(screen.queryByTestId('side-panel')).toBeNull();
    });

    it('uses the host Page primitive when one is registered', async () => {
        const Page = ({ children }: any) => <main data-testid="page">{children}</main>;

        renderPageEdit({ Page });

        expect(await screen.findByTestId('page')).toBeTruthy();
        expect(screen.queryByTestId('side-panel')).toBeNull();
    });

    it('still uses the SidePanel for the default panel container, which is unchanged', async () => {

        render(<EditShell resource="widgets" id="1" slots={{ FormBody: MockFormBody }} />, {
            wrapper: wrap({ SidePanel }),
        });

        expect(await screen.findByTestId('side-panel')).toBeTruthy();
    });
});
