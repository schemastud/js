// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFormIntentBus, widgetFormContext } from '../src/intent-bus';
import { createWidgetRegistry } from '../src/registry';
import { SchemaForm } from '../src/SchemaForm';
import { buildUiSchema } from '../src/ui-schema';
import type { SchemaNode } from '../src/types';

afterEach(() => {
    cleanup();
});

/**
 * Guards the enrich-widget wiring: a COMPONENT widget resolved through the predicate
 * registry (by its `x-widget` name) must be able to reach the host formContext — with the
 * intentBus on it — that the frame rides for its enrich affordance.
 *
 * RJSF v6 dropped the `formContext` widget prop and exposes it only via
 * `props.registry.formContext`; `widgetFormContext()` insulates host widgets from
 * that. Without the helper the affordance silently dies (empty formContext).
 */
describe('formContext delivery to a component widget', () => {
    it('reaches intentBus through widgetFormContext() (RJSF v6: it lives on registry.formContext)', () => {
        const seen: Record<string, unknown> = {};
        const bus = createFormIntentBus();

        function ProbeWidget(props: Record<string, unknown>) {
            const ctx = widgetFormContext<{ intentBus?: unknown }>(props);
            seen.keys = Object.keys(ctx);
            seen.hasBus = ctx.intentBus === bus;
            // The naive `props.formContext` path is what broke under v6.
            seen.rawPropKeys = Object.keys(
                (props.formContext as Record<string, unknown> | undefined) ?? {},
            );
            return <div data-probe="" />;
        }

        const registry = createWidgetRegistry();
        registry.registerWidget('probe', ProbeWidget as never);

        const schema: SchemaNode = {
            type: 'object',
            properties: {
                interpretation: { type: 'string', 'x-widget': 'probe' },
            },
        };

        render(
            <SchemaForm
                schema={schema}
                registry={registry}
                formData={{ interpretation: 'hi' }}
                formContext={{ intentBus: bus, readOnly: false }}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        expect(seen.keys).toContain('intentBus');
        expect(seen.hasBus).toBe(true);
        // Document the v6 break the helper works around: the raw prop is empty.
        expect(seen.rawPropKeys).toEqual([]);
    });
});

/**
 * frame-foundation 24 (interface decision, edit C): the form walks in the `edit` context, and the plain-data mode
 * keeps the root's declared name while every node below it is inferred.
 */
describe('buildUiSchema: the edit scope and the kept root', () => {
    const RootProof = () => null;
    const ScopedProof = () => null;
    const ListProof = () => null;
    const registry = createWidgetRegistry();
    registry.registerWidget('root-proof', RootProof as never);
    registry.registerWidget('scoped-proof', ScopedProof as never, undefined, { contexts: ['edit'] });
    registry.registerWidget('list-proof', ListProof as never, undefined, { contexts: ['list-column'] });
    const schema: SchemaNode = {
        type: 'object',
        'x-widget': 'root-proof',
        properties: {
            rating: { type: 'string', 'x-widget': 'scoped-proof' },
            badge: { type: 'string', 'x-widget': 'list-proof' },
        },
    };
    const rootMount = (ui: Record<string, unknown>) => ui['ui:field'] ?? ui['ui:widget'];
    const child = (ui: Record<string, unknown>, key: string) => (ui[key] as Record<string, unknown> | undefined)?.['ui:widget'];

    it('enriched: the child resolves its edit-scoped name, and a name scoped to another context draws the unbound marker', () => {
        const ui = buildUiSchema(schema, registry, { context: 'edit' });
        expect(rootMount(ui)).toBe(RootProof);
        expect(child(ui, 'rating')).toBe(ScopedProof);
        // Not bound in `edit`: the marker replaces the control (ticket 42), never the inferred text box.
        expect((child(ui, 'badge') as { displayName?: string } | undefined)?.displayName).toBe('UnboundControl(list-proof)');
    });

    it('plainData: the root still resolves; the child does not', () => {
        const ui = buildUiSchema(schema, registry, { context: 'edit', plainData: true });
        expect(rootMount(ui)).toBe(RootProof);
        expect(child(ui, 'rating')).toBeUndefined();
        // `bare` drops the name below the root before resolution, so no marker either.
        expect(child(ui, 'badge')).toBeUndefined();
    });
});
