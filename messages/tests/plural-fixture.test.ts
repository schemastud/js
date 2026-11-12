import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createMessages } from '../src/index';

const bytes = readFileSync(new URL('./fixtures/plural-selector.json', import.meta.url));
const fixture = JSON.parse(bytes.toString('utf8')) as {
    aliases: string[]; counts: number[]; indexes: Record<string, number[]>;
    normalization: { alias: string; locale: string }[];
};

it('consumes the byte-identical committed beam golden table without regenerating it', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('84e24b46ac387ac39dc437be5613443551fb257ca9c12906e660701bd5fea07d');
    expect(fixture.aliases).toHaveLength(280);
    expect(fixture.counts).toHaveLength(203);
    for (const sourceLocale of fixture.aliases) {
        const messages = createMessages({ 'messages.index': '0|1|2|3|4|5' }, {
            catalog: { version: 1, locale: 'ja', realm: null, direction: 'ltr',
                messages: { 'messages.index': { text: '0|1|2|3|4|5', sourceLocale } } },
        });
        for (const [index, count] of fixture.counts.entries()) {
            expect(messages.choice('messages.index', count), `${sourceLocale}/${count}`).toBe(String(fixture.indexes[sourceLocale][index]));
        }
    }
});

it('uses the shared full-alias then language fallback cases', () => {
    for (const { alias, locale: sourceLocale } of fixture.normalization) {
        const messages = createMessages({ 'messages.index': '0|1|2|3|4|5' }, {
            catalog: { version: 1, locale: 'en', realm: null, direction: 'ltr',
                messages: { 'messages.index': { text: '0|1|2|3|4|5', sourceLocale } } },
        });
        for (const [index, count] of fixture.counts.entries()) {
            expect(messages.choice('messages.index', count), `${sourceLocale}/${count}`).toBe(String(fixture.indexes[alias]?.[index] ?? 0));
        }
    }
});
