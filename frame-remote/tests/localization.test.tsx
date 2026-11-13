import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { RemoteComponentBridge, RemoteSurface, readManifest, evaluateManifest } from '../src/index';

it('required red: unknown-block display follows provider changes without reloading the guest', async () => {
    const bridge = await RemoteComponentBridge.create();
    bridge.load("FrameRemote.render(FrameRemote.h('DangerZone', {}, []));");
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const surface = createElement(RemoteSurface, { host: bridge.host });
    const value = (text: string): ClientCatalog => ({ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-frame-remote::messages.unknown_block': { text, sourceLocale: 'es' },
    } });
    try {
        act(() => root.render(surface));
        expect(container.textContent).toBe('⛔ unknown block <DangerZone> — not in host vocabulary');
        const blocked = container.firstElementChild;
        act(() => root.render(createElement(MessageProvider, { value: value('Bloque <:block> desconocido'), children: surface })));
        expect(container.textContent).toBe('Bloque <DangerZone> desconocido');
        const translated = container.firstElementChild;
        act(() => root.render(createElement(MessageProvider, { value: value('Desconocido <:block>'), children: surface })));
        expect(container.textContent).toBe('Desconocido <DangerZone>');
        expect(container.firstElementChild).toBe(translated);
        expect(blocked).not.toBeNull();
    } finally {
        act(() => root.unmount());
        bridge.dispose();
        container.remove();
    }
});

it('English control: manifest diagnostics preserve the public error-string contract', () => {
    expect(readManifest(null)).toEqual({ ok: false, reason: 'manifest_missing', message: 'no component manifest supplied' });
    expect(readManifest({})).toEqual({ ok: false, reason: 'manifest_no_major', message: 'manifest.vocabularyMajor must be an integer' });
});

it('English control: pure manifest gates preserve exact diagnostic sentences', () => {
    expect(readManifest({ vocabularyMajor: 1, capabilities: false })).toEqual({ ok: false, reason: 'manifest_bad_capabilities', message: 'manifest.capabilities must be an array of capability-name strings' });
    expect(evaluateManifest({ vocabularyMajor: 1, capabilities: ['alien' as never] }, { tier: 'first_party', hostMajor: 1 }).message).toBe('component requests unknown capability "alien" — not a host capability');
    expect(evaluateManifest({ vocabularyMajor: 1, capabilities: ['request_save'] }, { tier: 'untrusted_publisher', hostMajor: 1 }).message).toBe('component (tier "untrusted_publisher") requests capability "request_save" beyond its tier — refused at load before render');
    expect(evaluateManifest({ vocabularyMajor: 2, capabilities: [] }, { tier: 'first_party', hostMajor: 1 }).message).toBe('component built for vocabulary major v2, host is on v1 — painting a host-owned shim instead of the guest tree');
    expect(evaluateManifest({ vocabularyMajor: 2, capabilities: [] }, { tier: 'first_party', hostMajor: 1, allowShim: false }).message).toBe('component built for vocabulary major v2, host is on v1 — refused (shim disabled)');
});
