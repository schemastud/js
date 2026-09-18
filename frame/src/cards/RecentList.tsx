import { Card, CardContent, CardHeader } from '@schemastud/ui';
import type { ComponentType } from 'react';
import type { WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from '../context';
import { listItemRendersCards } from '../listItemRendersCards';
import { isWidgetComponent } from '../resolveWidgetFor';
import { SchemaView, UnboundWidget, widgetMountProps } from '../SchemaView';
import { CardHeading, EmptyState, ROOT_NODE, ViewAllLink } from './chrome';
import { RecordLine } from './RecordLine';
import type { CardWidgetProps, SummaryPayload } from './types';

/**
 * A "recent N" overview for free: `overview.items` (the top-N records the summary provider
 * answered) rendered through the TARGET resource's own `list-item` binding — the activity
 * feed costs no second list renderer. The target is `row.resource` on a dashboard, else the
 * payload's own `key`; its manifest comes from the injection's `manifestFor`.
 *
 * "How does the target draw one of its rows?" has three answers, read off its root `list-item`
 * entry, and they are the same three the list shell's cards gate and `dashboard-card` give:
 *
 *  1. BOUND — the entry resolves a component (a declared name the registry knows, or a host
 *     `list-item` default). {@link listItemRendersCards} is that question, asked once; the
 *     item goes through `SchemaView`, the resource's own rendering.
 *  2. DECLARED, UNRESOLVED — the entry names a widget nothing can draw: the honest
 *     `UnboundWidget` marker in place of the list. Never a plausible default dressing a typo.
 *  3. NO NAME — no manifest reachable, no entry, no participation, or participation with no
 *     name: frame's `record-line` default, one line per item. Resolved by NAME through the
 *     registry so a host that registers a later `record-line` replaces it the ordinary way.
 *
 * Case 3 is the measured defect. An unbound root through `SchemaView` falls to its scalar
 * default (`JSON.stringify(record)`), and the display-name fallback that stood here before
 * knew only `name/title/label` — `CentralActivityData` keeps its text in `description`, so
 * the Activity card at tower and the flagship printed `5,4,3,2,1`.
 */
export function RecentList({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const { manifestFor, registry } = useFrameInjection();
    const resource = row?.resource ?? value?.key;
    const items = value?.overview?.items ?? [];
    const label = value?.label ?? row?.label ?? resource ?? '';
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
    const target = resource ? manifestFor?.(resource) : undefined;
    const entry = target?.byNode['']?.['list-item'];
    const bound = target ? listItemRendersCards(target, ROOT_NODE, registry) : false;
    // A participating entry that NAMED a widget and still did not bind: case 2.
    const misdeclared = !bound && entry?.participates ? entry.widget : undefined;
    const line = recordLineFor(registry);

    return (
        <Card data-frame-card="recent-list">
            <CardHeader className="p-4 pb-2">
                <CardHeading label={label} href={row?.href} Icon={Icon} options={options} />
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
                {items.length === 0 ? (
                    <EmptyState>Nothing recent.</EmptyState>
                ) : misdeclared ? (
                    <UnboundWidget label={label} widget={misdeclared} kind="unbound-list-item" />
                ) : (
                    <ol data-frame-recent-items className="divide-y rounded-md border">
                        {items.map((item, i) => (
                            <li key={(item.id as string) ?? i} className="px-3 py-2 text-sm">
                                {bound && target ? (
                                    <SchemaView
                                        schema={ROOT_NODE}
                                        record={item}
                                        manifest={target}
                                        context="list-item"
                                        registry={registry}
                                    />
                                ) : (
                                    <line.Line {...widgetMountProps(item, ROOT_NODE, line.config)} />
                                )}
                            </li>
                        ))}
                    </ol>
                )}
                <ViewAllLink href={row?.href} options={options} />
            </CardContent>
        </Card>
    );
}

/**
 * Frame's `record-line` — or whatever a host registered later on that name — with the
 * registry config it carries. The bare component when the card set was never registered.
 */
function recordLineFor(registry: WidgetRegistry): { Line: ComponentType<any>; config?: Record<string, unknown> } {
    const { widget, config } = registry.resolveEntry({ 'x-widget': 'record-line' });
    return isWidgetComponent(widget) ? { Line: widget, config } : { Line: RecordLine };
}
