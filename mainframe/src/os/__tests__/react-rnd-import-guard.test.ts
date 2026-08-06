/**
 * The geometry-wheel import guard (Frame OS ticket 03, ADR-0011 §1).
 *
 * `react-rnd` is the swappable geometry atom. It must be imported at EXACTLY one place — the
 * `WindowFrame` component — so the reducer, the registry, the realm-derivation, and everything else
 * stay wheel-free and a future swap (e.g. `dockview`) touches one file. This test walks the package
 * source and fails if any file other than `WindowFrame.tsx` references `react-rnd`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

// vitest runs with cwd = the package root (…/mainframe), so the source tree is <cwd>/src.
const SRC = join(process.cwd(), 'src');
const ALLOWED = 'os/WindowFrame.tsx';

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === 'node_modules' || entry === 'dist') continue;
            out.push(...walk(full));
        } else if (/\.(ts|tsx)$/.test(entry)) {
            out.push(full);
        }
    }
    return out;
}

describe('react-rnd import guard', () => {
    it('is imported only by os/WindowFrame.tsx', () => {
        const offenders: string[] = [];
        for (const file of walk(SRC)) {
            const rel = relative(SRC, file).split(sep).join('/');
            const src = readFileSync(file, 'utf8');
            // Match a real import of react-rnd, not a mention in a comment/string of another word.
            const importsRnd = /from\s+['"]react-rnd['"]|require\(\s*['"]react-rnd['"]\s*\)/.test(src);
            if (importsRnd && rel !== ALLOWED) offenders.push(rel);
        }
        expect(offenders, `react-rnd may only be imported by ${ALLOWED}; found in: ${offenders.join(', ')}`).toEqual([]);
    });

    it('WindowFrame.tsx does import react-rnd (the guard is live, not vacuous)', () => {
        const frame = readFileSync(join(SRC, ALLOWED), 'utf8');
        expect(/from\s+['"]react-rnd['"]/.test(frame)).toBe(true);
    });
});
