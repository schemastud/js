/**
 * Blocks inference from a position, so a key outside the caller's catalog is a type error rather than widening `K`
 * (Messages' methods are bivariant). The pre-TypeScript-5.4 spelling of `NoInfer`, which keeps the published
 * declarations within the `typescript >=5` peer. Internal: not exported, and rich-message.ts keeps its own copy, because a
 * type shared between the root and `/react` makes the declaration bundler split a hashed chunk that a consumer's
 * inferred types cannot name (TS2742).
 */
type NoInfer_<T> = [T][T extends unknown ? 0 : never];
/**
 * A message kept in state or carried by a failure: a catalog line with its data, translated when it renders (so a live
 * locale switch re-renders it), a raw string a server or failure supplied (rendered as it arrived), or a sequence of
 * these. Plain data only (strings, `{key, parameters}` objects, arrays), so one runtime copy can render a notice another
 * copy built. Never store `m.t(...)`.
 */
type Notice<K extends string = string> = string | {
    readonly key: K;
    readonly parameters?: MessageParameters;
} | readonly Notice<K>[];
/** A catalog line and its parameters, as a notice. */
declare const notice: <K extends string>(key: K, parameters?: MessageParameters) => Notice<K>;
/** Render a notice in the reader's current locale. */
declare function say<K extends string>(messages: Messages<K>, value: Notice<NoInfer_<K>>): string;
/** A thrown catalog message: callers render `notice` in the reader's locale; `message` is English, for logs. */
declare class NoticeError<K extends string = string> extends Error {
    readonly notice: Notice<K>;
    constructor(notice: Notice<NoInfer_<K>>, messages: Messages<K>);
}
/** Whether a value is a `NoticeError` from any installed copy of this runtime: its brand and a plain-data notice. */
declare function isNoticeError(value: unknown): value is NoticeError;
/**
 * What a caught failure shows, for the reader's `messages`:
 * - a `NoticeError` whose every key belongs to `messages`: its notice;
 * - any other `Error` (including another package's `NoticeError`): its English `message`;
 * - anything else: the fallback.
 */
declare function noticeOf<K extends string>(messages: Messages<K>, failure: unknown, fallback: Notice<NoInfer_<K>>): Notice<K>;

type MessageParameters = Readonly<Record<string, string | number | boolean | null>>;
interface ResolvedLine {
    readonly text: string;
    readonly sourceLocale: string;
}
interface ClientCatalog {
    readonly version: 1;
    readonly locale: string;
    readonly realm: string | null;
    readonly direction: 'ltr' | 'rtl';
    readonly messages: Readonly<Record<string, ResolvedLine>>;
}
interface MessageOptions {
    readonly catalog?: ClientCatalog;
    readonly pseudo?: boolean;
}
interface Messages<K extends string> {
    readonly locale: string;
    readonly realm: string | null;
    readonly direction: 'ltr' | 'rtl';
    t(key: K, parameters?: MessageParameters): string;
    choice(key: K, count: number, parameters?: MessageParameters): string;
    number(value: number, format?: Intl.NumberFormatOptions): string;
    date(value: Date | number, format?: Intl.DateTimeFormatOptions): string;
    relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, format?: Intl.RelativeTimeFormatOptions): string;
    list(values: readonly string[], format?: Intl.ListFormatOptions): string;
    /** Whether `key` is one of this catalog's keys (a notice from another package's catalog is not). */
    has(key: string): key is K;
}
declare function createMessages<const D extends Readonly<Record<string, string>>>(defaults: D, options?: MessageOptions): Messages<Extract<keyof D, string>>;

export { type ClientCatalog, type MessageOptions, type MessageParameters, type Messages, type Notice, NoticeError, type ResolvedLine, createMessages, isNoticeError, notice, noticeOf, say };
