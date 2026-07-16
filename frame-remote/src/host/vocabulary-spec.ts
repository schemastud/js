/**
 * The vocabulary *spec* — the single typed declaration of what an author may name.
 *
 * `DEFAULT_ALLOWLIST` (allowlist.tsx) owns the RUNTIME half of the vocabulary: the
 * seven first-party renderers, keyed by type name, each reading a fixed set of props
 * off the reconciled element. This module owns the TYPE half of the SAME vocabulary:
 * for each allowlisted type name, the prop shape an author may pass. Together they are
 * one vocabulary described from two sides — the renderer that reads a prop, and the
 * author-facing type that lets you pass it (with autocomplete) and refuses a prop or a
 * type the host never owns (a compile error).
 *
 * These two halves must not drift. There is no way to make TypeScript derive one prop
 * shape from a `createElement` call, so the alignment is asserted the other way: the
 * key SET here must equal the key set of `DEFAULT_ALLOWLIST`, and that equality is a
 * test (`vocabulary-spec.test.ts`). Add a block to the allowlist without adding its
 * prop shape here (or vice-versa) and the suite fails — the list stays single-sourced.
 *
 * Handler props follow the guest runtime's `on<Event>` convention (runtime.ts): a
 * prop whose value is a function is shipped as a handler *id*, never a function across
 * the wire (protocol.ts). The author declares them as `HandlerProp<Payload>` so the
 * authored callback is typed by the payload the host mints for that event.
 */

/**
 * An event-handler authored prop. Its value is a callback the author writes; the
 * runtime registers it under an id and ships only the id (never the function itself).
 * Typed by the payload shape the host mints when the corresponding browser event fires
 * (see `DEFAULT_ALLOWLIST` renderers' `fire(...)` payloads).
 */
export type HandlerProp<Payload = void> = (payload: Payload) => void;

/**
 * The prop shape for each allowlisted block type. Keys MUST match `DEFAULT_ALLOWLIST`
 * exactly (asserted in a test). Each field mirrors a prop the matching renderer reads.
 */
export interface BlockProps {
    /** Vertical flex container. `gap` is the row gap in px (renderer default 12). */
    Stack: { gap?: number };
    /** A padded, bordered surface. Content-only — no own props read. */
    Card: Record<string, never>;
    /** A section heading. */
    Heading: { text?: string };
    /** A paragraph of body copy. */
    Text: { text?: string };
    /** A small pill label. */
    Badge: { text?: string };
    /** A button. `onClick` fires with no payload (`{}` on the wire). */
    Button: { text?: string; onClick?: HandlerProp<void> };
    /** A controlled text input. `onInput` fires `{ value }` on each change. */
    TextInput: {
        placeholder?: string;
        value?: string;
        onInput?: HandlerProp<{ value: string }>;
    };
}

/** The set of allowlisted block type names — the vocabulary keys an author may name. */
export type BlockType = keyof BlockProps;

/**
 * The vocabulary type names as a runtime array (source of truth for the drift check).
 * Declared with a `satisfies` so it is impossible to list a name that is not a
 * `BlockType`, and the test asserts the reverse (every `BlockType` is listed and every
 * listed name is in `DEFAULT_ALLOWLIST`).
 */
export const BLOCK_TYPES = [
    'Stack',
    'Card',
    'Heading',
    'Text',
    'Badge',
    'Button',
    'TextInput',
] as const satisfies readonly BlockType[];
