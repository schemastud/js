import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { getWidget } from '@rjsf/utils';
import { RjsfThemeContext } from '../src/theme';
import { useRjsfRegistry, widgetProps } from '../src/widget-props';

afterEach(cleanup);
const theme = {};
const schema = { type: 'boolean' } as const;
function StandaloneField() {
    const registry = useRjsfRegistry(schema);
    const props = widgetProps({ registry, schema, value: true, name: 'choice', id: 'choice', readonly: false });
    const Widget = getWidget(schema, 'select', registry.widgets);
    return <Widget {...props} />;
}
it('widgets outside a form follow the one provider through the shared registry', () => {
    const es = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-seam::messages.rjsf.yes_label': { text: 'Sí', sourceLocale: 'es' },
    } };
    const fr = { ...es, locale: 'fr', messages: {
        'schemastud-seam::messages.rjsf.yes_label': { text: 'Oui', sourceLocale: 'fr' },
    } };
    const view = (value: typeof es) => <MessageProvider value={value}><RjsfThemeContext.Provider value={theme}><StandaloneField /></RjsfThemeContext.Provider></MessageProvider>;
    const { container, rerender } = render(view(es));
    const select = container.querySelector('select');
    expect(screen.getByRole('option', { name: 'Sí' })).toBeTruthy();
    rerender(view(fr));
    expect(screen.getByRole('option', { name: 'Oui' })).toBeTruthy();
    expect(container.querySelector('select')).toBe(select);
});
