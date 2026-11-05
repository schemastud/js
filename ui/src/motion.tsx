import * as React from 'react';
import { cn } from './cn';

/**
 * The state-transition primitives `motion.css` styles (owner-review 18, ruled 2026-11-02).
 *
 * Each is a thin, host-neutral wrapper that puts the right class on the right element at the
 * right moment; the timing lives in `motion.css` (tokens + per-piece reduced motion). A host that
 * has not imported `motion.css` gets the same DOM with no animation, never a stuck state: every
 * piece that waits on an `animationend` also has a fallback timer.
 */

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** Longest a closing piece waits for its `animationend` before it settles anyway. */
const SETTLE_FALLBACK_MS = 400;

// ── B1 · faces ────────────────────────────────────────────────────────────────────────────

export interface MotionFace {
    key: string;
    node: React.ReactNode;
}

/**
 * B1 — every label stacked in one grid cell, so the widest one holds the width and the active
 * one fades up 2 px on the feedback token. Inactive faces are `aria-hidden`, so the accessible
 * name is the active label only.
 */
export function MotionFaces({
    active,
    faces,
    className,
    faceClassName,
}: {
    active: string;
    faces: readonly MotionFace[];
    className?: string;
    faceClassName?: string;
}) {
    return (
        <span className={cn('motion-faces', className)}>
            {faces.map((face) => (
                <span
                    key={face.key}
                    className={cn('motion-face', faceClassName)}
                    data-face={face.key}
                    data-on={face.key === active}
                    aria-hidden={face.key === active ? undefined : true}
                >
                    {face.node}
                </span>
            ))}
        </span>
    );
}

// ── C1 / C2 · detail swap ─────────────────────────────────────────────────────────────────

export type DetailSwapMotion = 'soft-cut' | 'push' | 'back' | 'none';

const SWAP_CLASS: Record<DetailSwapMotion, string | undefined> = {
    'soft-cut': 'motion-soft-cut',
    push: 'motion-push',
    back: 'motion-back',
    none: undefined,
};

/**
 * C1 / C2 — the detail pane of a list → detail layout. The first content renders as is (the
 * route enter already covers it); each later `swapKey` re-keys the element so its motion runs
 * once: `soft-cut` (C1, desktop: 120 ms opacity), `push` / `back` (C2, the phone stack: 16 px
 * from the side the content came from). Re-keying remounts the subtree, which is the point: the
 * old record's local state does not leak into the new one.
 */
export function DetailSwap({
    swapKey,
    motion = 'soft-cut',
    className,
    children,
    ...rest
}: { swapKey: React.Key; motion?: DetailSwapMotion } & React.HTMLAttributes<HTMLDivElement> & {
        [data: `data-${string}`]: unknown;
    }) {
    // Animate from the first swap on, including a return to the first key (Back to the list).
    const [previous, setPrevious] = React.useState(swapKey);
    const [swapped, setSwapped] = React.useState(false);
    if (previous !== swapKey) {
        setPrevious(swapKey);
        setSwapped(true);
    }
    const animate = swapped || previous !== swapKey;
    return (
        <div key={swapKey} {...rest} className={cn(animate && SWAP_CLASS[motion], className)}>
            {children}
        </div>
    );
}

// ── D3 · changed cell ─────────────────────────────────────────────────────────────────────

/**
 * D3 — a cell whose value can change under a live list. It rolls its new content up 6 px from
 * 0.4 opacity only when `value` differs from the last render's; a mount, a re-render with the
 * same value, or a reorder (stable row keys) leaves it still.
 *
 * In a `DataTable`, give rows a stable identity (`rowId`, or a string `id`) and keep the column
 * definitions stable (`useMemo`): TanStack renders each `cell` function as a component, so a
 * column set rebuilt on every render remounts the cell and it can never roll.
 */
