import { describe, expect, it } from 'vitest';
import {
    type ChatSnapshot,
    type ChatWireEvent,
    emptySnapshot,
    foldAll,
    foldEvent,
    hydrate,
} from '../src/core/index';

/**
 * The fold engine (KEYSTONE reducer). Every downstream consumer folds this ONE
 * canonical event union into envelope snapshots. These tests drive scripted
 * event streams and assert snapshots across: streaming fold, interleaved tool
 * segments, citations, roster join/leave, hydrate-then-reconcile, out-of-order
 * / duplicate events, and terminal states.
 */

/** Fold a scripted event list synchronously (the reducer is pure). */
function replay(events: ChatWireEvent[], start: ChatSnapshot = emptySnapshot()): ChatSnapshot {
    return events.reduce(foldEvent, start);
}

describe('foldEvent — purity', () => {
    it('never mutates its input snapshot', () => {
        const start = emptySnapshot();
        const next = foldEvent(start, { type: 'token', messageId: 'a', delta: 'hi' });

        expect(start.messages).toHaveLength(0);
        expect(next).not.toBe(start);
        expect(next.messages).not.toBe(start.messages);
    });

    it('returns the SAME reference when an event is a no-op (empty token)', () => {
        const start = emptySnapshot();
        expect(foldEvent(start, { type: 'token', messageId: 'a', delta: '' })).toBe(start);
    });
});

describe('foldEvent — streaming fold', () => {
    it('appends deltas to content and coalesces into a single text segment', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'Hel' },
            { type: 'token', messageId: 'a', delta: 'lo ' },
            { type: 'token', messageId: 'a', delta: 'world' },
        ]);

        const msg = snap.messages[0];
        expect(msg.id).toBe('a');
        expect(msg.role).toBe('assistant');
        expect(msg.content).toBe('Hello world');
        expect(msg.segments).toEqual([{ type: 'text', text: 'Hello world' }]);
        expect(msg.streaming).toEqual({ partial: true });
        expect(snap.streaming).toBe(true);
    });

    it('an out-of-order token (before the message is otherwise known) mints the turn', () => {
        // No prior frame announced message "z"; the token still lands.
        const snap = replay([{ type: 'token', messageId: 'z', delta: 'orphan' }]);
        expect(snap.messages[0].id).toBe('z');
        expect(snap.messages[0].content).toBe('orphan');
    });
});

describe('foldEvent — interleaved tool segments', () => {
    it('interleaves text and tool segments in arrival order', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'Let me check. ' },
            { type: 'tool_call', messageId: 'a', toolId: 't1', toolName: 'search', arguments: { q: 'Q2' } },
            { type: 'tool_result', messageId: 'a', toolId: 't1', toolName: 'search', result: { hits: 2 } },
            { type: 'token', messageId: 'a', delta: 'Found two.' },
        ]);

        const segs = snap.messages[0].segments!;
        expect(segs.map((s) => s.type)).toEqual(['text', 'tool_call', 'tool_result', 'text']);
        // A new text segment starts after a tool break — not coalesced across the tool.
        expect(segs[0]).toEqual({ type: 'text', text: 'Let me check. ' });
        expect(segs[3]).toEqual({ type: 'text', text: 'Found two.' });
        // content stays a flat accumulation of all text deltas.
        expect(snap.messages[0].content).toBe('Let me check. Found two.');
    });

    it('is idempotent on a duplicated tool_call / tool_result (same toolId)', () => {
        const snap = replay([
            { type: 'tool_call', messageId: 'a', toolId: 't1', toolName: 'search', arguments: {} },
            { type: 'tool_call', messageId: 'a', toolId: 't1', toolName: 'search', arguments: {} },
            { type: 'tool_result', messageId: 'a', toolId: 't1', toolName: 'search', result: {} },
            { type: 'tool_result', messageId: 'a', toolId: 't1', toolName: 'search', result: {} },
        ]);

        const segs = snap.messages[0].segments!;
        expect(segs.filter((s) => s.type === 'tool_call')).toHaveLength(1);
        expect(segs.filter((s) => s.type === 'tool_result')).toHaveLength(1);
    });
});

