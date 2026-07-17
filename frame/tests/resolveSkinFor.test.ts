import { describe, expect, it } from 'vitest';
import { BlockChromeFallback, createSkinRegistry } from '@schemastud/seam';
import { resolveSkinFor } from '../src/resolveSkinFor';

const productSkin = () => null;
const fancySkin = () => null;

function registry() {
    const r = createSkinRegistry();
    r.registerSkin('product', productSkin);
    r.registerSkin('fancy-product', fancySkin);
    return r;
}

describe('resolveSkinFor — x-skin cascade (ED-12)', () => {
    it('defaults to the node-type skin when no x-skin is authored', () => {
        const resolved = resolveSkinFor('product', {}, registry());

        expect(resolved.skin).toBe(productSkin);
        expect(resolved.key).toBe('product');
        expect(resolved.source).toBe('node-type');
        expect(resolved.fallback).toBe(false);
    });

    it('an x-skin override wins by specificity', () => {
        const resolved = resolveSkinFor('product', { 'x-skin': 'fancy-product' }, registry());

        expect(resolved.skin).toBe(fancySkin);
        expect(resolved.key).toBe('fancy-product');
        expect(resolved.source).toBe('override');
        expect(resolved.fallback).toBe(false);
    });

    it('an unknown node-type falls back to block-chrome', () => {
        const resolved = resolveSkinFor('mystery', {}, registry());

        expect(resolved.skin).toBe(BlockChromeFallback);
        expect(resolved.fallback).toBe(true);
        expect(resolved.source).toBe('node-type');
    });

    it('an override naming an unregistered skin falls back to block-chrome', () => {
        const resolved = resolveSkinFor('product', { 'x-skin': 'nope' }, registry());

        expect(resolved.skin).toBe(BlockChromeFallback);
        expect(resolved.key).toBe('nope');
        expect(resolved.source).toBe('override');
        expect(resolved.fallback).toBe(true);
    });

    it('ignores a non-string / empty x-skin (treats it as no override)', () => {
        expect(resolveSkinFor('product', { 'x-skin': '' }, registry()).source).toBe('node-type');
        expect(resolveSkinFor('product', { 'x-skin': 123 }, registry()).source).toBe('node-type');
    });
});
