import { C as ChatMessage } from './envelope-C2h6ajnL.js';

/**
 * `@schemastud/chat/thread` — the nested-reply projection over the ONE canonical
 * snapshot. Framework-agnostic, like `./core`; it imports the envelope and
 * nothing else.
 *
 * ## Why this is a selector and not a reducer change
 *
 * `foldEvent` contracts that it returns "a new snapshot with new references only
 * along the changed path" (`core/fold.ts`), which is what lets a subscriber
 * shallow-compare. A nested rebuild breaks that contract by construction: every
 * ancestor of a patched message would have to be re-allocated to carry the new
 * child array, so an unrelated token would hand a subscriber a fresh reference
 * for half the tree. So the flat `messages` list stays the storage and the tree
 * is DERIVED on read. `tests/thread.test.ts` asserts the contract still holds
 * with this module in the picture.
 *
 * ## Why the depth cap is applied at RENDER
 *
 * `ThreadMode` is `chat | board | forum` and `max_depth` is `1 | 2 | null`, but
 * the server stores ONE shape — mode is a stored render hint, never a storage
 * fork (ADR-0176 mode-invariance), and `max_depth` only SEEDS at creation and is
 * freely editable afterwards. If the cap were applied while folding, "one
 * storage, three renders" would quietly become three read-models: raising a
 * thread's cap would need the client to re-fetch rather than re-render. So
 * {@link foldTree} always builds the COMPLETE tree — every `replyToId` edge is
 * present at every cap — and the cap only decides which nodes are marked
 * {@link ThreadNode.hidden}. Nothing is ever discarded.
 *
 * Linear chat is the degenerate case, not a separate path: a snapshot whose
 * messages carry no `replyToId` folds to a flat list in source order, which is
 * byte-for-byte what `snapshot.messages` already was.
 */

/** The minimal read-model this module projects — a `ChatSnapshot` satisfies it. */
interface ThreadSource {
    messages: ChatMessage[];
}
/**
 * One node of the derived reply tree.
 *
 * `depth` is 0 for a root. `hidden` is the RENDER verdict for the cap the tree
 * was folded at — a hidden node still carries its message and its full
 * `children`, so a consumer can reveal it without re-folding.
 */
interface ThreadNode {
    message: ChatMessage;
    depth: number;
    /** True when `depth` is at or past the cap. The node and its edges still exist. */
    hidden: boolean;
    children: ThreadNode[];
}
/**
 * The cap. `null` (the default) is unbounded — `ThreadMode.forum`. `1` shows
 * roots only, which is flat chat. `2` is one level of replies — `board`.
 */
type ThreadDepthCap = number | null | undefined;
/**
 * Derive the reply tree from a snapshot.
 *
 * Ordering is inherited from `messages` rather than invented: roots appear in
 * source order, and each node's children appear in source order among
 * themselves. That is what makes the no-`replyToId` case identical to the flat
 * list rather than merely equivalent to it.
 *
 * Two degeneracies are handled by DEMOTING TO ROOT rather than dropping, because
 * a dropped message is a message the reader cannot see and nothing reports:
 *
 *  - a `replyToId` naming a message not in this snapshot (a paged-out parent);
 *  - a cycle, including a message replying to itself.
 *
 * Both are facts about the data a client was handed, not grammar its author
 * could have gotten right, so neither throws.
 */
declare function foldTree(source: ThreadSource, maxDepth?: ThreadDepthCap): ThreadNode[];
/** Options for {@link flattenThread}. */
interface FlattenOptions {
    /** Message ids whose subtrees are collapsed by the reader. */
    collapsed?: ReadonlySet<string> | string[];
}
/**
 * Project the tree back to the ordered row list a renderer walks — depth-first,
 * preorder, so a row's indent is `row.depth`.
 *
 * Rows past the cap are omitted, and so is everything under a collapsed row.
 * Neither is a deletion: `foldTree`'s output still holds every edge, so
 * re-flattening at a wider cap or with the row expanded reveals them from the
 * SAME snapshot with no refetch.
 */
declare function flattenThread(roots: ThreadNode[], options?: FlattenOptions): ThreadNode[];
/**
 * How many descendants a node has, at any depth and regardless of the cap — the
 * number a collapse affordance shows ("12 replies"). Counted from the tree, so
 * it is the same number whether or not the reader can currently see them.
 */
declare function countDescendants(node: ThreadNode): number;
/** Package identity marker, mirroring `./core` and `./react`. */
declare const CHAT_THREAD: "schemastud-chat-thread";

export { CHAT_THREAD, type FlattenOptions, type ThreadDepthCap, type ThreadNode, type ThreadSource, countDescendants, flattenThread, foldTree };