describe('foldEvent — citations', () => {
    it('sets citations[] on the correlated message', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'text' },
            {
                type: 'citation',
                messageId: 'a',
                citations: [{ id: 'frag_9', name: 'Q2 Ledger', authority: 'FDA', sectionTitle: '3.1', fragmentId: 'f9' }],
            },
        ]);

        expect(snap.messages[0].citations).toEqual([
            { id: 'frag_9', name: 'Q2 Ledger', authority: 'FDA', sectionTitle: '3.1', fragmentId: 'f9' },
        ]);
    });

    it('a citation for an unknown message mints the turn (out of order)', () => {
        const snap = replay([{ type: 'citation', messageId: 'a', citations: [{ id: 'c1' }] }]);
        expect(snap.messages[0].citations).toEqual([{ id: 'c1' }]);
    });
});

describe('foldEvent — roster (core state, join/leave)', () => {
    it('replaces the roster from a roster event', () => {
        const snap = replay([
            { type: 'roster', participants: [{ id: 'u1', kind: 'user' }] },
            {
                type: 'roster',
                participants: [
                    { id: 'u1', kind: 'user' },
                    { id: 'agent_lila', kind: 'agent', label: 'Lila' },
                ],
                joined: { id: 'agent_lila', kind: 'agent', label: 'Lila' },
            },
        ]);

        expect(snap.roster).toEqual([
            { id: 'u1', kind: 'user' },
            { id: 'agent_lila', kind: 'agent', label: 'Lila' },
        ]);
    });

    it('reflects a leave (roster shrinks)', () => {
        const snap = replay([
            { type: 'roster', participants: [{ id: 'u1' }, { id: 'a1' }] },
            { type: 'roster', participants: [{ id: 'u1' }], left: { id: 'a1' } },
        ]);
        expect(snap.roster).toEqual([{ id: 'u1' }]);
    });
});

describe('foldEvent — session & escalation (session-scoped, not message fields)', () => {
    it('captures a session id, idempotently', () => {
        const snap = replay([
            { type: 'session', session_id: 'sess_1' },
            { type: 'session', session_id: 'sess_1' },
        ]);
        expect(snap.sessionId).toBe('sess_1');
        expect(snap.messages).toHaveLength(0);
    });

    it('records escalation reason + offer without appending a message', () => {
        const snap = replay([{ type: 'escalation', reason: 'budget_exhausted', offer: { plan: 'pro' } }]);
        expect(snap.escalation).toEqual({ reason: 'budget_exhausted', offer: { plan: 'pro' } });
        expect(snap.messages).toHaveLength(0);
    });
});

