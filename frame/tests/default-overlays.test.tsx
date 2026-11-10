import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultPrimitives } from '../src/primitives';

afterEach(cleanup);

/**
 * The REAL default overlays, mounted the way `DefaultContainer` mounts `SidePanel`: no `open`,
 * no `onOpenChange`, no `title`. An uncontrolled overlay shows, closes on its own Close button,
 * and has an accessible name; a controlled one follows `open` and reports through `onOpenChange`.
 */
describe.each([
    ['SidePanel', defaultPrimitives.SidePanel],
    ['Dialog', defaultPrimitives.Dialog!],
])('the default %s', (_name, Overlay) => {
    it('uncontrolled: shows with an accessible name', () => {
        render(<Overlay>Content</Overlay>);

        const dialog = screen.getByRole('dialog');
        const labelledBy = dialog.getAttribute('aria-labelledby');
        const name = dialog.getAttribute('aria-label') ?? (labelledBy ? document.getElementById(labelledBy)?.textContent : null);
        expect(name, 'the dialog has no accessible name').toBeTruthy();
    });

    it('uncontrolled: closes on its own Close button', () => {
        render(<Overlay>Content</Overlay>);
        expect(screen.getByRole('dialog')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('controlled: follows open and reports the close through onOpenChange', () => {
        const seen: boolean[] = [];
        function Host() {
            const [open, setOpen] = useState(true);
            return (
                <Overlay
                    open={open}
                    title="Edit member"
                    onOpenChange={(next: boolean) => {
                        seen.push(next);
                        setOpen(next);
                    }}
                >
                    Content
                </Overlay>
            );
        }
        render(<Host />);

        expect(screen.getByRole('dialog', { name: 'Edit member' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(seen).toEqual([false]);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
