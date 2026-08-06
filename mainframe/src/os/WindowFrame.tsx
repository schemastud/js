/**
 * `WindowFrame` — the ONE place `react-rnd` is imported (Frame OS ticket 03).
 *
 * This is the geometry seam: react-rnd (the invisible geometry atom) draws the drag/resize handles
 * and reports live coordinates; every geometry *decision* (snap zones, tiling, z-order, min/max)
 * lives in the pure reducer. A guard test fails if `react-rnd` is imported anywhere but this file, so
 * the wheel stays swappable (`dockview` is the deferred second wheel behind this same seam).
 *
 * The frame is intentionally chrome-light: it positions/sizes a window and wires drag→`move`,
 * resize→`resize`, and pointer-down→`focus`. Title bars, controls, and per-window toolbars are the
 * `os` mode's `window.chrome` / `window.toolbar` slots (ticket 04), passed in as `children`.
 */
import { type CSSProperties, type ReactNode } from 'react';
import { Rnd } from 'react-rnd';

import type { Geometry } from './windowManager';

export interface WindowFrameProps {
    /** The window's current rectangle (from the reducer). */
    geometry: Geometry;
    /** Paint z-index (from `zIndexOf`). Higher is nearer the front. */
    zIndex: number;
    /** Drag handle selector — only elements with this class initiate a drag (the title bar). */
    dragHandleClassName?: string;
    /** Constrain dragging/resizing to the parent element. Default `'parent'`. */
    bounds?: string | false;
    /** Minimum size guards passed to react-rnd. */
    minWidth?: number;
    minHeight?: number;
    /** Disable interaction (e.g. a maximized/snapped window that should not drag). */
    disableDragging?: boolean;
    enableResizing?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Geometry callbacks — dispatch straight into the reducer's `move`/`resize`/`focus` ops. */
    onMove: (x: number, y: number) => void;
    onResize: (width: number, height: number, x: number, y: number) => void;
    onFocus: () => void;
    /** The window body — the nested Mainframe scope + its chrome (ticket 04). */
    children: ReactNode;
}

export function WindowFrame({
    geometry,
    zIndex,
    dragHandleClassName,
    bounds = 'parent',
    minWidth = 240,
    minHeight = 160,
    disableDragging,
    enableResizing = true,
    className,
    style,
    onMove,
    onResize,
    onFocus,
    children,
}: WindowFrameProps) {
    return (
        <Rnd
            size={{ width: geometry.width, height: geometry.height }}
            position={{ x: geometry.x, y: geometry.y }}
            bounds={bounds === false ? undefined : bounds}
            minWidth={minWidth}
            minHeight={minHeight}
            dragHandleClassName={dragHandleClassName}
            disableDragging={disableDragging}
            enableResizing={enableResizing}
            style={{ zIndex, ...style }}
            className={className}
            onMouseDown={onFocus}
            onDragStop={(_e, d) => onMove(Math.round(d.x), Math.round(d.y))}
            onResizeStop={(_e, _dir, ref, _delta, position) =>
                onResize(ref.offsetWidth, ref.offsetHeight, Math.round(position.x), Math.round(position.y))
            }
        >
            {children}
        </Rnd>
    );
}