describe('foldEvent — terminal states', () => {
    it('done flips streaming.partial=false and clears the top-level flag', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'hi' },
            { type: 'done', messageId: 'a', createdAt: '2026-07-14T00:00:00Z' },
        ]);

        expect(snap.messages[0].streaming).toEqual({ partial: false });
        expect(snap.messages[0].createdAt).toBe('2026-07-14T00:00:00Z');
        expect(snap.streaming).toBe(false);
    });

    it('a late token after done does NOT re-open the finalized turn', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'done-content' },
            { type: 'done', messageId: 'a' },
            { type: 'token', messageId: 'a', delta: 'LATE' },
        ]);

        expect(snap.messages[0].content).toBe('done-content');
        expect(snap.streaming).toBe(false);
    });

    it('a done for an unknown message is ignored', () => {
        const start = emptySnapshot();
        expect(foldEvent(start, { type: 'done', messageId: 'ghost' })).toBe(start);
    });

    it('error finalizes the turn with streaming.error', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'partial' },
            { type: 'error', messageId: 'a', error: 'boom', partial: false },
        ]);
        expect(snap.messages[0].streaming).toEqual({ partial: false, error: 'boom' });
        expect(snap.streaming).toBe(false);
    });

    it('an untargeted error attaches to the latest streaming turn', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'x' },
            { type: 'error', error: 'network', partial: true },
        ]);
        expect(snap.messages[0].streaming?.error).toBe('network');
    });

    it('a message-scoped error for an unknown id falls back to the latest streaming turn', () => {
        // The stream minted turn `a` (a token created it) but the error is tagged
        // with a synthetic id that never matched a message — attach to `a` anyway.
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'x' },
            { type: 'error', messageId: 'assistant_999', error: 'boom', partial: true },
        ]);
        expect(snap.messages).toHaveLength(1);
        expect(snap.messages[0].id).toBe('a');
        expect(snap.messages[0].streaming?.error).toBe('boom');
    });

    it('a pre-token error synthesizes an assistant turn so it is never dropped', () => {
        // No token ever minted the assistant turn; the last message is the user's.
        // The synthetic-id error must still surface on a fresh assistant turn.
        const seed = hydrate([{ id: 'u1', role: 'user', content: 'hi' }]);
        const snap = replay(
            [{ type: 'error', messageId: 'assistant_1700000000', error: 'provider 500', partial: true }],
            seed,
        );
        expect(snap.messages).toHaveLength(2);
        const last = snap.messages[snap.messages.length - 1];
        expect(last.role).toBe('assistant');
        expect(last.id).toBe('assistant_1700000000');
        expect(last.streaming?.error).toBe('provider 500');
    });

    it('a pre-token untargeted error also synthesizes an assistant turn', () => {
        const snap = replay([{ type: 'error', error: 'network down', partial: false }]);
        expect(snap.messages).toHaveLength(1);
        expect(snap.messages[0].role).toBe('assistant');
        expect(snap.messages[0].streaming?.error).toBe('network down');
        expect(snap.messages[0].streaming?.partial).toBe(false);
    });
});

describe('foldEvent — mixed correlation (two concurrent turns)', () => {
    it('routes tokens to the right message by messageId', () => {
        const snap = replay([
            { type: 'token', messageId: 'a', delta: 'A1' },
            { type: 'token', messageId: 'b', delta: 'B1' },
            { type: 'token', messageId: 'a', delta: 'A2' },
            { type: 'done', messageId: 'a' },
        ]);

        const a = snap.messages.find((m) => m.id === 'a')!;
        const b = snap.messages.find((m) => m.id === 'b')!;
        expect(a.content).toBe('A1A2');
        expect(a.streaming).toEqual({ partial: false });
        expect(b.content).toBe('B1');
        expect(b.streaming).toEqual({ partial: true });
        // b is still open ⇒ top-level streaming remains true.
        expect(snap.streaming).toBe(true);
    });
});

describe('hydrate-then-reconcile (the controlled-core history seam)', () => {
    it('hydrates from a seed and reconciles a streamed turn on top', async () => {
        const seed = hydrate([
            { id: 'h1', role: 'user', content: 'earlier question' },
            { id: 'h2', role: 'assistant', content: 'earlier answer' },
        ]);

        // Seeded messages are finalized (not partial).
        expect(seed.messages.map((m) => m.streaming)).toEqual([undefined, undefined]);
        expect(seed.streaming).toBe(false);

        const events: ChatWireEvent[] = [
            { type: 'token', messageId: 'new', delta: 'fresh ' },
            { type: 'token', messageId: 'new', delta: 'reply' },
            { type: 'done', messageId: 'new', createdAt: '2026-07-14T01:00:00Z' },
        ];

        const final = await foldAll(seed, events);

        expect(final.messages.map((m) => m.id)).toEqual(['h1', 'h2', 'new']);
        expect(final.messages[2].content).toBe('fresh reply');
        expect(final.messages[2].streaming).toEqual({ partial: false });
        expect(final.streaming).toBe(false);
    });
});

describe('foldAll — async iterable replay', () => {
    it('folds an async generator to a final snapshot', async () => {
        async function* stream(): AsyncGenerator<ChatWireEvent> {
            yield { type: 'token', messageId: 'a', delta: 'one ' };
            yield { type: 'token', messageId: 'a', delta: 'two' };
            yield { type: 'done', messageId: 'a' };
        }

        const snap = await foldAll(emptySnapshot(), stream());
        expect(snap.messages[0].content).toBe('one two');
        expect(snap.streaming).toBe(false);
    });
});
