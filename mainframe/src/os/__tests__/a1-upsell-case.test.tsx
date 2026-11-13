import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { UpsellPopover, type DesktopApp } from '../index';

afterEach(cleanup);
const app = { key: 'studio', title: 'studio atlas' } as DesktopApp;
const value = (text: string): ClientCatalog => ({ version: 1, locale: 'en', realm: null, direction: 'ltr', messages: {
    'schemastud-mainframe::messages.upsell_copy': { text, sourceLocale: 'en' },
} });
it('upsell title case variants render matching emphasis with no NUL bytes', () => {
    const tree = (text: string) => <MessageProvider value={value(text)}><UpsellPopover app={app} onClose={() => {}} /></MessageProvider>;
    const view = render(tree(':title / :Title / :TITLE'));
    const panel = screen.getByRole('dialog');
    const copy = panel.querySelector('.upsell-copy')!;
    expect(copy.innerHTML).toBe('<b>studio atlas</b> / <b>Studio atlas</b> / <b>STUDIO ATLAS</b>');
    expect(copy.innerHTML).not.toContain('\u0000');
    expect(copy.textContent).not.toContain('\u0000');
    view.rerender(tree('Access :TITLE.'));
    expect(screen.getByRole('dialog')).toBe(panel);
    expect(panel.querySelector('.upsell-copy')).toBe(copy);
    expect(copy.innerHTML).toBe('Access <b>STUDIO ATLAS</b>.');
    expect(copy.innerHTML).not.toContain('\u0000');
});
