import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from '../src/index';

// C40 (UX04): the shared icon control must offer an ~44×44 interactive target at mobile (390px) while
// its desktop visual footprint and the surrounding layout stay exactly as they were. jsdom can't
// measure the rendered 44px, so this pins the mechanism: the 36px (`size-9`) icon box keeps its size,
// and below `md` an invisible, layout-free (`absolute`) 44px (`size-11`) centered `::before` overlay
// widens only the hit area — removed at desktop via `md:before:hidden`. Accessible name + native
// keyboard behaviour are unchanged.
afterEach(cleanup);

describe('Button icon control mobile hit-target floor (C40 / UX04)', () => {
    it('an icon button keeps its 36px footprint, gains the 44px mobile floor, and keeps its accessible name + keyboard', () => {
        render(
            <Button size="icon" aria-label="Toggle dark mode">
                <svg />
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Toggle dark mode' });
        expect(btn.tagName).toBe('BUTTON');

        const cls = btn.className;
        // Visual footprint unchanged: still the 36px box.
        expect(cls).toContain('size-9');
        // Mobile hit-target floor: an invisible, layout-free 44px centered ::before overlay …
        expect(cls).toContain('relative');
        expect(cls).toContain('before:absolute');
        expect(cls).toContain('before:size-11');
        // … gone at desktop width, so the desktop footprint + surrounding layout are unchanged.
        expect(cls).toContain('md:before:hidden');

        // Keyboard-operable: a native, focusable button.
        btn.focus();
        expect(document.activeElement).toBe(btn);
    });

    it('non-icon sizes do not acquire the hit-target overlay (the floor is the icon control only)', () => {
        const { rerender } = render(<Button size="default">Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' }).className).not.toContain('before:size-11');

        rerender(<Button size="sm">Edit</Button>);
        expect(screen.getByRole('button', { name: 'Edit' }).className).not.toContain('before:size-11');

        rerender(<Button size="lg">Continue</Button>);
        expect(screen.getByRole('button', { name: 'Continue' }).className).not.toContain('before:size-11');
    });
});
