import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { UpsellPopover, type DesktopApp } from '../index';

afterEach(cleanup);
const app = { key: 'studio', title: 'Studio' } as DesktopApp;
const value = (text: string): ClientCatalog => ({ version: 1, locale: 'fr', realm: null, direction: 'ltr', messages: {
    'schemastud-mainframe::messages.upsell_copy': { text, sourceLocale: 'fr' },
} });
it('provider-free upsell copy preserves exact English markup with title emphasis', () => {
    const view = render(<UpsellPopover app={app} onClose={() => {}} />);
    expect(view.container.querySelector('.upsell-copy')?.innerHTML).toBe('The <b>Studio</b> app is available on a higher plan. Upgrade to launch it.');
});
it('upsell whole sentence reorders and repeats emphasized title after provider changes', () => {
    const tree = (text: string) => <MessageProvider value={value(text)}><UpsellPopover app={app} onClose={() => {}} /></MessageProvider>;
    const view = render(tree('Pour :title, changez de forfait.'));
    const panel = screen.getByRole('dialog');
    const copy = panel.querySelector('.upsell-copy')!;
    expect(copy.innerHTML).toBe('Pour <b>Studio</b>, changez de forfait.');
    view.rerender(tree('Changez de forfait pour :title. :title vous attend.'));
    expect(screen.getByRole('dialog')).toBe(panel);
    expect(panel.querySelector('.upsell-copy')).toBe(copy);
    expect(copy.innerHTML).toBe('Changez de forfait pour <b>Studio</b>. <b>Studio</b> vous attend.');
    view.rerender(tree('Changez de forfait.'));
    expect(copy.innerHTML).toBe('Changez de forfait.');
});
