import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createMessages } from '../src/index';
import { RichMessage, richMessage } from '../src/react';

// frame-foundation 66: the rich-message helpers in /react, the union of beam-ux's richMessage and beam-inertia's
// RichMessage/surfaceMessage. Nodes travel as opaque slots; translated text is never parsed as markup.
const defaults = {
    'pkg::messages.invited': ':inviter invited :email to join :team.',
    'pkg::messages.twice': ':who and :who again',
    'pkg::messages.markup': '<b>Bold?</b> :name',
    'pkg::messages.emphasis': 'Read :emphasis_start:what:emphasis_end first.',
};
const html = (node: unknown) => renderToStaticMarkup(createElement('p', null, node as never));

describe('richMessage', () => {
    it('swaps each slot back for its node, in the translated order', () => {
        const spanish = createMessages(defaults, { catalog: { version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
            'pkg::messages.invited': { text: ':team: :email, invitado por :inviter.', sourceLocale: 'es' },
        } } });
        const parts = { inviter: 'Ada', email: createElement('b', null, 'ada@example.test'), team: createElement('i', null, 'Acme') };
        expect(html(richMessage(createMessages(defaults), 'pkg::messages.invited', parts))).toBe('<p>Ada invited <b>ada@example.test</b> to join <i>Acme</i>.</p>');
        expect(html(richMessage(spanish, 'pkg::messages.invited', parts))).toBe('<p><i>Acme</i>: <b>ada@example.test</b>, invitado por Ada.</p>');
    });

    it('renders a slot used twice, with distinct keys', () => {
        const node = richMessage(createMessages(defaults), 'pkg::messages.twice', { who: createElement('b', null, 'Ada') });
        expect(html(node)).toBe('<p><b>Ada</b> and <b>Ada</b> again</p>');
    });

    it('keeps markup in a translation as text', () => {
        expect(html(richMessage(createMessages(defaults), 'pkg::messages.markup', { name: 'Ada' }))).toBe('<p>&lt;b&gt;Bold?&lt;/b&gt; Ada</p>');
    });

    it('wraps the emphasis run with the caller\'s element', () => {
        const node = richMessage(createMessages(defaults), 'pkg::messages.emphasis', { what: createElement('code', null, 'README') },
            { emphasis: (children) => createElement('strong', null, children) });
        expect(html(node)).toBe('<p>Read <strong><code>README</code></strong> first.</p>');
    });

    it('narrows the key to the caller\'s catalog', () => {
        // @ts-expect-error: a key outside this catalog is a type error, as in the per-package copies.
        expect(() => richMessage(createMessages(defaults), 'pkg::messages.missing', {})).toThrow('Unknown message key');
    });
});

describe('RichMessage', () => {
    it('wraps each plain-text run with wrapText and leaves the slots alone', () => {
        const text = 'Hello ￼0￼ and welcome';
        const node = createElement(RichMessage, { text, parts: [createElement('b', null, 'Ada')], wrapText: (run) => createElement('span', null, run) });
        expect(html(node)).toBe('<p><span>Hello </span><b>Ada</b><span> and welcome</span></p>');
    });
});
