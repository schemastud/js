// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
afterEach(cleanup);
const catalog = (locale: string, lines: Record<string, string>): ClientCatalog => ({ version: 1, locale, realm: null, direction: 'ltr', messages: Object.fromEntries(Object.entries(lines).map(([key, text]) => [key, { text, sourceLocale: locale }])) });
import { ExpandableNav, OnThisPage } from '../src/index';
const items = [{ title: 'Start', href: '/start', group: 'Guide' }];
const props = { items, renderLink: (item: { title: string }) => <span>{item.title}</span> };
it('English control: preserves navigation default and explicit label override', () => {
 const { rerender } = render(<ExpandableNav {...props} />);
 expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeTruthy();
 rerender(<ExpandableNav {...props} aria-label="Project guide" />);
 expect(screen.getByRole('navigation', { name: 'Project guide' })).toBeTruthy();
});
it('provider rerender changes copy and retains collapsed group state', () => {
 const tree = (locale: string, label: string) => <MessageProvider value={catalog(locale, { 'schemastud-nav::messages.navigation': label })}><ExpandableNav {...props} /></MessageProvider>;
 const { rerender } = render(tree('fr', 'Parcourir'));
 const nav = screen.getByRole('navigation', { name: 'Parcourir' });
 const group = screen.getByRole('button', { name: 'Guide' });
 fireEvent.click(group);
 expect(group.getAttribute('aria-expanded')).toBe('false');
 rerender(tree('de', 'Wegweiser'));
 expect(screen.getByRole('navigation', { name: 'Wegweiser' })).toBe(nav);
 expect(screen.getByRole('button', { name: 'Guide' })).toBe(group);
 expect(group.getAttribute('aria-expanded')).toBe('false');
});

it('English control: TOC heading defaults and host title overrides remain exact', () => {
 vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
 const { rerender } = render(<OnThisPage routeKey="start" minHeadings={0} />);
 expect(screen.getByRole('navigation', { name: 'On this page' })).toBeTruthy();
 expect(screen.getByText('On this page')).toBeTruthy();
 rerender(<OnThisPage routeKey="start" minHeadings={0} title="Contents" aria-label="Page contents" />);
 expect(screen.getByRole('navigation', { name: 'Page contents' })).toBeTruthy();
 expect(screen.getByText('Contents')).toBeTruthy();
 rerender(<OnThisPage routeKey="start" minHeadings={0} title={null} />);
 expect(screen.queryByText('On this page')).toBeNull();
 vi.unstubAllGlobals();
});
it('provider rerender updates the TOC heading and label on the same node', () => {
 vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
 const tree = (locale: string, text: string) => <MessageProvider value={catalog(locale, { 'schemastud-nav::messages.on_this_page': text })}><OnThisPage routeKey="start" minHeadings={0} /></MessageProvider>;
 const { rerender } = render(tree('fr', 'Sur cette page'));
 const nav = screen.getByRole('navigation', { name: 'Sur cette page' });
 expect(screen.getByText('Sur cette page')).toBeTruthy();
 rerender(tree('de', 'Auf dieser Seite'));
 expect(screen.getByRole('navigation', { name: 'Auf dieser Seite' })).toBe(nav);
 expect(screen.getByText('Auf dieser Seite')).toBeTruthy();
 vi.unstubAllGlobals();
});
