// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFormIntentBus, widgetFormContext } from '../src/intent-bus';
import { createWidgetRegistry } from '../src/registry';
import { SchemaForm } from '../src/SchemaForm';
import type { SchemaNode } from '../src/types';

afterEach(() => {
    cleanup();
});

/**
 * Guards the enrich-widget wiring: a COMPONENT widget resolved through the predicate
 * registry (x-stud-widget) must be able to reach the host formContext — with the
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
        registry.registerWidget(
            (s: SchemaNode) => s['x-stud-widget'] === 'probe',
            ProbeWidget as never,
        );

        const schema: SchemaNode = {
            type: 'object',
            properties: {
                interpretation: { type: 'string', 'x-stud-widget': 'probe' },
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
