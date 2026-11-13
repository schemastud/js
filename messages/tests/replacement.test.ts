import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createMessages, type MessageParameters } from '../src/index';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/replacement.json', import.meta.url), 'utf8')) as {
    version: number; cases: { line: string; parameters: MessageParameters; expected: string }[];
};

it('matches the committed shared replacement fixture without regenerating it', () => {
    expect(fixture.version).toBe(1);
    for (const { line, parameters, expected } of fixture.cases) {
        expect(createMessages({ 'messages.line': line }).t('messages.line', parameters)).toBe(expected);
    }
});
