import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { Clock, OperatorOverlay, UpsellPopover, type DesktopApp } from '../index';
const app = { key: 'studio', title: 'Studio' } as DesktopApp;
function catalog(word: string): ClientCatalog {
    return { version: 1, locale: 'fr', realm: null, direction: 'ltr', messages: {
        'schemastud-mainframe::messages.minimize': { text: 'Réduire', sourceLocale: 'fr' },
        'schemastud-mainframe::messages.maximize': { text: 'Agrandir', sourceLocale: 'fr' },
        'schemastud-mainframe::messages.close': { text: 'Fermer', sourceLocale: 'fr' },
        'schemastud-mainframe::messages.operator': { text: word, sourceLocale: 'fr' },
        'schemastud-mainframe::messages.unlock': { text: 'Débloquer :title', sourceLocale: 'fr' },
        'schemastud-mainframe::messages.upsell_copy': { text: 'Pour lancer :title, changez de forfait.', sourceLocale: 'fr' },
    } };
}
describe('public mainframe localization', () => {
    it('keeps exact no-provider English and existing copy overrides', () => {
        const view = render(<><OperatorOverlay stableKeys={[]} resolveWindow={() => null} renderLauncher={() => null} /><UpsellPopover app={app} onClose={() => {}} /></>);
        expect(view.getByText('Operator')).toBeTruthy();
        expect(view.getByRole('dialog').getAttribute('aria-label')).toBe('Unlock Studio');
        expect(view.getByRole('dialog').textContent).toContain('The Studio app is available on a higher plan. Upgrade to launch it.');
        view.rerender(<MessageProvider value={catalog('Opérateur')}><OperatorOverlay stableKeys={[]} resolveWindow={() => null} renderLauncher={() => null} orbLabel="Custom operator" /><UpsellPopover app={{ ...app, upsell: { title: 'Custom title', cta: 'Custom CTA' } }} onClose={() => {}} /></MessageProvider>);
        expect(view.getByText('Custom operator')).toBeTruthy();
        expect(view.getByText('Custom title')).toBeTruthy();
        expect(view.getByText('Custom CTA')).toBeTruthy();
    });
    it('localizes operator window controls', () => {
        const view = render(<MessageProvider value={catalog('Opérateur')}><OperatorOverlay stableKeys={['tool']} resolveWindow={() => ({ title: 'Tool', accent: 'var(--stud-accent)', render: () => <div>Content</div> })} renderLauncher={() => null} onWindowManager={(wm) => { wm.open('tool'); }} /></MessageProvider>);
        expect(view.getByRole('button', { name: 'Réduire' }).getAttribute('title')).toBe('Réduire');
        expect(view.getByRole('button', { name: 'Agrandir' })).toBeTruthy();
        expect(view.getByRole('button', { name: 'Fermer' })).toBeTruthy();
    });
    it('formats the live clock with the current provider locale', () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-11-13T17:04:05Z'));
            const view = render(<MessageProvider value={catalog('Opérateur')}><Clock /></MessageProvider>);
            const format = { hour: '2-digit', minute: '2-digit', second: '2-digit' } as const;
            expect(view.container.textContent).toBe(new Intl.DateTimeFormat('fr', format).format(new Date()));
            view.rerender(<MessageProvider value={{ ...catalog('Operator'), locale: 'en-US' }}><Clock /></MessageProvider>);
            expect(view.container.textContent).toBe(new Intl.DateTimeFormat('en-US', format).format(new Date()));
        } finally { vi.useRealTimers(); }
    });
    it('updates complete upsell sentences and chrome without remounting', () => {
        const tree = (word: string) => <MessageProvider value={catalog(word)}><OperatorOverlay stableKeys={[]} resolveWindow={() => null} renderLauncher={() => null} /><UpsellPopover app={app} onClose={() => {}} /></MessageProvider>;
        const view = render(tree('Opérateur'));
        const orb = view.getByRole('button', { name: 'Opérateur' });
        expect(view.getByText('Pour lancer Studio, changez de forfait.')).toBeTruthy();
        view.rerender(tree('Administration'));
        expect(view.getByRole('button', { name: 'Administration' })).toBe(orb);
        expect(view.getByRole('dialog').getAttribute('aria-label')).toBe('Débloquer Studio');
    });
});
