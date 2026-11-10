// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';
import { createWidgetRegistry } from '../src/registry';
import { buildUiSchema } from '../src/ui-schema';
import type { SchemaNode } from '../src/types';

afterEach(() => {
    cleanup();
});

/** A PHP-emitted enum: values in `enum`, labels in `enumNames`, defined once in `$defs`. */
const STATUS: SchemaNode = { type: 'string', enum: ['awaiting', 'approved'], enumNames: ['Awaiting review', 'Approved'] };

/** RJSF's core theme: native <select>/<option>, so the options are readable (the shadcn default draws a Radix select). */
const CORE = {};

const optionLabels = (container: HTMLElement) =>
    [...container.querySelectorAll('option')].map((o) => o.textContent?.trim()).filter((t) => t);

/**
 * frame-foundation 44: an enum's labels reach the form. `buildUiSchema` lifts a node's `enumNames` into
 * `ui:enumNames` (the only spelling RJSF reads), on the node AFTER its local `$ref` resolves and on a nullable
 * `anyOf` branch, unless the caller's uiSchema already sets them. The wire is unchanged.
 */
describe('enum labels reach the form', () => {
    it('an enum behind a $ref renders its enumNames as the select options', () => {
        const schema: SchemaNode = {
            type: 'object',
            $defs: { Status: STATUS },
            properties: { status: { $ref: '#/$defs/Status' } },
        };

        const { container } = render(<SchemaForm schema={schema} registry={createWidgetRegistry()} formData={{}} theme={CORE} />);

        expect(optionLabels(container)).toEqual(expect.arrayContaining(['Awaiting review', 'Approved']));
        expect(optionLabels(container)).not.toContain('awaiting');
    });

    it("a caller's ui:enumNames still wins", () => {
        const schema: SchemaNode = {
            type: 'object',
            $defs: { Status: STATUS },
            properties: { status: { $ref: '#/$defs/Status' } },
        };

        const { container } = render(
            <SchemaForm
                schema={schema}
                registry={createWidgetRegistry()}
                formData={{}}
                theme={CORE}
                uiSchema={{ status: { 'ui:enumNames': ['Waiting', 'Done'] } }}
            />,
        );

        expect(optionLabels(container)).toEqual(expect.arrayContaining(['Waiting', 'Done']));
        expect(optionLabels(container)).not.toContain('Awaiting review');
    });

    it('a nullable anyOf branch carrying the enum lifts its labels too', () => {
        const schema: SchemaNode = {
            type: 'object',
            $defs: { Status: STATUS },
            properties: { status: { anyOf: [{ $ref: '#/$defs/Status' }, { type: 'null' }] } },
        };

        const ui = buildUiSchema(schema, createWidgetRegistry(), { context: 'edit' }) as Record<string, Record<string, unknown>>;

        expect(ui.status?.['ui:enumNames']).toEqual(['Awaiting review', 'Approved']);
    });

    it('enumNames of a different length than enum are not lifted', () => {
        const schema: SchemaNode = {
            type: 'object',
            properties: { status: { type: 'string', enum: ['a', 'b'], enumNames: ['Only one'] } },
        };

        const ui = buildUiSchema(schema, createWidgetRegistry(), { context: 'edit' }) as Record<string, Record<string, unknown>>;

        expect(ui.status?.['ui:enumNames']).toBeUndefined();
    });
});
