import { Card, CardContent, CardHeader } from '@schemastud/ui';
import { useFrameInjection } from '../context';
import { listItemRendersCards } from '../listItemRendersCards';
import { SchemaView } from '../SchemaView';
import { CardHeading, EmptyState, ROOT_NODE, ViewAllLink } from './chrome';
import type { Row } from '../types';
import type { CardWidgetProps, SummaryPayload } from './types';

/**
 * A "recent N" overview for free: `overview.items` (the top-N records the summary provider
 * answered) rendered through the TARGET resource's own `list-item` binding — the activity
 * feed costs no second list renderer. The target is `row.resource` on a dashboard, else the
 * payload's own `key`; its manifest comes from the injection's `manifestFor`.
 *
 * "Does the target bind a list-item component?" is the SAME question the list shell's cards
 * gate asks, so it is the same function: {@link listItemRendersCards}. When the answer is no
 * (no manifest reachable, no participation, or a name the registry does not know) each item
 * falls to its display name rather than `SchemaView`'s scalar default, which would be
 * `JSON.stringify(record)` — the one output a dashboard must never show for a real record.
 */
export function RecentList({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const { manifestFor, registry } = useFrameInjection();
    const resource = row?.resource ?? value?.key;
    const items = value?.overview?.items ?? [];
    const label = value?.label ?? row?.label ?? resource ?? '';
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
    const target = resource ? manifestFor?.(resource) : undefined;
    const bound = target ? listItemRendersCards(target, ROOT_NODE, registry) : false;

    return (
        <Card data-frame-card="recent-list">
            <CardHeader className="p-4 pb-2">
                <CardHeading label={label} href={row?.href} Icon={Icon} options={options} />
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
                {items.length === 0 ? (
                    <EmptyState>Nothing recent.</EmptyState>
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
                                    <span data-frame-recent-fallback>{recordName(item)}</span>
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

/** `name` / `title` / `label` / `id` — the same order frame's row-actions confirm uses. */
function recordName(record: Row): string {
    for (const field of ['name', 'title', 'label'] as const) {
        const value = record[field];
        if (typeof value === 'string' && value !== '') return value;
    }
    return String(record.id ?? '');
}
