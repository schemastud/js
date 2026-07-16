// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameProvider } from '../src/context';
import { createWidgetRegistry } from '@schemastud/seam';
import {
    ShadcnCell,
    ShadcnEmpty,
    ShadcnEnrichTextarea,
    ShadcnTable,
    shadcnEditSlots,
    shadcnListSlots,
} from '../src/shadcn';
import type { FrameInjection, Row } from '../src/types';

afterEach(cleanup);

const COLUMNS = [
    { field: 'name', header: 'Name' },
    { field: 'enabled', header: 'Enabled' },
];
const ROWS: Row[] = [
    { id: '1', name: 'Alpha', enabled: true },
    { id: '2', name: 'Beta', enabled: false },
];

// The enrich textarea + toolbar/pagination reach primitives.Button through the
// injection; a tagged fake proves the injected atom (not raw HTML) is used.
const injection = {
    primitives: {
        Button: ({ children, ...p }: any) => (
            <button data-injected="Button" {...p}>
                {children}
            </button>
        ),
    },
} as unknown as FrameInjection;

function wrap({ children }: { children: ReactNode }) {
    return <FrameProvider value={injection}>{children}</FrameProvider>;
}

describe('@schemastud/frame/shadcn preset', () => {
    it('exposes the list + edit slot bundles', () => {
        expect(Object.keys(shadcnListSlots)).toEqual(
            expect.arrayContaining(['Table', 'Cell', 'Empty', 'Toolbar', 'Pagination']),
        );
        expect(Object.keys(shadcnEditSlots)).toEqual(expect.arrayContaining(['Toggle', 'SaveBar']));
    });

    it('ShadcnTable renders a styled row per record, opening on click', () => {
        const onOpen = vi.fn();
        const { container, getByText } = render(
            <ShadcnTable columns={COLUMNS} rows={ROWS} onOpen={onOpen} Cell={ShadcnCell} />,
        );
        expect(getByText('Name')).toBeTruthy(); // header
        const rows = container.querySelectorAll('[data-frame-row]');
        expect(rows).toHaveLength(2);
        // shadcn-convention classes (read the host's CSS vars) are present, not inline styles.
        expect(container.querySelector('[data-frame-slot="Table"]')?.className).toContain('border-border');
        fireEvent.click(rows[0]);
        expect(onOpen).toHaveBeenCalledWith(ROWS[0]);
    });

    it('ShadcnCell renders empty + boolean values, delegating otherwise', () => {
        const emDash = render(<ShadcnCell column={{ field: 'x' }} record={{ x: null }} />);
        expect(emDash.getByText('—')).toBeTruthy();
        const bool = render(<ShadcnCell column={{ field: 'enabled' }} record={{ enabled: true }} />);
        expect(bool.getByText('Yes')).toBeTruthy();
    });

    it('ShadcnEmpty renders the empty state', () => {
        const { getByText } = render(<ShadcnEmpty />);
        expect(getByText('No records.')).toBeTruthy();
    });

    it('ShadcnEnrichTextarea renders a textarea + injected Button and fires onEnrich', () => {
        const onEnrich = vi.fn();
        const onChange = vi.fn();
        const { container, getByText } = render(
            <ShadcnEnrichTextarea id="root_interp" value="hi" onChange={onChange} onEnrich={onEnrich} />,
            { wrapper: wrap },
        );
        const ta = container.querySelector('textarea');
        expect(ta).toBeTruthy();
        expect((ta as HTMLTextAreaElement).value).toBe('hi');
        const btn = container.querySelector('[data-frame-action="enrich"]');
        expect(btn?.getAttribute('data-injected')).toBe('Button'); // the injected atom, not raw HTML
        fireEvent.click(getByText('✨ Enrich with Splicewire'));
        expect(onEnrich).toHaveBeenCalled();
    });

    it('ShadcnEnrichTextarea hides the action when readOnly', () => {
        const { container } = render(
            <ShadcnEnrichTextarea id="x" value="" onChange={vi.fn()} onEnrich={vi.fn()} readOnly />,
            { wrapper: wrap },
        );
        expect(container.querySelector('[data-frame-action="enrich"]')).toBeNull();
    });
});

// The registry import keeps parity with the main suite's setup and guards the
// subpath's peer resolution under the test runner.
void createWidgetRegistry;
