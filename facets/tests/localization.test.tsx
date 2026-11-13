// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
afterEach(cleanup);
const catalog = (locale: string, lines: Record<string, string>): ClientCatalog => ({ version: 1, locale, realm: null, direction: 'ltr', messages: Object.fromEntries(Object.entries(lines).map(([key, text]) => [key, { text, sourceLocale: locale }])) });
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FacetsBar, FacetsProvider } from '../src/index';
import type { FacetsInjection, FilterSchema } from '../src/index';
const Box = ({ children }: any) => <div>{children}</div>;
const injection = { primitives: { Button: ({ children, ...props }: any) => <button {...props}>{children}</button>, Input: (props: any) => <input {...props} />, Label: Box, Popover: Box, PopoverTrigger: Box, PopoverContent: Box, SimpleSelect: () => null, Badge: Box }, transport: {}, useUrlState: () => [new URLSearchParams(), () => {}] } as unknown as FacetsInjection;
const schema: FilterSchema = { properties: { q: { 'x-filter': { name: 'q', control: 'search', operator: 'search' } }, status: { title: 'Status', 'x-filter': { name: 'status', control: 'multiselect', operator: 'exact', options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] } } } };
const client = new QueryClient();
const Provider = ({ children }: any) => <QueryClientProvider client={client}><FacetsProvider value={injection}>{children}</FacetsProvider></QueryClientProvider>;
const props = { resource: 'things', schema, values: { status: 'a,b' }, sort: null, onFilterChange: () => {}, onSortChange: () => {} };
it('English control: keeps exact search, selected summary, and clear label', () => {
 render(<Provider><FacetsBar {...props} /></Provider>);
 expect(screen.getByRole('textbox', { name: 'Search' }).getAttribute('placeholder')).toBe('Search…');
 expect(screen.getByText('2 selected')).toBeTruthy();
 expect(screen.getByRole('button', { name: 'Clear Status' })).toBeTruthy();
});
it('provider locale/catalog rerender translates complete count and clear messages on existing nodes', () => {
 const tree = (locale: string, search: string, selected: string, clear: string) => <MessageProvider value={catalog(locale, { 'schemastud-facets::messages.search': search, 'schemastud-facets::messages.selected': selected, 'schemastud-facets::messages.clear': clear })}><Provider><FacetsBar {...props} /></Provider></MessageProvider>;
 const { rerender } = render(tree('fr', 'Chercher', ':shownCount choisis', 'Effacer :label'));
 const input = screen.getByRole('textbox', { name: 'Chercher' });
 const button = screen.getByRole('button', { name: 'Effacer Status' });
 expect(screen.getByText('2 choisis')).toBeTruthy();
 // Pin the requested numbering system: ICU defaults for bare ar differ by version.
 rerender(tree('ar-u-nu-arab', 'بحث', ':shownCount مختارة', 'مسح :label'));
 expect(screen.getByRole('textbox', { name: 'بحث' })).toBe(input);
 expect(screen.getByRole('button', { name: 'مسح Status' })).toBe(button);
 expect(screen.getByText('٢ مختارة')).toBeTruthy();
});
