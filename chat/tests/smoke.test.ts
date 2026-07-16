import { describe, expect, it } from 'vitest';

/**
 * Smoke test (CH-01): both subpaths resolve independently and each exposes a
 * trivial symbol. Imports go through the src entrypoints — the same modules the
 * `./core` and `./react` package exports point at once built.
 */
describe('@schemastud/chat scaffold', () => {
    it('resolves ./core and exports a trivial symbol', async () => {
        const core = await import('../src/core/index');
        expect(core.CHAT_CORE).toBe('schemastud-chat-core');
    });

    it('resolves ./react and exports a trivial symbol', async () => {
        const react = await import('../src/react/index');
        expect(react.CHAT_REACT).toBe('schemastud-chat-react');
    });

    it('./react depends on ./core (arrow points one way)', async () => {
        const react = await import('../src/react/index');
        const core = await import('../src/core/index');
        expect(react.CHAT_CORE_TAG).toBe(core.CHAT_CORE);
    });
});
