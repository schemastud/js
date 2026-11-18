import { Messages, ClientCatalog, MessageOptions } from './index.js';
import * as react from 'react';
import { ReactNode } from 'react';

/**
 * The pre-TypeScript-5.4 `NoInfer` (see notice.ts). A local copy on purpose: importing notice.ts from here would make
 * it a module shared by both entries, and the declaration bundler would split a hashed chunk that consumers' inferred
 * types cannot name (TS2742 in seam).
 */
type NoInfer_<T> = [T][T extends unknown ? 0 : never];
interface RichMessageProps {
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
declare function RichMessage({ text, parts, wrapText, emphasis }: RichMessageProps): ReactNode;
/**
 * Render one complete translated sentence whose parameters are React nodes (`<b>`, `<code>`, links), so a translator
 * moves them as a whole. Each node is passed as an opaque slot and swapped back after translation. With `emphasis`, the
 * line's `:emphasis_start` … `:emphasis_end` run is wrapped by it.
 */
declare function richMessage<K extends string>(messages: Messages<K>, key: NoInfer_<K>, parts: Record<string, ReactNode>, options?: {
    emphasis?: (children: ReactNode) => ReactNode;
}): ReactNode;

interface MessageProviderProps {
    /**
     * The catalog for this subtree, or `null` for "none served here": the provider then re-provides the outer
     * provider's options unchanged (same object, so consumers don't re-render) and `pseudo` is ignored — the outer
     * setting is inherited. At the root, `null` behaves exactly like no provider.
     */
    value: ClientCatalog | null;
    /** Pseudo-localize this subtree's lines. Ignored when `value` is `null` (the outer setting applies). */
    pseudo?: boolean;
    children: ReactNode;
}
/**
 * The context identity is shared; catalog values remain confined to this render tree. Always renders the same
 * Provider element, so switching `value` between a catalog and `null` never remounts the subtree.
 */
declare function MessageProvider({ value, pseudo, children }: MessageProviderProps): react.FunctionComponentElement<react.ProviderProps<MessageOptions | null>>;
declare function useMessages<const D extends Readonly<Record<string, string>>>(defaults: D): Messages<Extract<keyof D, string>>;
declare function useMessageLocale(): string;

export { MessageProvider, type MessageProviderProps, RichMessage, type RichMessageProps, richMessage, useMessageLocale, useMessages };
