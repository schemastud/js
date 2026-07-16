import { describe, it, expect } from 'vitest';
import { BLOCK_TYPES } from '../src/host/vocabulary-spec.js';
import { DEFAULT_ALLOWLIST } from '../src/host/allowlist.js';
import { DEFAULT_BLOCK_VOCABULARY } from '../src/host/vocabulary.js';

/**
 * Single-source guard: the author-facing vocabulary TYPE spec (`vocabulary-spec.ts`,
 * what the SDK types against) and the host RUNTIME allowlist (`allowlist.tsx`, what the
 * host paints) describe ONE vocabulary. TypeScript cannot derive one from the other, so
 * their key sets are asserted equal here. Add a block on one side without the other and
 * this fails — the list never silently drifts (the whole point: "the allowlist IS the
 * vocabulary", enforced, not hand-duplicated).
 */
describe('vocabulary spec — single source of truth with the host allowlist', () => {
    it('BLOCK_TYPES exactly matches the host allowlist keys', () => {
        const specTypes = [...BLOCK_TYPES].sort();
        const allowlistTypes = Object.keys(DEFAULT_ALLOWLIST).sort();
        expect(specTypes).toEqual(allowlistTypes);
    });

    it('every BLOCK_TYPE resolves to a renderer in the default vocabulary', () => {
        for (const type of BLOCK_TYPES) {
            expect(typeof DEFAULT_BLOCK_VOCABULARY.resolveBlock(type)).toBe('function');
        }
    });

    it('has no extra spec type the host cannot paint', () => {
        for (const type of BLOCK_TYPES) {
            expect(DEFAULT_ALLOWLIST[type], `spec names ${type} but host has no renderer`).toBeDefined();
        }
    });
});
