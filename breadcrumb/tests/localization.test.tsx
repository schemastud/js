// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
afterEach(cleanup);
const catalog = (locale: string, lines: Record<string, string>): ClientCatalog => ({ version: 1, locale, realm: null, direction: 'ltr', messages: Object.fromEntries(Object.entries(lines).map(([key, text]) => [key, { text, sourceLocale: locale }])) });
import { Breadcrumb } from '../src/index';
const primitives = { Popover: () => null, PopoverTrigger: () => null, PopoverContent: () => null, Input: () => null };
const props = { primitives, crumbs: [{ label: 'Projects', path: '/projects' }, { label: 'Ada' }], onNavigate: () => {} };
it('English control: preserves breadcrumb label and host crumb copy', () => {
 render(<Breadcrumb {...props} />);
 expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
 expect(screen.getByRole('button', { name: 'Projects' })).toBeTruthy();
 expect(screen.getByText('Ada')).toBeTruthy();
});
it('provider rerender changes the accessible name on the same navigation node', () => {
 const tree = (locale: string, label: string) => <MessageProvider value={catalog(locale, { 'schemastud-breadcrumb::messages.breadcrumb': label })}><Breadcrumb {...props} /></MessageProvider>;
 const { rerender } = render(tree('fr', 'Fil d’Ariane'));
 const nav = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
 rerender(tree('de', 'Brotkrumen'));
 expect(screen.getByRole('navigation', { name: 'Brotkrumen' })).toBe(nav);
});
