import { createElement, Fragment, type ReactNode } from 'react';
import type { Messages } from './index';

/**
 * The pre-TypeScript-5.4 `NoInfer` (see notice.ts). A local copy on purpose: importing notice.ts from here would make
 * it a module shared by both entries, and the declaration bundler would split a hashed chunk that consumers' inferred
 * types cannot name (TS2742 in seam).
 */
type NoInfer_<T> = [T][T extends unknown ? 0 : never];

const slot = (index: number) => `￼${index}￼`;
const EMPHASIS_START = '￼0:￼';
const EMPHASIS_END = '￼0/￼';

export interface RichMessageProps {
    /** A translated line whose slots are `U+FFFC<index>U+FFFC` markers. */
    text: string;
    /** The node for each slot index. */
    parts: readonly ReactNode[];
    /** Wraps each run of plain text (a styled span, for example). */
    wrapText?: (text: string) => ReactNode;
    /** Wraps the run between the `emphasis_start` and `emphasis_end` markers. */
    emphasis?: (children: ReactNode) => ReactNode;
}

/**
 * A translated line with its slots swapped back for nodes. Translated text is never interpreted as markup: only the
 * caller's `parts`, `wrapText` and `emphasis` supply elements. A slot used twice keeps distinct keys.
 */
export function RichMessage({ text, parts, wrapText, emphasis }: RichMessageProps): ReactNode {
    if (emphasis) {
        return text.split(/(￼0:￼[\s\S]*?￼0\/￼)/u).map((section, index) => {
            const marked = /^￼0:￼([\s\S]*?)￼0\/￼$/u.exec(section);
            const content = createElement(RichMessage, { text: marked ? marked[1] : section, parts, wrapText });
            return createElement(Fragment, { key: marked ? `emphasis-${index}` : `section-${index}` }, marked ? emphasis(content) : content);
        });
    }
    const occurrences = new Map<string, number>();
    return text.split(/(￼\d+￼)/u).map((part, index) => {
        const match = /^￼(\d+)￼$/u.exec(part);
        const occurrence = match ? (occurrences.get(match[1]) ?? 0) : 0;
        if (match) occurrences.set(match[1], occurrence + 1);
        return createElement(Fragment, { key: match ? `slot-${match[1]}-${occurrence}` : `text-${index}` },
            match ? parts[Number(match[1])] : part && wrapText ? wrapText(part) : part);
    });
}

/**
 * Render one complete translated sentence whose parameters are React nodes (`<b>`, `<code>`, links), so a translator
 * moves them as a whole. Each node is passed as an opaque slot and swapped back after translation. With `emphasis`, the
 * line's `:emphasis_start` … `:emphasis_end` run is wrapped by it.
 */
export function richMessage<K extends string>(
    messages: Messages<K>,
    // The key must be one of the catalog's keys; NoInfer_ keeps a stray key from widening K (methods are bivariant).
    key: NoInfer_<K>,
    parts: Record<string, ReactNode>,
    options: { emphasis?: (children: ReactNode) => ReactNode } = {},
): ReactNode {
    const names = Object.keys(parts);
    const parameters: Record<string, string> = Object.fromEntries(names.map((name, index) => [name, slot(index)]));
    if (options.emphasis) Object.assign(parameters, { emphasis_start: EMPHASIS_START, emphasis_end: EMPHASIS_END });
    return createElement(RichMessage, { text: messages.t(key, parameters), parts: Object.values(parts), emphasis: options.emphasis });
}
