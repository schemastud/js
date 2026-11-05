import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SavePill } from '../src/SavePill';
import { ShadcnSaveBar } from '../src/shadcn/edit-slots';
import { DefaultSaveBar } from '../src/slots/defaults';
import { createWidgetRegistry } from '@schemastud/seam';
import type { ReactNode } from 'react';
import { FrameProvider } from '../src/context';
import { MockMount, createMockTransport, makeMount, mockPrimitives } from '../src/story-harness';
import type { FrameInjection } from '../src/types';

afterEach(cleanup);

/**
 * B1 (owner-review 18, ruled 2026-11-02): a steady pill and button — width held, label fading
 * up. The timing is `@schemastud/ui/motion.css`; what is asserted here is the DOM it keys on:
 * every face stacked in one `.motion-faces` cell, one face on, the rest `aria-hidden`.
 */
function pill(state: { dirty: boolean; saving: boolean }) {
    return (
        <MockMount value={makeMount(state)}>
            <SavePill />
        </MockMount>
    );
}

function activeFace(container: HTMLElement) {
    return container.querySelector('.motion-face[data-on="true"]')?.getAttribute('data-face');
}

describe('SavePill (B1)', () => {
    it('stacks every face in one cell so the pill never changes width', () => {
        const { container } = render(pill({ dirty: false, saving: false }));
        const root = container.querySelector('[data-frame-save-pill]') as HTMLElement;
        expect(root.classList.contains('motion-faces')).toBe(true);
        expect(root.querySelectorAll('.motion-face')).toHaveLength(4);
        expect(root.querySelectorAll('.motion-face[aria-hidden="true"]')).toHaveLength(4);
        // One face visible without motion.css: the rest are hidden inline.
        const visible = Array.from(root.querySelectorAll<HTMLElement>('.motion-face')).filter((f) => f.style.opacity !== '0');
        expect(visible).toHaveLength(1);
    });

    it('announces the state once, politely, by its label', () => {
        const { rerender } = render(pill({ dirty: true, saving: false }));
        expect(screen.getByRole('status').textContent).toBe('Unsaved');
        rerender(pill({ dirty: true, saving: true }));
        expect(screen.getByRole('status').textContent).toBe('Saving…');
    });

    it('a settled save is green for a beat, then rests neutral', () => {
        vi.useFakeTimers();
        try {
            const { container, rerender } = render(pill({ dirty: true, saving: true }));
            expect(activeFace(container)).toBe('saving');
            rerender(pill({ dirty: false, saving: false }));
            expect(container.querySelector('[data-frame-save-pill]')?.getAttribute('data-frame-save-pill')).toBe('saved');
            expect(activeFace(container)).toBe('saved');
            act(() => {
                vi.advanceTimersByTime(1400);
            });
            expect(activeFace(container)).toBe('rest');
            expect(screen.getByRole('status').textContent).toBe('Saved');
        } finally {
            vi.useRealTimers();
        }
    });

    it('opens clean at rest — nothing was just saved', () => {
        const { container } = render(pill({ dirty: false, saving: false }));
        expect(activeFace(container)).toBe('rest');
    });
});

function Frame({ children }: { children: ReactNode }) {
    const injection: FrameInjection = {
        transport: createMockTransport({}),
        primitives: mockPrimitives,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({}),
        can: () => true,
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
    };
    return <FrameProvider value={injection}>{children}</FrameProvider>;
}

describe('Save bars (B1)', () => {
    const props = { saving: false, canSubmit: true, readOnly: false, onSave: () => {}, onCancel: () => {} };

    for (const [name, Bar] of [
        ['ShadcnSaveBar', ShadcnSaveBar],
        ['DefaultSaveBar', DefaultSaveBar],
    ] as const) {
        it(`${name} holds Save and Saving… in one cell and is named by the active one`, () => {
            const { rerender } = render(
                <Frame>
                    <Bar {...props} />
                </Frame>,
            );
            const save = screen.getByRole('button', { name: 'Save' });
            expect(save.querySelectorAll('.motion-faces > .motion-face')).toHaveLength(2);
            // Without motion.css (a standalone frame host) exactly one label shows: the hiding is inline.
            const [idle, busy] = Array.from(save.querySelectorAll<HTMLElement>('.motion-face'));
            expect(idle.style.opacity).toBe('');
            expect(busy.style.opacity).toBe('0');
            rerender(
                <Frame>
                    <Bar {...props} saving />
                </Frame>,
            );
            const saving = screen.getByRole('button', { name: 'Saving…' });
            expect(saving.hasAttribute('disabled')).toBe(true);
        });
    }
});
