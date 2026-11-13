import { choosePlural } from './plural';
export type MessageParameters = Readonly<Record<string, string | number | boolean | null>>;

export interface ResolvedLine { readonly text: string; readonly sourceLocale: string }
export interface ClientCatalog {
    readonly version: 1;
    readonly locale: string;
    readonly realm: string | null;
    readonly direction: 'ltr' | 'rtl';
    readonly messages: Readonly<Record<string, ResolvedLine>>;
}
export interface MessageOptions { readonly catalog?: ClientCatalog; readonly pseudo?: boolean }

export interface Messages<K extends string> {
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

export function createMessages<const D extends Readonly<Record<string, string>>>(defaults: D, options: MessageOptions = {}): Messages<Extract<keyof D, string>> {
    type Key = Extract<keyof D, string>;
    function lineFor(key: Key): ResolvedLine {
        if (!Object.hasOwn(defaults, key)) throw new Error(`Unknown message key: ${key}`);
        const translated = options.catalog?.messages;
        return translated && Object.hasOwn(translated, key) ? translated[key] : { text: defaults[key], sourceLocale: 'en' };
    }
    function replace(line: string, parameters: MessageParameters): string {
        const replacements = new Map<string, string>();
        const ucfirst = (value: string) => {
            const first = [...value][0] ?? '';
            return first.toUpperCase() + value.slice(first.length);
        };
        for (const [key, value] of Object.entries(parameters)) {
            if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new TypeError('Message parameters must be scalar');
            if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Message parameters must be finite');
            const text = value === null || value === false ? '' : value === true ? '1' : String(value);
            replacements.set(':' + ucfirst(key), ucfirst(text));
            replacements.set(':' + key.toUpperCase(), text.toUpperCase());
            replacements.set(':' + key, text);
        }
        const tokens = [...replacements.keys()].sort((a, b) => b.length - a.length);
        const escaped = tokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (options.pseudo) {
            const vowels: Readonly<Record<string, string>> = { a: 'á', e: 'ë', i: 'ï', o: 'ô', u: 'ü' };
            const protectedTokens = tokens.length ? new RegExp('(' + escaped.join('|') + ')', 'gu') : /(:[\p{L}_][\p{L}\p{N}_-]*)/u;
            const marked = line.split(protectedTokens).map((part, index) => index % 2 ? part : part.replace(/[aeiou]/gi, letter => {
                const accent = vowels[letter.toLowerCase()];
                return letter === letter.toUpperCase() ? accent.toUpperCase() : accent;
            })).join('');
            line = `⟦${marked} ${'·'.repeat(Math.max(1, Math.ceil(line.length * 0.3)))}⟧`;
        }
        return tokens.length ? line.replace(new RegExp(escaped.join('|'), 'gu'), token => replacements.get(token)!) : line;
    }
    const locale = options.catalog?.locale ?? 'en-US';
    return {
        locale,
        realm: options.catalog?.realm ?? null,
        direction: options.catalog?.direction ?? 'ltr',
        number(value: number, format?: Intl.NumberFormatOptions): string { return new Intl.NumberFormat(locale, format).format(value); },
        date(value: Date | number, format?: Intl.DateTimeFormatOptions): string { return new Intl.DateTimeFormat(locale, format).format(value); },
        relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, format?: Intl.RelativeTimeFormatOptions): string { return new Intl.RelativeTimeFormat(locale, format).format(value, unit); },
        list(values: readonly string[], format?: Intl.ListFormatOptions): string { return new Intl.ListFormat(locale, format).format(values); },
        t(key: Key, parameters: MessageParameters = {}): string { return replace(lineFor(key).text, parameters); },
        choice(key: Key, count: number, parameters: MessageParameters = {}): string {
            const line = lineFor(key);
            return replace(choosePlural(line.text, count, line.sourceLocale), { ...parameters, count });
        },
    };
}
