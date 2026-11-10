// @vitest-environment jsdom
import { getDefaultRegistry, type ThemeProps } from '@rjsf/core';
import { getWidget, type RJSFSchema, type Widget } from '@rjsf/utils';
import { cleanup, render } from '@testing-library/react';
import { createElement, type ComponentType } from 'react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';
import { RJSF_STOCK_NAMES, createWidgetRegistry } from '../src/registry';
import { shadcnTheme } from '../src/theme';
import { createRjsfRegistry, widgetProps } from '../src/widget-props';
import type { SchemaNode } from '../src/types';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

/**
 * frame-foundation 20 (ruling 04 slice 2): RJSF's widget contract outside a form. Seam builds RJSF `WidgetProps`
 * over a registry made by RJSF's own `Form.getRegistry`, resolving the node and building its choices as RJSF's
 * leaf fields do, so a stock widget mounts outside a form and shows what the form would.
 */
const THEMES: Array<[string, ThemeProps]> = [
    ['core', {}],
    ['shadcn', shadcnTheme],
];

function mount(Component: Widget, props: Record<string, unknown>) {
    return render(createElement(Component as ComponentType<any>, props));
}

describe('a stock widget outside a form', () => {
    it('throws on the old read bundle, and renders on the builder’s props (P4)', () => {
        const TextWidget = getDefaultRegistry().widgets.TextWidget as Widget;
        const schema: SchemaNode = { type: 'string' };
        // The shape frame's read surfaces handed a widget before the builder: no registry, no id, no callbacks.
        expect(() => mount(TextWidget, { value: 'Ada', schema, options: {}, readonly: true })).toThrow();
        cleanup();

        const registry = createRjsfRegistry({ rootSchema: { type: 'object', properties: { name: schema } }, theme: {} });
        const { container } = mount(TextWidget, widgetProps({ registry, schema, value: 'Ada', name: 'name', id: 'w-name' }));
        expect((container.querySelector('input') as HTMLInputElement).value).toBe('Ada');
    });
});

/** A sample node and value for each widget RJSF routes on a primitive node. */
const PRIMITIVE_CASES: Array<[name: string, schema: SchemaNode, value: unknown, shown: string]> = [
    ['text', { type: 'string' }, 'Ada', 'Ada'],
    ['password', { type: 'string' }, 'hunter2', 'hunter2'],
    ['email', { type: 'string', format: 'email' }, 'ada@example.test', 'ada@example.test'],
    ['uri', { type: 'string', format: 'uri' }, 'https://example.test/', 'https://example.test/'],
    ['textarea', { type: 'string' }, 'Notes', 'Notes'],
    ['hidden', { type: 'string' }, 'secret', 'secret'],
    ['date', { type: 'string', format: 'date' }, '2026-11-10', '2026-11-10'],
    ['time', { type: 'string', format: 'time' }, '10:30', '10:30'],
    ['color', { type: 'string' }, '#336699', '#336699'],
    ['select', { type: 'string', enum: ['draft', 'live'] }, 'live', 'live'],
    ['radio', { type: 'string', enum: ['draft', 'live'] }, 'live', 'live'],
    ['updown', { type: 'integer' }, 7, '7'],
    ['range', { type: 'number', minimum: 0, maximum: 10 }, 4, '4'],
    ['checkbox', { type: 'boolean', title: 'Active' }, true, 'true'],
];
// RJSF routes these only on arrays or files; outside a form they are excluded by name (ruling 04 §4).
const EXCLUDED = ['checkboxes', 'files', 'file', 'data-url', 'alt-date', 'alt-datetime', 'datetime', 'date-time'];

/** Every value a rendered widget shows: input values, selected or checked controls, and text. */
function shownValues(container: HTMLElement): string[] {
    const shown: string[] = [];
    container.querySelectorAll('input, textarea, select').forEach((el) => {
        const field = el as HTMLInputElement;
        if (field.type === 'radio' || field.type === 'checkbox') {
            if (field.checked) shown.push(field.value === 'on' ? 'true' : field.value);
        } else {
            shown.push(field.value);
        }
    });
    // Radix controls carry their state in aria-checked; a checked checkbox shows `true`, a radio its value.
    container.querySelectorAll('[role="checkbox"][aria-checked="true"]').forEach(() => shown.push('true'));
    container.querySelectorAll('[role="radio"][aria-checked="true"]').forEach((el) => {
        shown.push((el as HTMLElement).getAttribute('value') ?? '');
    });
    shown.push(container.textContent ?? '');
    return shown;
}

