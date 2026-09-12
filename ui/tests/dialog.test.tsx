import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../src/index';

/**
 * The dialog's OVERFLOW CONTRACT, guarded here because jsdom cannot measure the failure it stands
 * for and no browser test in this package can either.
 *
 * `DialogContent` is `position: fixed` and centred by translate, so a dialog taller than the
 * viewport hangs off both ends with nothing to scroll — its footer, and therefore its confirm
 * button, is unreachable for a human and unclickable for a driver. Measured 2026-09-12 on
 * splicewire-app `/ui/settings/tokens`: an 860px packaged mint dialog in a 720px viewport put
 * "Mint token" 45px below the fold and Playwright spent 30s reporting "element is outside of the
 * viewport".
 *
 * Two classes are what prevent it, so those two are asserted by name. A future rewrite that keeps
 * the bound by other means (a scrollable body slot, say) should replace this test with one that
 * asserts THAT — not delete it.
 */
describe('DialogContent overflow contract', () => {
    it('bounds its height to the viewport and scrolls its own overflow', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tall dialog</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <button type="button">Confirm</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>,
        );

        const content = screen.getByRole('dialog');

        expect(content.className).toContain('max-h-[calc(100%-2rem)]');
        expect(content.className).toContain('overflow-y-auto');
    });

    it('still takes a caller class without losing the bound', () => {
        render(
            <Dialog open>
                <DialogContent className="sm:max-w-lg">
                    <DialogTitle>Widened dialog</DialogTitle>
                </DialogContent>
            </Dialog>,
        );

        const content = screen.getByRole('dialog');

        expect(content.className).toContain('sm:max-w-lg');
        expect(content.className).toContain('overflow-y-auto');
    });
});
