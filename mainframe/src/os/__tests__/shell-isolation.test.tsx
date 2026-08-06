/**
 * Style-isolation contract tests (Frame OS ticket 05, ADR-0012 §C).
 *
 * jsdom does not resolve cascade layers / stylesheet cascade, so the "no bleed" guarantee is asserted
 * STRUCTURALLY (the mechanism that enforces it), not via getComputedStyle:
 *  - the stylesheet declares the two named layers, chrome ordered before content, Tailwind its own layer;
 *  - every `--shell-*` reference carries a neutral default (`var(--shell-*, <default>)`), so a fresh
 *    mount is grayscale-functional with zero host CSS;
 *  - the `--shell-*` namespace is disjoint from any content token (the shell defines no content token);
 *  - chrome rules reference ONLY `--shell-*` (never a content token), and the content layer defines no
 *    tokens — so chrome tokens can't bleed into content and content tokens can't bleed into chrome;
 *  - the DOM carries the isolation markers: the shell root, the content scope element, the opt-in.
 * (The live cross-token no-bleed is browser-verified in ticket 06.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createMainframeRegistry, createSlotRegistry, MainframeProvider, MainframeOutlet } from '../../index';
import type { MainframeInjection } from '../../index';
import { registerOsMode, type OsWindowSpec } from '../OsMainframe';

const CSS = readFileSync(join(process.cwd(), 'src/os/shell.css'), 'utf8');

/** Every distinct --shell-* token referenced in the stylesheet. */
const SHELL_TOKENS = [...CSS.matchAll(/var\((--shell-[a-z-]+)/g)].map((m) => m[1]);

function osInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    registerOsMode(mainframes);
    return { slots, mainframes };
}

function innerInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('realm', () => <div>surface</div>);
    return { slots, mainframes };
}

describe('shell.css — token contract + cascade layers', () => {
    it('declares the two named cascade layers, chrome before content, Tailwind its own layer', () => {
        expect(CSS).toMatch(/@layer\s+frame\.chrome\s*,\s*frame\.content\s*,\s*frame\.tw\s*;/);
        // chrome layer block appears before the content layer block.
        expect(CSS.indexOf('@layer frame.chrome {')).toBeLessThan(CSS.indexOf('@layer frame.content {'));
    });

    it('renders grayscale-functional with ZERO host CSS: every --shell-* use carries a neutral default', () => {
        expect(SHELL_TOKENS.length).toBeGreaterThan(0);
        // Every var(--shell-*) reference must supply a fallback default (var(--shell-x, <default>)).
        const barePattern = /var\(--shell-[a-z-]+\s*\)/g; // a use with NO fallback
        expect(CSS.match(barePattern) ?? []).toEqual([]);
    });

    it('defines the full flat --shell-* set on the shell root', () => {
        const required = [
            '--shell-surface',
            '--shell-surface-raised',
            '--shell-fg',
            '--shell-fg-muted',
            '--shell-accent',
            '--shell-edge',
            '--shell-radius',
            '--shell-shadow',
            '--shell-font',
            '--shell-font-mono',
        ];
        for (const t of required) expect(CSS).toContain(`${t}:`);
    });

    it('keeps the --shell-* namespace disjoint from content tokens (shell defines no content token)', () => {
        // Any custom property the shell *defines* (`--x:`) must be a --shell-* token, never a content one.
        const defined = [...CSS.matchAll(/(--[a-z][a-z-]*)\s*:/g)].map((m) => m[1]);
        const nonShell = defined.filter((t) => !t.startsWith('--shell-'));
        expect(nonShell, `shell defines only --shell-* tokens; leaked: ${nonShell.join(', ')}`).toEqual([]);
    });

    it('content layer reads no --shell-* except the explicit opt-in (inherits-shell-theme)', () => {
        const contentLayer = CSS.slice(CSS.indexOf('@layer frame.content {'));
        // The only place the content layer may touch --shell-* is the opt-in rule.
        const optIn = contentLayer.slice(contentLayer.indexOf('[data-inherits-shell-theme]'));
        const beforeOptIn = contentLayer.slice(0, contentLayer.indexOf('[data-inherits-shell-theme]'));
        expect(beforeOptIn).not.toMatch(/var\(--shell-/);
        expect(optIn).toMatch(/var\(--shell-/); // opt-in DOES pull the chrome theme
    });
});

describe('os DOM — isolation markers', () => {
    function renderWithWindow(spec: OsWindowSpec) {
        return render(
            <MainframeProvider injection={osInjection()}>
                <MainframeOutlet mode="os" ctx={{ os: { apps: [spec], initialOpen: [spec.key] } }} />
            </MainframeProvider>,
        );
    }

    it('marks the shell root + the window content scope element', () => {
        const { container } = renderWithWindow({ key: 'w', title: 'W', mode: 'realm', injection: innerInjection() });
        expect(container.querySelector('[data-shell-root]')).not.toBeNull();
        const scope = container.querySelector('[data-frame-scope="content"]');
        expect(scope).not.toBeNull();
        // Default: NOT opting into the chrome theme (isolates by construction).
        expect(scope?.hasAttribute('data-inherits-shell-theme')).toBe(false);
        // The scope really contains the realm surface (WYSIWYG target).
        expect(screen.getByText('surface')).toBeTruthy();
    });

    it('an OS-native tool opts into the chrome theme via inheritsShellTheme', () => {
        const { container } = renderWithWindow({
            key: 'settings',
            title: 'Settings',
            mode: 'realm',
            injection: innerInjection(),
            inheritsShellTheme: true,
        });
        expect(
            container.querySelector('[data-frame-scope="content"]')?.hasAttribute('data-inherits-shell-theme'),
        ).toBe(true);
    });
});
