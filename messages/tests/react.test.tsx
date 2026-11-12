import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { MessageProvider, useMessages } from '../src/react';

const defaults = { 'messages.greeting': 'Hello :name' };
function Greeting() { return createElement('span', null, useMessages(defaults).t('messages.greeting', { name: 'Ada' })); }

it('renders English without a provider and each SSR tree uses only its own catalog', () => {
    expect(renderToString(createElement(Greeting))).toBe('<span>Hello Ada</span>');
    for (const [locale, text, expected] of [['es', 'Hola :name', 'Hola Ada'], ['de', 'Hallo :name', 'Hallo Ada']]) {
        const value = { version: 1 as const, locale, realm: null, direction: 'ltr' as const,
            messages: { 'messages.greeting': { text, sourceLocale: locale } } };
        expect(renderToString(createElement(MessageProvider, { value, children: createElement(Greeting) }))).toBe(`<span>${expected}</span>`);
    }
    expect(renderToString(createElement(Greeting))).toBe('<span>Hello Ada</span>');
});

it('a separately evaluated adapter shares the provider context object', async () => {
    vi.resetModules();
    const second = await import('../src/react');
    function OtherConsumer() { return createElement('span', null, second.useMessages(defaults).t('messages.greeting', { name: 'Ada' })); }
    const value = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const,
        messages: { 'messages.greeting': { text: 'Hola :name', sourceLocale: 'es' } } };
    expect(renderToString(createElement(MessageProvider, { value, children: createElement(OtherConsumer) }))).toBe('<span>Hola Ada</span>');
});
