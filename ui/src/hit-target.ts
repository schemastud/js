/**
 * C40 (UX04) — a composable mobile hit-target floor, the single source of truth for the 44px rule.
 *
 * Add it to any small icon/chip control (via the control's own `className`, whatever its element —
 * `<button>`, `<a>`, a pill). It leaves the control's visual footprint AND the surrounding layout
 * unchanged: the expansion is an `absolute`, paint-free `::before` overlay, so it adds no layout box
 * and no pixels. Below the 768px (`md`) breakpoint it widens the INTERACTIVE target to 44×44; at
 * desktop width `md:before:hidden` removes it entirely, so the desktop footprint is provably unchanged.
 * The control keeps its own size/variant classes, its native keyboard behaviour, and its accessible
 * name. The shared {@link Button} `icon` size composes this same constant — do not duplicate the tokens.
 */
export const hitTargetFloor =
    'relative before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""] md:before:hidden';