export function ChangedCell({
    value,
    className,
    children,
}: {
    value: string | number | boolean | null | undefined;
    className?: string;
    children: React.ReactNode;
}) {
    // The "adjust state while rendering" pattern: the change count moves only when the value does.
    const [previous, setPrevious] = React.useState(value);
    const [changes, setChanges] = React.useState(0);
    if (!Object.is(previous, value)) {
        setPrevious(value);
        setChanges(changes + 1);
    }
    return (
        <span className={cn('motion-cell', className)}>
            <span key={changes} className={changes > 0 ? 'motion-cell-roll' : undefined}>
                {children}
            </span>
        </span>
    );
}

// ── D2 · row presence ─────────────────────────────────────────────────────────────────────

/**
 * D2 — a row the operator inserted or archived. `appear` opens its height on mount (an insert);
 * `open={false}` closes it, makes it inert, and calls `onClosed` once the height has closed (or,
 * under reduced motion, once it has faded), so the caller can drop it from the list. Rows that
 * change remotely should not use `appear`: only the cell rolls (D3).
 */
export function MotionRow({
    open = true,
    appear = false,
    onClosed,
    className,
    children,
    as: Tag = 'div',
}: {
    open?: boolean;
    appear?: boolean;
    onClosed?: () => void;
    className?: string;
    children: React.ReactNode;
    as?: 'div' | 'li';
}) {
    const [entering, setEntering] = React.useState(appear);
    const closed = React.useRef(false);
    const onClosedRef = React.useRef(onClosed);
    onClosedRef.current = onClosed;

    const settleClosed = React.useCallback(() => {
        if (closed.current) return;
        closed.current = true;
        onClosedRef.current?.();
    }, []);

    React.useEffect(() => {
        if (open) {
            closed.current = false;
            return;
        }
        const timer = window.setTimeout(settleClosed, SETTLE_FALLBACK_MS);
        return () => window.clearTimeout(timer);
    }, [open, settleClosed]);

    const motion = !open ? 'close' : entering ? 'open' : undefined;

    return (
        <Tag
            className={cn('motion-row', className)}
            data-motion={motion}
            inert={!open || undefined}
            onAnimationEnd={(event: React.AnimationEvent<HTMLElement>) => {
                if (event.target !== event.currentTarget) return;
                if (motion === 'open') setEntering(false);
                if (motion !== 'close') return;
                const name = event.animationName;
                if (name === 'swc-row-close' || (name === 'swc-fade-out' && prefersReducedMotion())) {
                    settleClosed();
                }
            }}
        >
            <div>{children}</div>
        </Tag>
    );
}

/**
 * D2 — FLIP for the operator's own re-sort. Call `capture()` just before the state change that
 * reorders the list, and give each row `ref={register(id)}`; after the reorder every row slides
 * from its old place (180 ms, ease-out). Remote reorders never call `capture()`, so they cut.
 * Reduced motion: no slide.
 */
export function useFlip<T extends HTMLElement = HTMLElement>() {
    const elements = React.useRef(new Map<string, T>());
    const refs = React.useRef(new Map<string, (el: T | null) => void>());
    const before = React.useRef<Map<string, number> | null>(null);

    React.useLayoutEffect(() => {
        const first = before.current;
        if (!first) return;
        before.current = null;
        if (prefersReducedMotion()) return;
        elements.current.forEach((el, id) => {
            const top = first.get(id);
            if (top === undefined || typeof el.animate !== 'function') return;
            const dy = top - el.getBoundingClientRect().top;
            if (Math.abs(dy) < 1) return;
            el.animate([{ translate: `0 ${dy}px` }, { translate: '0 0' }], {
                duration: 180,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            });
        });
    });

    const capture = React.useCallback(() => {
        const tops = new Map<string, number>();
        elements.current.forEach((el, id) => tops.set(id, el.getBoundingClientRect().top));
        before.current = tops;
    }, []);

    const register = React.useCallback((id: string) => {
        let ref = refs.current.get(id);
        if (!ref) {
            ref = (el: T | null) => {
                if (el) elements.current.set(id, el);
                else elements.current.delete(id);
            };
            refs.current.set(id, ref);
        }
        return ref;
    }, []);

    return { capture, register };
}
