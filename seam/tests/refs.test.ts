import { describe, expect, it, vi } from 'vitest';
import { resolveExternalRefs } from '../src/refs';
import type { SchemaNode } from '../src/types';

describe('external $ref resolution', () => {
    it('inlines external refs through the injected fetcher, leaving local refs alone', async () => {
        const fetcher = vi.fn(async (ref: string): Promise<SchemaNode> => {
            expect(ref).toBe('https://schemas.test/citation.json');
            return { type: 'object', properties: { url: { type: 'string', format: 'uri' } } };
        });

        const resolved = await resolveExternalRefs(
            {
                type: 'object',
                properties: {
                    citation: { $ref: 'https://schemas.test/citation.json' },
                    self: { $ref: '#/$defs/self' },
                },
                $defs: { self: { type: 'string' } },
            },
            fetcher,
        );

        const properties = resolved.properties as Record<string, SchemaNode>;
        expect(properties.citation).toEqual({
            type: 'object',
            properties: { url: { type: 'string', format: 'uri' } },
        });
        expect(properties.self).toEqual({ $ref: '#/$defs/self' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('keeps $ref siblings (2020-12 semantics) on the inlined node', async () => {
        const fetcher = async (): Promise<SchemaNode> => ({ type: 'string' });

        const resolved = await resolveExternalRefs(
            { $ref: 'https://schemas.test/name.json', 'x-widget': 'textarea' },
            fetcher,
        );

        expect(resolved).toEqual({ type: 'string', 'x-widget': 'textarea' });
    });

    it('memoizes repeated refs per fetcher', async () => {
        const fetcher = vi.fn(async (): Promise<SchemaNode> => ({ type: 'string' }));

        await resolveExternalRefs(
            {
                type: 'object',
                properties: {
                    a: { $ref: 'https://schemas.test/one.json' },
                    b: { $ref: 'https://schemas.test/one.json' },
                },
            },
            fetcher,
        );

        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('guards against cyclic external refs', async () => {
        const fetcher = vi.fn(async (): Promise<SchemaNode> => ({
            type: 'object',
            properties: { next: { $ref: 'https://schemas.test/node.json' } },
        }));

        const resolved = await resolveExternalRefs(
            { $ref: 'https://schemas.test/node.json' },
            fetcher,
        );

        const properties = resolved.properties as Record<string, SchemaNode>;
        expect(properties.next).toEqual({ $ref: 'https://schemas.test/node.json' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('is a no-op without a fetcher', async () => {
        const schema = { $ref: 'https://schemas.test/one.json' };
        expect(await resolveExternalRefs(schema)).toBe(schema);
    });
});
