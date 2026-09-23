// Field colours for seam's form widgets. Each chains the host's semantic token, then the schemastud
// `--stud-*` token, then a literal, the same order big-calendar's theme uses. Only Storybook's
// preview declares `--stud-*`; a Beam host themes with shadcn tokens (`--input`, `--background`,
// `--foreground`). A bare `var(--stud-line-strong)` resolves to nothing there, which rendered the
// Frame console's Realm combobox as a borderless, transparent input (ux-demo replay, 2026-09-23).
export const FIELD_BORDER = 'var(--input, var(--stud-line-strong, oklch(0.87 0.01 248)))';
export const FIELD_SURFACE = 'var(--background, var(--stud-surface, oklch(1 0 0)))';
export const FIELD_INK = 'var(--foreground, var(--stud-ink, oklch(0.21 0.04 265)))';
