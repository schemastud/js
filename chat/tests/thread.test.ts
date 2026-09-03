import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type ChatMessage, foldEvent, hydrate } from '../src/core/index';
import { CHAT_THREAD, countDescendants, flattenThread, foldTree } from '../src/thread/index';

/**
 * `@schemastud/chat/thread` — the DERIVED reply tree.
 *
 * The four claims worth testing are the four the ticket names, and three of them
 * are claims about what the module does NOT do: it does not fork storage, it
 * does not discard rows past the cap, and it does not break the reducer's
 * reference-identity contract. A test that only checked "the tree nests" would
 * pass against every wrong implementation of those three.
 */

function message(id: string, replyToId?: string): ChatMessage {
    return { id, role: 'user', content: id, ...(replyToId === undefined ? {} : { replyToId }) };
}

/**
 * a
 * ├─ b
 * │  └─ d
 * └─ c
 * e
 */
function forum(): ChatMessage[] {
    return [message('a'), message('b', 'a'), message('c', 'a'), message('d', 'b'), message('e')];
}

describe('foldTree — the degenerate case IS linear chat', () => {
    it('returns the messages in source order when nothing carries replyToId', () => {
        const messages = [message('a'), message('b'), message('c')];
        const roots = foldTree({ messages });

        expect(roots.map((n) => n.message)).toEqual(messages);
        expect(roots.every((n) => n.depth === 0 && n.children.length === 0)).toBe(true);
    });

    it('holds source order among roots and among siblings alike', () => {
        const roots = foldTree({ messages: forum() });

        expect(roots.map((n) => n.message.id)).toEqual(['a', 'e']);
        expect(roots[0].children.map((n) => n.message.id)).toEqual(['b', 'c']);
    });
});

describe('foldTree — the cap is a RENDER verdict, never a storage fork', () => {
    it('builds the identical tree at every cap; only `hidden` moves', () => {
        const messages = forum();
        const flat = foldTree({ messages }, 1);
        const board = foldTree({ messages }, 2);
        const unbounded = foldTree({ messages }, null);

        // Same edges, same shape, at all three caps — this is the mode-invariance
        // claim. If the cap were applied while building, `flat` would have no
        // children at all and this would fail.
        for (const tree of [flat, board, unbounded]) {
            expect(tree.map((n) => n.message.id)).toEqual(['a', 'e']);
            expect(countDescendants(tree[0])).toBe(3);
            expect(tree[0].children[0].children.map((n) => n.message.id)).toEqual(['d']);
        }

        const depths = (roots: ReturnType<typeof foldTree>) =>
            flattenThread(roots).map((n) => n.message.id);

        expect(depths(flat)).toEqual(['a', 'e']);
        expect(depths(board)).toEqual(['a', 'b', 'c', 'e']);
        expect(depths(unbounded)).toEqual(['a', 'b', 'd', 'c', 'e']);
    });

    it('reveals a deeper chain from the SAME snapshot when the cap is raised', () => {
        const source = { messages: forum() };

        expect(flattenThread(foldTree(source, 1))).toHaveLength(2);
        // No refetch, no second read-model: the identical `source` object.
        expect(flattenThread(foldTree(source, null))).toHaveLength(5);
    });

    it('an unbounded cap is the default', () => {
        expect(flattenThread(foldTree({ messages: forum() }))).toHaveLength(5);
    });
});

describe('flattenThread — collapse hides without discarding', () => {
    it('omits a collapsed row’s subtree and restores it on expand', () => {
        const roots = foldTree({ messages: forum() }, null);

        expect(flattenThread(roots, { collapsed: ['a'] }).map((n) => n.message.id)).toEqual(['a', 'e']);
        expect(flattenThread(roots, { collapsed: [] }).map((n) => n.message.id)).toEqual([
            'a',
            'b',
            'd',
            'c',
            'e',
        ]);
        // The tree the collapsed flatten was taken from is untouched.
        expect(countDescendants(roots[0])).toBe(3);
    });
});

describe('foldTree — degenerate edges are demoted, never dropped', () => {
    it('keeps a message whose parent is not in this snapshot', () => {
        const roots = foldTree({ messages: [message('a'), message('orphan', 'paged-out')] });

        expect(roots.map((n) => n.message.id)).toEqual(['a', 'orphan']);
    });

    it('keeps a self-reply and a cycle, as roots', () => {
        const selfReply = foldTree({ messages: [message('a', 'a')] });
        expect(selfReply.map((n) => n.message.id)).toEqual(['a']);

        const cycle = foldTree({ messages: [message('a', 'b'), message('b', 'a')] });
        // Every message is still reachable — a cycle must not swallow rows.
        expect(flattenThread(cycle).map((n) => n.message.id).sort()).toEqual(['a', 'b']);
    });
});

describe('the reducer contract survives the tree', () => {
    it('foldEvent still produces new references only along the changed path', () => {
        const before = hydrate([message('a'), message('b', 'a'), message('c')]);
        // Take the tree first: a selector that cached into the snapshot, or
        // mutated it, would show up as a changed reference below.
        const treeBefore = foldTree(before, null);
        const after = foldEvent(before, { type: 'token', messageId: 'c', delta: '!' });

        const index = (s: typeof before, id: string) => s.messages.findIndex((m) => m.id === id);
        expect(after.messages[index(after, 'a')]).toBe(before.messages[index(before, 'a')]);
        expect(after.messages[index(after, 'b')]).toBe(before.messages[index(before, 'b')]);
        expect(after.messages[index(after, 'c')]).not.toBe(before.messages[index(before, 'c')]);

        // And the selector is genuinely derived: the pre-existing tree still
        // points at the OLD message objects, because nothing wrote back.
        expect(treeBefore[0].message).toBe(before.messages[index(before, 'a')]);
    });

    it('foldTree does not mutate the snapshot it reads', () => {
        const source = hydrate(forum());
        const snapshotOfIds = source.messages.map((m) => m.id);
        const messagesRef = source.messages;
        const firstRef = source.messages[0];

        foldTree(source, 1);
        foldTree(source, null);

        expect(source.messages).toBe(messagesRef);
        expect(source.messages[0]).toBe(firstRef);
        expect(source.messages.map((m) => m.id)).toEqual(snapshotOfIds);
        expect('children' in source.messages[0]).toBe(false);
    });
});

describe('./thread stays framework-agnostic', () => {
    it('imports no react anywhere in src/thread/', () => {
        const root = join(__dirname, '..', 'src', 'thread');
        const banned = /from\s+['"](react|react-dom)(\/[^'"]*)?['"]/;

        const files = readdirSync(root, { withFileTypes: true })
            .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
            .map((e) => join(root, e.name));

        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
        }
    });

    it('carries its own identity marker', () => {
        expect(CHAT_THREAD).toBe('schemastud-chat-thread');
    });
});
