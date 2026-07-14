/**
 * The chat core store — the stateful engine a consumer subscribes to. Binds a
 * `ChatTransport`, folds each `send` Response into snapshots via the pure
 * reducer (fold.ts), and exposes the session capabilities (`requestHuman`) that
 * stay inert unless a transport drives them.
 *
 * This is the extraction of the 148-LOC dep-free embed-chat core, born-correct:
 * the full §3 envelope, roster as CORE, the 06-union parser, `initialMessages`
 * hydration, and a reconcile-able `done`. Framework-agnostic — no React here.
 */
import type { ChatMessage, Citation, Participant, Role } from './envelope';
import { type ChatSnapshot, emptySnapshot, foldEvent, hydrate } from './fold';
import { type ChatTransport, readSse } from './transport';
import type { ChatWireEvent } from './wire';

export interface ChatCoreOptions {
    transport: ChatTransport;
    /** History seed — the hybrid controlled-core hydration seam (ticket 08). */
    initialMessages?: ChatMessage[];
    /** Mint an id for a user turn / a fresh assistant turn. Deterministic override for tests. */
    generateId?: () => string;
}

export interface SendOptions {
    /** Extra request headers passed through to `transport.send`. */
    headers?: Record<string, string>;
    /** Role of the outgoing turn. Defaults to 'user'. */
    role?: Role;
}

export interface ChatCore {
    /** Subscribe to snapshots; returns an unsubscribe. Fires immediately with the current snapshot. */
    subscribe(fn: (snapshot: ChatSnapshot) => void): () => void;
    /** The current snapshot (immutable read-model). */
    getSnapshot(): ChatSnapshot;
    /** Re-seed history (re-hydrate the controlled core). Emits a snapshot. */
    hydrate(seed: ChatMessage[]): void;
    /** Send a turn; streams the response through the fold engine. */
    send(content: string, options?: SendOptions): Promise<void>;
    /** Session capability: signal "talk to a human". Inert unless the transport routes it. */
    requestHuman(contact?: unknown, consent?: boolean): Promise<void>;
}

let autoId = 0;
const defaultGenerateId = () => `m_${Date.now().toString(36)}_${(autoId++).toString(36)}`;

export function createChatCore(options: ChatCoreOptions): ChatCore {
    const { transport, generateId = defaultGenerateId } = options;

    let snapshot: ChatSnapshot = options.initialMessages ? hydrate(options.initialMessages) : emptySnapshot();
    const listeners = new Set<(snapshot: ChatSnapshot) => void>();

    const commit = (next: ChatSnapshot) => {
        snapshot = next;
        for (const fn of listeners) {
            fn(snapshot);
        }
    };

    const fold = (event: ChatWireEvent) => commit(foldEvent(snapshot, event));

    /** Push a bare envelope message (a user turn) without going through the wire fold. */
    const pushMessage = (message: ChatMessage) => {
        commit({ ...snapshot, messages: [...snapshot.messages, message] });
    };

    /**
     * Default adapter: turn a Response into the canonical event stream. A JSON
     * body is synthesized into an `escalation` event client-side (the concierge
     * degrade path — ADR-0079: the shipped concierge contract is untouched);
     * an SSE body is mapped frame-by-frame onto the canonical union.
     */
    async function* defaultAdapt(response: Response, messageId: string): AsyncGenerator<ChatWireEvent> {
        const contentType = response.headers?.get?.('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = (await response.json()) as { data?: Record<string, unknown> } | undefined;
            const data = body?.data ?? {};
            if (typeof data.session_id === 'string') {
                yield { type: 'session', session_id: data.session_id };
            }
            yield {
                type: 'escalation',
                reason: typeof data.reason === 'string' ? data.reason : 'escalated',
                offer: data.offer,
            };
            return;
        }

        for await (const frame of readSse(response)) {
            const mapped = mapFrame(frame.event, frame.data, messageId);
            if (mapped) {
                yield mapped;
            }
        }

        // A stream that ended without an explicit `done` still finalizes the turn.
        yield { type: 'done', messageId };
    }

    async function send(content: string, sendOptions: SendOptions = {}): Promise<void> {
        if (!content || snapshot.streaming) {
            return;
        }

        const userMessage: ChatMessage = { id: generateId(), role: sendOptions.role ?? 'user', content };
        pushMessage(userMessage);
        // Clear a prior escalation on a fresh turn.
        if (snapshot.escalation) {
            commit({ ...snapshot, escalation: null });
        }

        const assistantId = generateId();

        let response: Response;
        try {
            response = await transport.send({ content, session_id: snapshot.sessionId }, sendOptions.headers);
        } catch {
            fold({ type: 'error', messageId: assistantId, error: 'transport_error', partial: false });
            fold({ type: 'escalation', reason: 'transport_error' });
            return;
        }

        const events = transport.adapt ? transport.adapt(response) : defaultAdapt(response, assistantId);
        for await (const event of events) {
            fold(event);
        }
    }

    async function requestHuman(contact: unknown = null, consent = false): Promise<void> {
        try {
            await transport.send({ escalate: true, session_id: snapshot.sessionId, contact, consent });
        } catch {
            // best-effort; the local escalation state already deflects
        }
        if (!snapshot.escalation) {
            fold({ type: 'escalation', reason: 'visitor_request' });
        }
    }

    return {
        subscribe(fn) {
            listeners.add(fn);
            fn(snapshot);
            return () => {
                listeners.delete(fn);
            };
        },
        getSnapshot() {
            return snapshot;
        },
        hydrate(seed) {
            commit(hydrate(seed));
        },
        send,
        requestHuman,
    };
}

/**
 * Map one SSE frame onto the canonical union. Handles both legacy delta spellings
 * (`text_delta` / `text-delta` / `token`) and the native canonical event names.
 * A frame the core can't classify is dropped (returns null).
 */
function mapFrame(event: string, data: unknown, messageId: string): ChatWireEvent | null {
    const payload = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<
        string,
        unknown
    >;
    const mid = typeof payload.messageId === 'string' ? payload.messageId : messageId;

    switch (event) {
        case 'token':
        case 'text_delta':
        case 'text-delta': {
            const delta = typeof payload.delta === 'string' ? payload.delta : typeof data === 'string' ? data : '';
            return { type: 'token', messageId: mid, delta };
        }
        case 'tool_call':
            return {
                type: 'tool_call',
                messageId: mid,
                toolId: String(payload.toolId ?? ''),
                toolName: String(payload.toolName ?? ''),
                arguments: payload.arguments,
            };
        case 'tool_result':
            return {
                type: 'tool_result',
                messageId: mid,
                toolId: String(payload.toolId ?? ''),
                toolName: String(payload.toolName ?? ''),
                result: payload.result,
            };
        case 'citation':
            return {
                type: 'citation',
                messageId: mid,
                citations: Array.isArray(payload.citations) ? (payload.citations as Citation[]) : [],
            };
        case 'session':
            return typeof payload.session_id === 'string'
                ? { type: 'session', session_id: payload.session_id }
                : null;
        case 'escalation':
            return { type: 'escalation', reason: String(payload.reason ?? 'escalated'), offer: payload.offer };
        case 'roster':
            return {
                type: 'roster',
                participants: Array.isArray(payload.participants) ? (payload.participants as Participant[]) : [],
            };
        case 'done':
            return {
                type: 'done',
                messageId: mid,
                createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : undefined,
            };
        case 'error':
            return {
                type: 'error',
                messageId: typeof payload.messageId === 'string' ? payload.messageId : mid,
                error: String(payload.error ?? 'error'),
                partial: payload.partial === true,
            };
        default:
            return null;
    }
}
