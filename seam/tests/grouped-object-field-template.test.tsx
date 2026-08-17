import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { withTheme } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { defaultValidator } from '../src/validator';
import { GroupedObjectFieldTemplate } from '../src/GroupedObjectFieldTemplate';

afterEach(() => {
    cleanup();
});

const ThemedForm = withTheme(ShadcnTheme);

function renderForm(schema: Record<string, unknown>, formData: Record<string, unknown> = {}) {
    return render(
        <ThemedForm
            schema={schema as never}
            formData={formData}
            validator={defaultValidator}
            templates={{ ObjectFieldTemplate: GroupedObjectFieldTemplate }}
            uiSchema={{ 'ui:submitButtonOptions': { norender: true } }}
        >
            <div />
        </ThemedForm>,
    );
}

describe('GroupedObjectFieldTemplate — x-tab', () => {
    it('renders stacked sections (no tab strip) when no property declares x-tab', () => {
        renderForm({
            type: 'object',
            properties: {
                a: { type: 'string', 'x-group': 'Basics' },
                b: { type: 'string', 'x-group': 'Retrieval' },
            },
        });
        expect(screen.queryByRole('tablist')).toBeNull();
        expect(screen.getByText('Basics')).not.toBeNull();
        expect(screen.getByText('Retrieval')).not.toBeNull();
    });

    it("groups x-group sections into x-tab tabs, showing only the active tab's groups", () => {
        renderForm({
            type: 'object',
            properties: {
                className: { type: 'string', 'x-group': 'Classes', 'x-tab': 'Style' },
                style: { type: 'string', 'x-group': 'Style', 'x-tab': 'Style' },
                gate: { type: 'string', 'x-group': 'Access', 'x-tab': 'Advanced' },
                attrs: { type: 'string', 'x-group': 'Attributes', 'x-tab': 'Advanced' },
            },
        });

        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((t) => t.textContent)).toEqual(['Style', 'Advanced']);
        expect(tabs[0].getAttribute('aria-selected')).toBe('true');

        // Style tab active by default — its fields render, Advanced's panel is hidden.
        const panels = screen.getAllByRole('tabpanel', { hidden: true });
        expect(document.getElementById('root_className')).not.toBeNull();
        expect(document.getElementById('root_gate')).not.toBeNull();
        expect(panels[0].hasAttribute('hidden')).toBe(false);
        expect(panels[1].hasAttribute('hidden')).toBe(true);

        fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
        expect(tabs[1].getAttribute('aria-selected')).toBe('true');
        expect(panels[0].hasAttribute('hidden')).toBe(true);
        expect(panels[1].hasAttribute('hidden')).toBe(false);
    });

    it('renders groups with no x-tab above the tab strip, always visible', () => {
        renderForm({
            type: 'object',
            properties: {
                untabbed: { type: 'string', 'x-group': 'General' },
                tabbed: { type: 'string', 'x-group': 'Style', 'x-tab': 'Style' },
            },
        });
        expect(screen.getByText('General').closest('[role="tabpanel"]')).toBeNull();
        expect(screen.getAllByRole('tab')).toHaveLength(1);
    });
});
