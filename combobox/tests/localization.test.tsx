// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
afterEach(cleanup);
const catalog = (locale: string, lines: Record<string, string>): ClientCatalog => ({ version: 1, locale, realm: null, direction: 'ltr', messages: Object.fromEntries(Object.entries(lines).map(([key, text]) => [key, { text, sourceLocale: locale }])) });
import { ComboboxList } from '../src/index';
const Input = (props: any) => <input {...props} />;
const search = () => new Promise<[]>(() => {});
it('English control: preserves default and caller copy', () => {
 const { rerender } = render(<ComboboxList Input={Input} search={search} onSelect={() => {}} />);
 expect(screen.getByRole('combobox').getAttribute('placeholder')).toBe('Search…');
 expect(screen.getByText('Searching…')).toBeTruthy();
 rerender(<ComboboxList Input={Input} search={search} onSelect={() => {}} placeholder="Find people" loadingText="Please wait" />);
 expect(screen.getByRole('combobox').getAttribute('placeholder')).toBe('Find people');
 expect(screen.getByText('Please wait')).toBeTruthy();
});
it('provider rerender changes defaults without remounting or clearing the query', () => {
 const tree = (locale: string, placeholder: string, loading: string) => <MessageProvider value={catalog(locale, { 'schemastud-combobox::messages.search': placeholder, 'schemastud-combobox::messages.searching': loading })}><ComboboxList Input={Input} search={search} onSelect={() => {}} /></MessageProvider>;
 const { rerender } = render(tree('fr', 'Chercher…', 'Recherche…'));
 const input = screen.getByRole('combobox');
 expect(input.getAttribute('placeholder')).toBe('Chercher…');
 expect(screen.getByText('Recherche…')).toBeTruthy();
 fireEvent.change(input, { target: { value: 'Ada' } });
 rerender(tree('de', 'Suchen…', 'Suche…'));
 expect(screen.getByRole('combobox')).toBe(input);
 expect((input as HTMLInputElement).value).toBe('Ada');
 expect(input.getAttribute('placeholder')).toBe('Suchen…');
 expect(screen.getByText('Suche…')).toBeTruthy();
});

it('English control: empty copy and its override stay exact', async () => {
 const emptySearch = async () => [];
 const { rerender } = render(<ComboboxList Input={Input} search={emptySearch} onSelect={() => {}} debounceMs={0} />);
 expect(await screen.findByText('No matches')).toBeTruthy();
 rerender(<ComboboxList Input={Input} search={emptySearch} onSelect={() => {}} debounceMs={0} emptyText="Nobody here" />);
 expect(screen.getByText('Nobody here')).toBeTruthy();
});
it('provider rerender translates the empty result on the same input', async () => {
 const emptySearch = async () => [];
 const tree = (locale: string, text: string) => <MessageProvider value={catalog(locale, { 'schemastud-combobox::messages.no_matches': text })}><ComboboxList Input={Input} search={emptySearch} onSelect={() => {}} debounceMs={0} /></MessageProvider>;
 const { rerender } = render(tree('fr', 'Aucun résultat'));
 const input = screen.getByRole('combobox');
 expect(await screen.findByText('Aucun résultat')).toBeTruthy();
 rerender(tree('de', 'Keine Treffer'));
 expect(screen.getByRole('combobox')).toBe(input);
 expect(screen.getByText('Keine Treffer')).toBeTruthy();
});
