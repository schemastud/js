import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Framework-agnosticism guardrail (ADR-0078): `@schemastud/chat/core` is the
 * headless state machine — no React (or any view framework) may be reachable
 * from it. `./react` may depend on `./core`, never the reverse. This is the
 * structural analogue of blockdoc's no-pro-imports guard.
 */

const coreRoot = join(__dirname, '..', 'src', 'core');

function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            return sourceFiles(path);
        }

        return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });
}

describe('core stays framework-agnostic', () => {
    it('imports no react / react-dom anywhere in src/core/', () => {
        const banned = /from\s+['"](react|react-dom)(\/[^'"]*)?['"]/;

        for (const file of sourceFiles(coreRoot)) {
            expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
        }
    });

    it('never reaches up into src/react/ from src/core/', () => {
        const reachesReactDir = /from\s+['"][^'"]*\/react\//;

        for (const file of sourceFiles(coreRoot)) {
            expect(readFileSync(file, 'utf8'), file).not.toMatch(reachesReactDir);
        }
    });
});
