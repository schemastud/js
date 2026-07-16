/**
 * The host-owned allowlisted component vocabulary.
 *
 * These are real first-party React components with first-party styles. The guest
 * may only *name* these element types (in its remote-dom `element` field); any type
 * not in this map is DROPPED by the renderer, never painted. This is the whole
 * portability + security contract: "our guardrails, their discretion."
 *
 * Ports the spike's 7 types to production shape. Each renderer receives the
 * reconciled remote element plus a `fire` back-channel (by handler id) and a
 * `children` slot.
 */
import { createElement, type ReactNode } from 'react';
import type { RemoteReceiverElement } from '@remote-dom/core/receivers';

export interface RenderContext {
    /** Fire an event back to the guest. `listenerValue` is the guest's stored ref. */
    fire: (listenerValue: unknown, payload: unknown) => void;
    /** Render this element's children (already reconciled). */
    children: () => ReactNode;
}

export type HostComponent = (element: RemoteReceiverElement, ctx: RenderContext) => ReactNode;

const card: React.CSSProperties = {
    border: '1px solid #d8dde6',
    borderRadius: 12,
    padding: 20,
    background: '#fff',
    boxShadow: '0 1px 3px rgba(16,24,40,.06)',
    maxWidth: 420,
};
const btn: React.CSSProperties = {
    cursor: 'pointer',
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontWeight: 600,
    fontSize: 14,
    background: '#3b5bdb',
    color: '#fff',
};
const badge: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 999,
    background: '#e7f5ff',
    color: '#1971c2',
};
const input: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    fontSize: 14,
    border: '1px solid #ced4da',
    borderRadius: 8,
};

function prop<T = unknown>(el: RemoteReceiverElement, name: string): T | undefined {
    return el.properties[name] as T | undefined;
}
function listener(el: RemoteReceiverElement, name: string): unknown {
    return el.eventListeners[name];
}

/**
 * The default vocabulary. A host can extend/replace this map — the registry is
 * host-owned by construction.
 */
export const DEFAULT_ALLOWLIST: Record<string, HostComponent> = {
    Stack: (el, { children }) =>
        createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: prop<number>(el, 'gap') ?? 12 } },
            children(),
        ),
    Card: (_el, { children }) => createElement('div', { style: card }, children()),
    Heading: (el) =>
        createElement('h2', { style: { margin: 0, fontSize: 20, color: '#101828' } }, prop<string>(el, 'text')),
    Text: (el) =>
        createElement('p', { style: { margin: 0, color: '#475467', lineHeight: 1.5 } }, prop<string>(el, 'text')),
    Badge: (el) => createElement('span', { style: badge }, prop<string>(el, 'text')),
    Button: (el, { fire }) =>
        createElement(
            'button',
            { style: btn, onClick: () => fire(listener(el, 'onClick'), {}) },
            prop<string>(el, 'text'),
        ),
    TextInput: (el, { fire }) =>
        createElement('input', {
            style: input,
            placeholder: prop<string>(el, 'placeholder'),
            value: prop<string>(el, 'value') ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                fire(listener(el, 'onInput'), { value: e.target.value }),
        }),
};