/** Whether every control is locked against input. */
function locked(container: HTMLElement): boolean {
    const controls = [...container.querySelectorAll('input:not([type="hidden"]), textarea, select, button, [role="radio"], [role="checkbox"], [role="combobox"]')];
    return controls.every(
        (el) =>
            (el as HTMLInputElement).disabled ||
            (el as HTMLInputElement).readOnly ||
            el.getAttribute('aria-disabled') === 'true' ||
            el.hasAttribute('data-disabled'),
    );
}

describe.each(THEMES)('every primitive widget on the %s theme', (_theme, theme) => {
    it.each(PRIMITIVE_CASES)('%s renders, shows its value and is locked when readonly', (name, schema, value, shown) => {
        const registry = createRjsfRegistry({ rootSchema: { type: 'object', properties: { field: schema } }, theme });
        const Component = getWidget(schema as RJSFSchema, name, registry.widgets) as Widget;
        const { container } = mount(Component, widgetProps({ registry, schema, value, name: 'field', id: `w-${name}` }));

        expect(shownValues(container).some((v) => v === shown || v.includes(shown))).toBe(true);
        expect(locked(container)).toBe(true);
    });

    it('covers every stock name RJSF routes on a primitive node, apart from the named exclusions', () => {
        const covered = new Set(PRIMITIVE_CASES.map(([name]) => name));
        const missing = RJSF_STOCK_NAMES.filter((name) => !covered.has(name) && !EXCLUDED.includes(name) && !['hostname', 'ipv4', 'ipv6'].includes(name));
        expect(missing).toEqual([]);
    });
});

/** What the form draws for one property: the choices offered and the one shown as selected. */
function formChoices(root: SchemaNode, widget: string, value: unknown) {
    const { container } = render(
        <SchemaForm schema={root} theme={{}} uiSchema={{ field: { 'ui:widget': widget } }} formData={{ field: value }} />,
    );
    const result = choicesIn(container);
    cleanup();
    return result;
}

