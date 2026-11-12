import { describe, expect, it } from 'vitest';
import { createMessages, type Messages } from '../src/index';

describe('package messages', () => {
    it('renders its own English default and parameters with no provider', () => {
        const messages = createMessages({ 'messages.greeting': 'Hello :name' });
        expect(messages.t('messages.greeting', { name: 'Ada' })).toBe('Hello Ada');
    });
    it('uses the active flattened catalog instead of its English default', () => {
        const messages = createMessages({ 'messages.greeting': 'Hello :name' }, {
            catalog: { version: 1, locale: 'es-MX', realm: 'operator', direction: 'ltr',
                messages: { 'messages.greeting': { text: 'Hola :name', sourceLocale: 'es' } } },
        });
        expect(messages.t('messages.greeting', { name: 'Ada' })).toBe('Hola Ada');
    });
    it.each<[string, string, string, number, string]>([
        ['ja', 'en', 'one item|:count items', 2, '2 items'],
        ['ru', 'en', 'one item|:count items', 5, '5 items'],
        ['es-MX', 'es', 'un elemento|:count elementos', 2, '2 elementos'],
        ['en', 'ru', 'one|few|many', 21, 'one'],
        ['en', 'ru', 'one|few|many', -21, 'one'],
        ['en', 'ar', 'zero|one|two|few|many|other', 11, 'many'],
        ['es', 'es-419', 'one|many', 2, 'many'],
    ])('selects by answering %s/%s rather than requested locale', (locale, sourceLocale, text, count, expected) => {
        const messages = createMessages({ 'messages.items': 'one item|:count items' }, {
            catalog: { version: 1, locale, realm: null, direction: 'ltr',
                messages: { 'messages.items': { text, sourceLocale } } },
        });
        expect(messages.choice('messages.items', count)).toBe(expected);
    });
    it.each<[number, string]>([[0, 'none'], [1, 'one'], [2, '2 items'], [50, '50 items']])('selects explicit/interval conditions before replacing at %s', (count, expected) => {
        const messages = createMessages({ 'messages.items': '{0} none|{1} one|[2,*] :count items' });
        expect(messages.choice('messages.items', count)).toBe(expected);
    });
    it('replaces longest tokens with case variants once, without rescanning values or splitting their pipes', () => {
        const messages = createMessages({ 'messages.line': ':name / :NAME / :Name / :count / :countries' });
        expect(messages.t('messages.line', { name: 'ada|:countries', count: 2, countries: 'places' }))
            .toBe('ada|:countries / ADA|:COUNTRIES / Ada|:countries / 2 / places');
    });
    it('formats display values using the active requested locale, independently of answering locale', () => {
        const messages = createMessages({}, { catalog: { version: 1, locale: 'de-DE', realm: null, direction: 'ltr', messages: {} } });
        expect(messages.number(1234.5)).toBe('1.234,5');
        expect(messages.date(new Date('2024-01-02T00:00:00Z'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })).toBe('2. Januar 2024');
        expect(messages.relativeTime(-1, 'day', { numeric: 'auto' })).toBe('gestern');
        expect(messages.list(['eins', 'zwei'])).toBe('eins und zwei');
    });
    it('marks and pads pseudo text while preserving both replacement values', () => {
        const messages = createMessages({ 'messages.greeting': 'Hello :name, :count items' }, { pseudo: true });
        const result = messages.t('messages.greeting', { name: 'Ada', count: 27 });
        expect(result).not.toBe('Hello Ada, 27 items');
        expect(result).toContain('Ada');
        expect(result).toContain('27');
        expect(result).toMatch(/^⟦.*⟧$/u);
        expect(result.length).toBeGreaterThan('Hello Ada, 27 items'.length);
    });
});

// Checked by tsc; invalid keys must not widen to arbitrary strings.
function acceptsOnlyDeclaredKeys(messages: Messages<'messages.saved'>) {
    messages.t('messages.saved');
    // @ts-expect-error Unknown message keys are rejected at compile time.
    messages.t('messages.missing');
    // @ts-expect-error choice has the same finite key union.
    messages.choice('messages.missing', 2);
}
void acceptsOnlyDeclaredKeys;

it('rejects an unknown runtime key instead of reporting raw-key success', () => {
    const messages = createMessages({ 'messages.saved': 'Saved' });
    // @ts-expect-error Exercise JavaScript callers bypassing the declared key union.
    expect(() => messages.t('messages.missing')).toThrow('Unknown message key');
});
