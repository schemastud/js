// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The motion vocabulary's contract (owner-review 18, ruled 2026-11-02: A2, B1, C1 + C2, D3 + D2).
 * jsdom cannot run a CSS animation, so the stylesheet is read as text and its ruled values and
 * per-piece reduced-motion guards are asserted by name.
 */
const css = readFileSync(fileURLToPath(new URL('../src/motion.css', import.meta.url)), 'utf8');
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

/** The body of the one `@media (prefers-reduced-motion: reduce)` block. */
function reducedBlock(): string {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
    }
    throw new Error('unterminated reduced-motion block');
}

/** The declarations of the first rule whose selector contains `selector` (outside @media). */
function ruleFor(source: string, selector: string): string {
    const at = source.indexOf(selector);
    expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
    const open = source.indexOf('{', at);
    return source.slice(open, source.indexOf('}', open) + 1);
}

describe('motion.css', () => {
    it('is exported as a package subpath and shipped in files', () => {
        expect(pkg.exports['./motion.css']).toBe('./src/motion.css');
        expect(pkg.files).toContain('src');
    });

    it('keeps the UI-18 tokens and adds the A2 enter/exit pair and the feedback tier', () => {
        expect(css).toMatch(/:where\(:root\)\s*\{/);
        expect(css).toContain('--splice-motion-duration: 180ms;');
        expect(css).toContain('--splice-motion-ease: cubic-bezier(0.32, 0.72, 0, 1);');
        expect(css).toContain('--splice-motion-enter: 200ms;');
        expect(css).toContain('--splice-motion-exit: 140ms;');
        expect(css).toContain('--splice-motion-feedback: 120ms;');
        expect(css).toContain('--splice-motion-feedback-exit: 90ms;');
        expect(css).toContain('--splice-motion-ease-out:');
        expect(css).toContain('--splice-motion-ease-in:');
    });

    it('defines the three host utilities the primitives name', () => {
        for (const u of ['motion-standard', 'route-enter', 'list-cross-fade']) {
            expect(css).toContain(`@utility ${u} {`);
        }
    });

    it('A2: overlays enter on ease-out at the enter token and leave on ease-in at the exit token', () => {
        const open = ruleFor(css, "[data-slot='dialog-content']\n    )[data-state='open']");
        expect(open).toContain('--tw-duration: var(--splice-motion-enter)');
        expect(open).toContain('--tw-ease: var(--splice-motion-ease-out)');
        const closed = ruleFor(css, "[data-slot='dialog-content']\n    )[data-state='closed']");
        expect(closed).toContain('--tw-duration: var(--splice-motion-exit)');
        expect(closed).toContain('--tw-ease: var(--splice-motion-ease-in)');
        for (const slot of ['sheet-overlay', 'sheet-content', 'side-panel-content', 'dialog-overlay']) {
            expect(css).toContain(`[data-slot='${slot}']`);
        }
    });

    it('A2: a sheet travels 32 px from its own edge, the dialog scales from 97 %, the popover is feedback-tier', () => {
        expect(css).toContain('--splice-motion-sheet-travel: 32px;');
        expect(ruleFor(css, "[data-side='right'][data-state]")).toContain(
            '--tw-enter-translate-x: var(--splice-motion-sheet-travel)',
        );
        expect(ruleFor(css, "[data-slot='dialog-content'][data-state] {")).toContain('--tw-enter-scale: 0.97');
        expect(ruleFor(css, "[data-slot='popover-content'][data-state='open']")).toContain(
            '--tw-duration: var(--splice-motion-feedback)',
        );
        expect(ruleFor(css, "[data-slot='popover-content'][data-state='closed']")).toContain(
            '--tw-duration: var(--splice-motion-feedback-exit)',
        );
    });

    it('ships only the ruled variants — no prototype variant keys', () => {
        expect(css).not.toMatch(/data-mv/);
        expect(css).not.toMatch(/\b(rows-wash|save-tick|save-echo|ld-title|view-transition)\b/);
    });

    it('B1, C1, C2, D3 and D2 each have their class', () => {
        for (const cls of [
            '.motion-faces',
            '.motion-face',
            '.motion-soft-cut',
            '.motion-push',
            '.motion-back',
            '.motion-cell-roll',
            ".motion-row[data-motion='open']",
            ".motion-row[data-motion='close']",
        ]) {
            expect(css).toContain(cls);
        }
        expect(ruleFor(css, '.motion-soft-cut {')).toContain('var(--splice-motion-feedback)');
    });

    it('reads the D3 roll and the D2 FLIP from tokens', () => {
        expect(css).toContain('--splice-motion-roll: 160ms;');
        expect(css).toContain('--splice-motion-flip: 180ms;');
        expect(ruleFor(css, '.motion-cell-roll {')).toContain('var(--splice-motion-roll)');
    });

    it('collapses motion it does not know to instant, and keeps a short fade for every vocabulary piece', () => {
        const reduced = reducedBlock();
        // The fallback for a switch thumb, a rotating chevron or a host's own keyframes.
        expect(reduced).toContain('animation-duration: 0.01ms !important');
        expect(reduced).toContain('transition-duration: 0.01ms !important');
        // The allow-list that re-opens a short fade for the vocabulary, after the fallback.
        const allow = reduced.indexOf('transition-duration: var(--splice-motion-reduced) !important');
        expect(allow).toBeGreaterThan(reduced.indexOf('transition-duration: 0.01ms !important'));
        const allowList = reduced.slice(0, allow);
        for (const piece of [
            "[data-slot='popover-content']",
            "[data-slot='side-panel-content']",
            '.route-enter',
            '.list-cross-fade',
            '.motion-faces > .motion-face',
            '.motion-soft-cut',
            '.motion-push',
            '.motion-back',
            '.motion-cell-roll',
            '.motion-row[data-motion]',
        ]) {
            expect(allowList).toContain(piece);
        }
        expect(ruleFor(reduced, '.animate-spin {')).toContain('animation-iteration-count: infinite !important');
    });

    it('guards reduced motion per piece: travel goes, fades stay', () => {
        const reduced = reducedBlock();
        expect(reduced).toContain('--tw-enter-translate-x: 0 !important');
        expect(reduced).toContain('--tw-enter-scale: 1 !important');
        expect(reduced).toContain('--tw-duration: var(--splice-motion-reduced) !important');
        // B1: the label fades without rising.
        expect(ruleFor(reduced, ".motion-face[data-on='false']")).toContain('transform: none');
        // C1/C2: a fade.
        expect(ruleFor(reduced, '.motion-back {')).toContain('animation-name: swc-fade-in');
        // D3: fades from 0.4 instead of rolling.
        expect(ruleFor(reduced, '.motion-cell-roll {')).toContain('animation-name: swc-cell-in');
        // D2: no height animation.
        expect(ruleFor(reduced, ".motion-row[data-motion='open']")).toContain('swc-fade-in');
        expect(ruleFor(reduced, ".motion-row[data-motion='close']")).toContain('swc-fade-out');
        expect(ruleFor(reduced, ".motion-row[data-motion='close']")).not.toContain('swc-row-close');
    });
});
