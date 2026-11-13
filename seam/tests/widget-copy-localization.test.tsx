import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { StarRatingWidget, UnboundWidget } from '../src/index';
import type { ClientCatalog } from '@schemastud/messages';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const catalog = (text: string): ClientCatalog => ({ version: 1, locale: 'de-DE', realm: null, direction: 'ltr', messages: {
    'schemastud-seam::messages.widget.unbound': { text, sourceLocale: 'de' },
    'schemastud-seam::messages.widget.stars': { text: '{1} :shownCount Stern|[2,*] :shownCount Sterne', sourceLocale: 'de' },
} });
it('remaining seam widgets keep provider-free English and numeric rating behavior', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<><UnboundWidget context="detail" name="missing" label="Own field" /><StarRatingWidget value={2} onChange={() => {}} /></>);
    expect(screen.getByText('Unable to display this field').textContent).toBe('Unable to display this field');
    expect(screen.getByRole('radio', { name: '1 star' })).toBeDefined();
    expect(screen.getByRole('radio', { name: '2 stars' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Own field')).toBeDefined();
});
it('remaining seam widgets follow provider changes without remounting', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const tree = (value: ClientCatalog) => <MessageProvider value={value}><UnboundWidget context="detail" name="missing" /><StarRatingWidget value={2} onChange={() => {}} /></MessageProvider>;
    const view = render(tree(catalog('Nicht verfügbar')));
    expect(screen.getByText('Nicht verfügbar')).toBeDefined();
    expect(screen.getByRole('radio', { name: '1 Stern' })).toBeDefined();
    expect(screen.getByRole('radio', { name: '2 Sterne' })).toBeDefined();
    view.rerender(tree(catalog('Nicht darstellbar')));
    expect(screen.getByText('Nicht darstellbar')).toBeDefined();
});
