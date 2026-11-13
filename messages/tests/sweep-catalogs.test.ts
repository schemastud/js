import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const packages = ['blockdoc', 'facets', 'chat', 'frame-remote', 'seam', 'combobox', 'big-calendar', 'nav', 'mainframe', 'breadcrumb'];
it.each(packages)('%s publishes its default catalog and every private typed translation key resolves', (name) => {
    const pkg = JSON.parse(readFileSync(resolve(root, name, 'package.json'), 'utf8'));
    const catalog = JSON.parse(readFileSync(resolve(root, name, 'messages.default.json'), 'utf8'));
    expect(pkg.exports['./messages']).toBe('./messages.default.json');
    expect(pkg.files).toContain('messages.default.json');
    expect(pkg.schemastud.messages).toEqual({ version: 1, catalog: './messages' });
    expect(pkg.peerDependencies['@schemastud/messages']).toBe('^0.1.0');
    expect(catalog.version).toBe(1);
    expect(catalog.package).toBe(pkg.name);
    expect(catalog.sourceLocale).toBe('en');
    expect(Object.keys(catalog.messages).length).toBeGreaterThan(0);
    for (const [key, text] of Object.entries(catalog.messages)) {
        expect(key.startsWith(catalog.namespace + '::messages.')).toBe(true);
        expect(typeof text).toBe('string');
    }
});
