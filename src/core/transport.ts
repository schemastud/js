/**
 * The transport contract (ADR-0079 §"The transport", PRD §4). The transport
 * starts from the shipped embed shape (`send(payload, headers?) → Response`);
 * a per-wire ADAPTER turns each `Response` (SSE stream OR JSON body) into an
 * `AsyncIterable<ChatWireEvent>` of the canonical union, which the core folds
 * into the envelope. The core stays wire-agnostic — it never talks to a
 * hardcoded endpoint and never parses a wire format itself; the adapter does.
 */
import type { ChatWireEvent } from './wire';

/** A parsed Server-Sent Event frame: the event name + its (JSON-or-string) data. */
export interface SseFrame {
    event: string;
    data: unknown;
}

/**
 * Turns a `Response` into the canonical event stream the core folds. Each
 * transport binds its own adapter; the SSE frame reader below (`readSse`) is
 * the shared primitive most stream adapters build on.
 */
export type ChatWireAdapter = (response: Response) => AsyncIterable<ChatWireEvent>;

export interface ChatTransport {
    /** Wire identity: 'threads' | 'direct' | 'satellite' | 'numero' | … */
    kind: string;
    /** The SHIPPED shape: post a payload, get a Response (SSE stream or JSON body). */
    send(payload: unknown, headers?: Record<string, string>): Promise<Response>;
    /**
     * Turns each `send` Response into the canonical event union. Optional so a
     * transport may instead expose a plain `send` and let the core apply a
     * default adapter, but a transport that speaks a bespoke wire supplies its
     * own here.
     */
    adapt?: ChatWireAdapter;
}

/** Parse a `text/event-stream` Response body into `{ event, data }` frames. */
export async function* readSse(response: Response): AsyncGenerator<SseFrame> {
    const body = response.body;
    if (!body) {
        return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            yield parseFrame(chunk);
        }
    }

    // Flush a trailing frame that lacked a terminating blank line.
    const tail = buffer.trim();
    if (tail.length > 0) {
        yield parseFrame(tail);
    }
}

function parseFrame(chunk: string): SseFrame {
    let event = 'message';
    let data = '';

    for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            data += line.slice(5).trim();
        }
    }

    let parsed: unknown = data;
    try {
        parsed = JSON.parse(data);
    } catch {
        // leave as string
    }

    return { event, data: parsed };
}
