// @vitest-environment jsdom
// Ticket 72 (frame-foundation): `MessageProvider value={null}` re-provides the outer options unchanged and renders the
// same Provider element, so a catalog <-> null switch keeps one tree shape (no remount).
import { act, createElement, useContext, useState, type Context, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider, useMessageLocale, useMessages } from '../src/react';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const defaults = { 'messages.greeting': 'Hello :name' };
const catalog = (locale: string, text: string) => ({
    version: 1 as const, locale, realm: null, direction: 'ltr' as const,
    messages: { 'messages.greeting': { text, sourceLocale: locale } },
});
const spanish = catalog('es', 'Hola :name');

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
});
function mount(node: ReactNode): HTMLElement {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(node));
    return host;
}
function rerender(node: ReactNode) {
    act(() => root!.render(node));
}

function Greeting() {
    return createElement('span', null, useMessages(defaults).t('messages.greeting', { name: 'Ada' }));
}

// The provider context is shared across adapter copies through a global symbol (react.tsx's ABI); read it the same way
// to observe the exact options object a consumer receives.
const sharedContext = (Reflect.get(globalThis, Symbol.for('schemastud.messages.context.v1')) as { context: Context<unknown> }).context;

it('a nested null keeps the outer catalog, with the SAME options object (no new identity)', () => {
    const seen: unknown[] = [];
    function Probe() {
        seen.push(useContext(sharedContext));
        return createElement(Greeting);
    }
    const el = mount(createElement(MessageProvider, { value: spanish, children: createElement('div', null,
        createElement(Probe),
        createElement(MessageProvider, { value: null, children: createElement(Probe) }),
    ) }));
    expect(el.textContent).toBe('Hola AdaHola Ada');
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBeNull();
    expect(seen[1]).toBe(seen[0]);
});

it('toggling value between a catalog and null keeps a stateful child (no remount)', () => {
    let mounts = 0;
    function Counter() {
        const [count, setCount] = useState(0);
        useState(() => { mounts++; return null; });
        return createElement('button', { type: 'button', onClick: () => setCount((c) => c + 1) },
            `${useMessages(defaults).t('messages.greeting', { name: 'Ada' })} ${count}`);
    }
    const tree = (value: ReturnType<typeof catalog> | null) =>
        createElement(MessageProvider, { value, children: createElement(Counter) });

    const el = mount(tree(spanish));
    const button = el.querySelector('button')!;
    act(() => button.click());
    act(() => button.click());
    expect(button.textContent).toBe('Hola Ada 2');

    rerender(tree(null));
    expect(el.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Hello Ada 2');

    rerender(tree(spanish));
    expect(el.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Hola Ada 2');
    expect(mounts).toBe(1);
});

it('a root null behaves exactly like no provider', () => {
    function Locale() {
        return createElement('i', null, useMessageLocale());
    }
    const bare = mount(createElement('div', null, createElement(Greeting), createElement(Locale))).innerHTML;
    act(() => root!.unmount());
    host!.remove();
    const withNull = mount(createElement(MessageProvider, { value: null,
        children: createElement('div', null, createElement(Greeting), createElement(Locale)) })).innerHTML;
    expect(withNull).toBe(bare);
    expect(withNull).toBe('<div><span>Hello Ada</span><i>en-US</i></div>');
});

it('pseudo is inherited under null: the inner pseudo prop is ignored', () => {
    const pseudoOuter = mount(createElement(MessageProvider, { value: spanish, pseudo: true, children: createElement('div', null,
        createElement(Greeting),
        createElement(MessageProvider, { value: null, pseudo: false, children: createElement(Greeting) }),
    ) }));
    const [outerText, innerText] = [...pseudoOuter.querySelectorAll('span')].map((s) => s.textContent);
    expect(outerText).not.toBe('Hola Ada');
    expect(innerText).toBe(outerText);

    act(() => root!.unmount());
    host!.remove();
    const plainOuter = mount(createElement(MessageProvider, { value: spanish, pseudo: false, children:
        createElement(MessageProvider, { value: null, pseudo: true, children: createElement(Greeting) }) }));
    expect(plainOuter.textContent).toBe('Hola Ada');
});

