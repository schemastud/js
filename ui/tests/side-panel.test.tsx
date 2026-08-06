import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ListState, ListSkeleton, SidePanel } from '../src/index';

// No global auto-cleanup is configured in this package's vitest setup, and
// SidePanel portals into document.body — clean up after each case so DOM from
// one test never leaks into the next.
afterEach(cleanup);

/**
 * The isolation bar (rehome-components §8a): the promoted list-state + side-panel
 * primitives render off a plain fixture with NO Laravel, NO app context, NO `@/` —
 * proving they are portable foundation code (Frame OS ticket 18 relocation).
 */

describe('SidePanel', () => {
    it('renders nothing while closed and the editor body + footer once open', () => {
        const { rerender } = render(
            <SidePanel open={false} onOpenChange={() => {}} title="Edit fragment">
                <div>body</div>
            </SidePanel>,
        );
        expect(screen.queryByText('Edit fragment')).toBeNull();

        rerender(
            <SidePanel open onOpenChange={() => {}} title="Edit fragment" description="a hint">
                <div>body</div>
            </SidePanel>,
        );
        expect(screen.getByText('Edit fragment')).toBeTruthy();
        expect(screen.getByText('a hint')).toBeTruthy();
        expect(screen.getByText('body')).toBeTruthy();
        // Default footer actions.
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('fires onSave, and onCancel falls back to closing when no onCancel is given', () => {
        const onSave = vi.fn();
        const onOpenChange = vi.fn();
        render(
            <SidePanel open onOpenChange={onOpenChange} title="t" onSave={onSave}>
                <div />
            </SidePanel>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('hides the footer when hideFooter is set and shows a saving label', () => {
        const { rerender } = render(
            <SidePanel open onOpenChange={() => {}} title="t" hideFooter>
                <div />
            </SidePanel>,
        );
        expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();

        rerender(
            <SidePanel open onOpenChange={() => {}} title="t" saving>
                <div />
            </SidePanel>,
        );
        const save = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
        expect(save.disabled).toBe(true);
    });
});

describe('ListState', () => {
    it('shows a shaped skeleton on first load (pending, no items)', () => {
        render(
            <ListState isPending hasItems={false}>
                <div>content</div>
            </ListState>,
        );
        expect(screen.getByTestId('list-skeleton')).toBeTruthy();
        expect(screen.queryByText('content')).toBeNull();
    });

    it('keeps previous content dimmed while refetching (pending with items)', () => {
        render(
            <ListState isPending hasItems>
                <div>content</div>
            </ListState>,
        );
        expect(screen.getByText('content')).toBeTruthy();
        expect(screen.queryByTestId('list-skeleton')).toBeNull();
    });

    it('renders children plainly when settled', () => {
        render(
            <ListState isPending={false} hasItems>
                <div>content</div>
            </ListState>,
        );
        expect(screen.getByText('content')).toBeTruthy();
    });

    it('ListSkeleton renders the requested number of shaped cards', () => {
        render(<ListSkeleton rows={4} />);
        expect(screen.getAllByTestId('skeleton-card')).toHaveLength(4);
    });
});
