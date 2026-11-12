import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { canonicalize, parseJson } from '../bin/jcs.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/jcs.json', import.meta.url), 'utf8'));
it('matches the committed cross-language JCS bytes, UTF16 key order and numeric spelling', () => {
    const canonical = canonicalize(fixture.input);
    expect(canonical).toBe(fixture.canonical);
    expect(createHash('sha256').update(canonical).digest('hex')).toBe(fixture.sha256);
});
it.each(['{"a":1,"\\u0061":2}', '{"x":9007199254740993}', '{"x":1e999}', '{"x":"\\ud800"}'])('refuses unsafe JSON admission: %s', value => {
    expect(() => parseJson(value)).toThrow();
});
it('preserves escaped values and admits a proto-like member as plain data', () => {
    const value = parseJson(' { "__proto__": {"label":"a\\\"b\\\\c\\n"}, "array": [true, false, null, 0.5] } ');
    expect(canonicalize(value)).toBe('{"__proto__":{"label":"a\\\"b\\\\c\\n"},"array":[true,false,null,0.5]}');
    expect(Object.getPrototypeOf(value)).toBe(null);
});
