/**
 * `@schemastud/chat/react` — the view layer: `<ChatView>`, the slot sockets,
 * and the named presets. Depends on `@schemastud/chat/core`; consumers of the
 * headless engine never pull this in.
 *
 * SCAFFOLD (CH-01): `<ChatView>` + slots land in CH-04, the presets +
 * `<Composer>` in CH-05. The react subpath may depend on core (re-exported
 * here to prove the arrow), but core must never depend on react.
 */
import { CHAT_CORE } from '../core/index';

/** Package identity marker. The smoke test asserts this trivial export. */
export const CHAT_REACT = 'schemastud-chat-react' as const;

/** Proves the ./react → ./core dependency arrow (ADR-0078). */
export const CHAT_CORE_TAG = CHAT_CORE;