function choicesIn(container: HTMLElement) {
    const radios = [...container.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    if (radios.length > 0) {
        return { count: radios.length, selected: radios.filter((r) => r.checked).map((r) => r.parentElement?.textContent?.trim()) };
    }
    const options = [...container.querySelectorAll('select option')] as HTMLOptionElement[];
    const real = options.filter((o) => o.value !== '');
    return { count: real.length, selected: real.filter((o) => o.selected).map((o) => o.textContent?.trim()) };
}

describe('the schema shapes that discriminate: choices and selection match SchemaForm (core theme)', () => {
    const cases: Array<[label: string, root: SchemaNode, widget: string, value: unknown]> = [
        ['radio on a boolean with no enum', { type: 'object', properties: { field: { type: 'boolean' } } }, 'radio', false],
        ['select on a boolean with no enum', { type: 'object', properties: { field: { type: 'boolean' } } }, 'select', true],
        ['radio on a nullable boolean', { type: 'object', properties: { field: { type: ['boolean', 'null'] } } }, 'radio', true],
        ['select on a nullable boolean', { type: 'object', properties: { field: { type: ['boolean', 'null'] } } }, 'select', false],
        [
            'radio on a string enum behind a local $ref',
            { type: 'object', $defs: { tier: { type: 'string', enum: ['free', 'team', 'paid'] } }, properties: { field: { $ref: '#/$defs/tier' } } },
            'radio',
            'team',
        ],
        [
            'select on a string enum behind a local $ref',
            { type: 'object', $defs: { tier: { type: 'string', enum: ['free', 'team', 'paid'] } }, properties: { field: { $ref: '#/$defs/tier' } } },
            'select',
            'paid',
        ],
        ['select on an integer enum', { type: 'object', properties: { field: { type: 'integer', enum: [1, 2, 3, 5] } } }, 'select', 3],
    ];

    it.each(cases)('%s', (_label, root, widget, value) => {
        const expected = formChoices(root, widget, value);

        const registry = createRjsfRegistry({ rootSchema: root, theme: {} });
        const node = (root.properties as Record<string, SchemaNode>).field;
        const props = widgetProps({ registry, schema: node, value, name: 'field', id: 'w-field' });
        const Component = getWidget(props.schema, widget, registry.widgets) as Widget;
        const { container } = mount(Component, props);

        expect(expected.count).toBeGreaterThan(0);
        expect(choicesIn(container)).toEqual(expected);
    });
});

describe('a schema’s enumNames reach the choices outside a form (ticket 44’s rule, applied by the builder)', () => {
    const root: SchemaNode = {
        type: 'object',
        $defs: { kind: { type: 'string', enum: ['demo', 'clean'], enumNames: ['Demo with history', 'Clean start'] } },
        properties: { field: { $ref: '#/$defs/kind' } },
    };
    const labels = (uiSchema?: Record<string, unknown>) => {
        const registry = createRjsfRegistry({ rootSchema: root, theme: {} });
        const props = widgetProps({ registry, schema: (root.properties as Record<string, SchemaNode>).field, value: 'clean', name: 'field', id: 'w-kind', uiSchema });
        return (props.options.enumOptions as Array<{ label: string }>).map((o) => o.label);
    };

    it('a string enum behind a local $ref shows its enumNames', () => {
        expect(labels()).toEqual(['Demo with history', 'Clean start']);
    });

    it('a caller’s ui:enumNames still wins', () => {
        expect(labels({ 'ui:enumNames': ['Demo', 'Clean'] })).toEqual(['Demo', 'Clean']);
    });
});

describe('the stock names', () => {
    // `@rjsf/utils` getWidget's map: every node type each of the 25 names is listed under (40 pairs).
    const PAIRS: Record<string, string[]> = {
        boolean: ['checkbox', 'radio', 'select', 'hidden'],
        string: ['text', 'password', 'email', 'hostname', 'ipv4', 'ipv6', 'uri', 'data-url', 'radio', 'select', 'textarea', 'hidden', 'date', 'datetime', 'date-time', 'alt-date', 'alt-datetime', 'time', 'color', 'file'],
        number: ['text', 'select', 'updown', 'range', 'radio', 'hidden'],
        integer: ['text', 'select', 'updown', 'range', 'radio', 'hidden'],
        array: ['select', 'checkboxes', 'files', 'hidden'],
    };

    /**
     * RJSF exports no catalogue of its stock names, so the installed `getWidget` module's `widgetMap` is read as
     * source: a 4-space `type: {` line opens a type, an 8-space `name:` / `'name':` line adds a name to it. A name
     * RJSF adds or drops changes this map, and the comparisons below fail.
     */
    function installedStockPairs(): Record<string, string[]> {
        const utilsDir = path.dirname(createRequire(import.meta.url).resolve('@rjsf/utils')); // …/@rjsf/utils/dist
        const src = readFileSync(path.join(utilsDir, '..', 'lib', 'getWidget.js'), 'utf8'); // the module `import` loads
        const start = src.indexOf('const widgetMap = {');
        const block = start < 0 ? '' : src.slice(start, src.indexOf('\n};', start));
        const pairs: Record<string, string[]> = {};
        let current: string | undefined;
        for (const line of block.split('\n')) {
            const type = /^ {4}(\w+): \{$/.exec(line);
            if (type) {
                current = type[1];
                pairs[current] = [];
                continue;
            }
            const name = /^ {8}'?([\w-]+)'?:/.exec(line);
            if (name && current) pairs[current].push(name[1]);
        }
        return pairs;
    }

    it('the installed RJSF catalogue is exactly seam’s: a name RJSF adds or drops fails here', () => {
        const installed = installedStockPairs();
        expect(Object.keys(installed).length).toBeGreaterThan(0); // a reformat fails, never passes empty
        expect(installed).toEqual(PAIRS); // an added or dropped pair fails
        expect([...new Set(Object.values(installed).flat())].sort()).toEqual([...RJSF_STOCK_NAMES].sort());
    });

    it('each of RJSF’s 25 names resolves on a fresh seam registry', () => {
        const registry = createWidgetRegistry();
        expect(RJSF_STOCK_NAMES).toHaveLength(25);
        expect(new Set(Object.values(PAIRS).flat())).toEqual(new Set(RJSF_STOCK_NAMES));
        for (const name of RJSF_STOCK_NAMES) expect(registry.resolveEntry({ 'x-widget': name })).toMatchObject({ widget: name, bound: true });
    });

    it.each(THEMES)('each turns into a component through getWidget for every node type RJSF lists it under (%s)', (_theme, theme) => {
        const registry = createRjsfRegistry({ rootSchema: { type: 'object' }, theme });
        const pairs = Object.entries(PAIRS).flatMap(([type, names]) => names.map((name) => [type, name] as const));
        expect(pairs).toHaveLength(40);
        for (const [type, name] of pairs) {
            const schema = (type === 'array' ? { type, items: { type: 'string', enum: ['a'] }, uniqueItems: true } : { type }) as RJSFSchema;
            expect(() => getWidget(schema, name, registry.widgets), `${type} ${name}`).not.toThrow();
        }
    });
});
