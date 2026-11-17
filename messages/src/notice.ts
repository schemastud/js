import type { MessageParameters, Messages } from './index';

/**
 * Blocks inference from a position, so a key outside the caller's catalog is a type error rather than widening `K`
 * (Messages' methods are bivariant). The pre-TypeScript-5.4 spelling of `NoInfer`, which keeps the published
 * declarations within the `typescript >=5` peer. Internal; not exported.
 */
export type NoInfer_<T> = [T][T extends unknown ? 0 : never];

/**
 * A message kept in state or carried by a failure: a catalog line with its data, translated when it renders (so a live
 * locale switch re-renders it), a raw string a server or failure supplied (rendered as it arrived), or a sequence of
 * these. Plain data only (strings, `{key, parameters}` objects, arrays), so one runtime copy can render a notice another
 * copy built. Never store `m.t(...)`.
 */
export type Notice<K extends string = string> =
    | string
    | { readonly key: K; readonly parameters?: MessageParameters }
    | readonly Notice<K>[];

/** A catalog line and its parameters, as a notice. */
export const notice = <K extends string>(key: K, parameters?: MessageParameters): Notice<K> => ({ key, parameters });

/** Render a notice in the reader's current locale. */
export function say<K extends string>(messages: Messages<K>, value: Notice<NoInfer_<K>>): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((part: Notice<K>) => say(messages, part)).join('');
    const line = value as { readonly key: K; readonly parameters?: MessageParameters };
    return messages.t(line.key, line.parameters);
}

/**
 * The brand a `NoticeError` carries, shared across installed copies of this runtime (64 allows a same-ABI duplicate),
 * where `instanceof` is false. `v1` belongs to `runtimeAbi: 1`; a change to the Notice shape takes a new version.
 */
const brand = Symbol.for('schemastud.messages.notice-error.v1');

/** A thrown catalog message: callers render `notice` in the reader's locale; `message` is English, for logs. */
export class NoticeError<K extends string = string> extends Error {
    readonly notice: Notice<K>;
    constructor(notice: Notice<NoInfer_<K>>, messages: Messages<K>) {
        super(say(messages, notice));
        this.name = 'NoticeError';
        this.notice = notice;
    }
}
Object.defineProperty(NoticeError.prototype, brand, { value: true });

function isNotice(value: unknown): value is Notice {
    if (typeof value === 'string') return true;
    if (Array.isArray(value)) return value.every(isNotice);
    if (typeof value !== 'object' || value === null) return false;
    const line = value as { key?: unknown; parameters?: unknown };
    return typeof line.key === 'string' && (line.parameters === undefined || (typeof line.parameters === 'object' && line.parameters !== null));
}

/** Whether a value is a `NoticeError` from any installed copy of this runtime: its brand and a plain-data notice. */
export function isNoticeError(value: unknown): value is NoticeError {
    return value instanceof Error && (value as unknown as Record<symbol, unknown>)[brand] === true
        && isNotice((value as { notice?: unknown }).notice);
}

function keysOf(value: Notice): string[] {
    if (typeof value === 'string') return [];
    if (Array.isArray(value)) return value.flatMap((part: Notice) => keysOf(part));
    return [(value as { readonly key: string }).key];
}

/**
 * What a caught failure shows, for the reader's `messages`:
 * - a `NoticeError` whose every key belongs to `messages`: its notice;
 * - any other `Error` (including another package's `NoticeError`): its English `message`;
 * - anything else: the fallback.
 */
export function noticeOf<K extends string>(messages: Messages<K>, failure: unknown, fallback: Notice<NoInfer_<K>>): Notice<K> {
    if (isNoticeError(failure) && keysOf(failure.notice).every(key => messages.has(key))) return failure.notice as Notice<K>;
    if (failure instanceof Error) return failure.message;
    return fallback;
}
