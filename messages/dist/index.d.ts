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
}
declare function createMessages<const D extends Readonly<Record<string, string>>>(defaults: D, options?: MessageOptions): Messages<Extract<keyof D, string>>;

export { type ClientCatalog, type MessageOptions, type MessageParameters, type Messages, type ResolvedLine, createMessages };
