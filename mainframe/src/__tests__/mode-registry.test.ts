/**
 * The mode registry sits on `@schemastud/registry` and keeps the interface it had as a `Map` wrapper.
 * These pin what a caller sees through `createMainframeRegistry()`: a duplicate replaces in place and is
 * recorded, a registrant can be read back, a miss is `undefined`, and any string is a mode name.
 */
import { describe, expect, it } from 'vitest';

import { createMainframeRegistry, type Mainframe, type MainframeRegistration } from '../index';

const Desk = (() => null) as Mainframe;
const Window = (() => null) as Mainframe;
const Os = (() => null) as Mainframe;

/** The registry as it was: a `Map` keyed by mode, set on every register. */
function reference() {
    const byMode = new Map<string, MainframeRegistration>();

    return {
        register(mode: string, component: Mainframe): void {
            byMode.set(mode, { mode, component, customSlots: [] });
        },
        get: (mode: string) => byMode.get(mode),
        modes: () => [...byMode.keys()],
        all: () => [...byMode.values()],
    };
}

describe('a duplicate mode', () => {
    it('replaces the registration in place: all() and modes() keep the order a Map kept', () => {
        const registry = createMainframeRegistry();
        const map = reference();

        for (const target of [registry, map]) {
            target.register('desk', Desk);
            target.register('window', Window);
            target.register('os', Os);
            target.register('desk', Os); // override of the first mode
        }

        expect(registry.modes()).toEqual(['desk', 'window', 'os']);
        expect(registry.modes()).toEqual(map.modes());
        expect(registry.all().map((r) => [r.mode, r.component])).toEqual([
            ['desk', Os],
            ['window', Window],
            ['os', Os],
        ]);
        expect(registry.all()).toEqual(map.all());
        expect(registry.get('desk')?.component).toBe(Os);
    });

    it('never throws, and records what it displaced with both registrants', () => {
        const registry = createMainframeRegistry();
        const slots = [{ name: 'dock', fillType: 'ordered-multi-source' as const }];

        registry.register('desk', Desk, { slots }, '@splicewire/beam-mainframe');
        expect(() => registry.register('desk', Window, undefined, 'app/host')).not.toThrow();

        expect(registry.supersededModes?.('desk')).toEqual([
            {
                registration: { mode: 'desk', component: Desk, customSlots: slots },
                by: '@splicewire/beam-mainframe',
                supersededBy: 'app/host',
            },
        ]);
        expect(registry.get('desk')).toEqual({ mode: 'desk', component: Window, customSlots: [] });
    });

    it('displaces nothing on a first registration', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk);

        expect(registry.supersededModes?.('desk')).toEqual([]);
        expect(registry.supersededModes?.('never')).toEqual([]);
    });
});

describe('the registrant', () => {
    it('reads back who registered the mode a name resolves to', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk, undefined, '@schemastud/mainframe');
        registry.register('window', Window);

        expect(registry.modeRegistrant?.('desk')).toBe('@schemastud/mainframe');
        expect(registry.modeRegistrant?.('window')).toBeNull();
        expect(registry.modeRegistrant?.('never')).toBeNull();
    });

    it('follows the override', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk, undefined, 'first');
        registry.register('desk', Window, undefined, 'second');

        expect(registry.modeRegistrant?.('desk')).toBe('second');
    });

    it('is read defensively: a non-string by (the method passed as a callback) names nobody', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk, undefined, 3 as unknown as string);

        expect(registry.modeRegistrant?.('desk')).toBeNull();
    });
});

describe('any string is a mode name', () => {
    const names = [
        'desk',
        'Desk',
        'DESK',
        'a/b',
        'with space',
        '',
        'os.window',
        'os.window.focus',
        'mainframe.modes',
        'mainframe.modes.desk',
        'mainframe',
        '-leading',
        'trailing.',
        '..',
        'ünïcode',
    ];

    it('registers and resolves every name as a Map did, in the same order', () => {
        const registry = createMainframeRegistry();
        const map = reference();
        const components = names.map(() => (() => null) as Mainframe);

        names.forEach((name, i) => {
            expect(() => registry.register(name, components[i]!)).not.toThrow();
            map.register(name, components[i]!);
        });

        for (const name of names) {
            expect(registry.get(name), name).toEqual(map.get(name));
        }
        expect(registry.modes()).toEqual(map.modes());
        expect(registry.all()).toEqual(map.all());
    });

    it('keeps a name that begins with the root apart from the name under it', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk);
        registry.register('mainframe.modes.desk', Window);

        expect(registry.get('desk')?.component).toBe(Desk);
        expect(registry.get('mainframe.modes.desk')?.component).toBe(Window);
        expect(registry.get('mainframe.modes')).toBeUndefined();
        expect(registry.modes()).toEqual(['desk', 'mainframe.modes.desk']);
    });

    it('answers undefined for a branch name of registered modes, and for an unregistered one', () => {
        const registry = createMainframeRegistry();
        registry.register('os.window', Window);
        registry.register('os.desk', Desk);

        expect(registry.get('os')).toBeUndefined();
        expect(registry.get('os.window.focus')).toBeUndefined();
        expect(registry.get('nope')).toBeUndefined();
        expect(registry.get('NOPE/x')).toBeUndefined();
    });

    it('compares names exactly: no case folding, no trimming', () => {
        const registry = createMainframeRegistry();
        registry.register('desk', Desk);

        expect(registry.get('Desk')).toBeUndefined();
        expect(registry.get(' desk')).toBeUndefined();
    });
});

describe('a name that is not a string', () => {
    const notStrings = [undefined, null, 5, {}] as unknown as string[];

    it.each(notStrings)('misses on every read of %j, in an empty registry and a populated one', (name) => {
        const registry = createMainframeRegistry();

        for (const populated of [false, true]) {
            if (populated) {
                registry.register('desk', Desk);
                registry.register('5', Os);
            }

            expect(registry.get(name)).toBeUndefined();
            expect(registry.modeRegistrant?.(name)).toBeNull();
            expect(registry.supersededModes?.(name)).toEqual([]);
        }
    });

    it('is registered under its string form, and the registration keeps the mode as given', () => {
        const registry = createMainframeRegistry();

        expect(() => registry.register(5 as unknown as string, Desk)).not.toThrow();
        expect(registry.get('5')).toEqual({ mode: 5, component: Desk, customSlots: [] });
        expect(registry.modes()).toEqual(['5']);
    });
});

describe('each factory call', () => {
    it('makes its own registry (the provider-scoped lifetime)', () => {
        const one = createMainframeRegistry();
        const two = createMainframeRegistry();
        one.register('desk', Desk);

        expect(two.get('desk')).toBeUndefined();
        expect(two.modes()).toEqual([]);
        expect(two.all()).toEqual([]);
        expect(one.modes()).toEqual(['desk']);
    });
});
