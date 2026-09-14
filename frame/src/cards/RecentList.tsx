import type { SchemaNode } from '@schemastud/seam';
import { Card, CardContent, CardHeader, CardTitle } from '@schemastud/ui';
import { useFrameInjection } from '../context';
import { SchemaView } from '../SchemaView';
import { resolveWidgetFor } from '../resolveWidgetFor';
import type { ContextManifest } from '../contexts';
import type { Row } from '../types';
import type { CardWidgetProps, SummaryPayload } from './types';

const ROOT_NODE: SchemaNode = { type: 'object' };

/**
 * A "recent N" overview for free: `overview.items` (the top-N records the summary provider
 * answered) rendered through the TARGET resource's own `list-item` binding — the activity
 * feed costs no second list renderer. The target is `row.resource` on a dashboard, else the
 * payload's own `key`; its manifest comes from the injection's `manifestFor`.
 *
 * When the target binds no `list-item` component (no manifest reachable, no participation,
 * or a name the registry does not know) each item falls to its display name rather than
 * `SchemaView`'s scalar default, which would be `JSON.stringify(record)` — the one output
 * a dashboard must never show for a real record.
 */
export function RecentList({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const { manifestFor, registry } = useFrameInjection();
    const resource = row?.resource ?? value?.key;
    const items = value?.overview?.items ?? [];
    const label = value?.label ?? row?.label ?? resource ?? '';
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
    const target = resource ? manifestFor?.(resource) : undefined;
    const bound = target ? bindsListItem(target, registry) : false;

    return (
        <Card data-frame-card="recent-list">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
                {items.length === 0 ? (
                    <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                        Nothing recent.
                    </div>
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
                {row?.href ? (
                    <a
                        href={row.href}
                        data-frame-card-link
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        View all →
                    </a>
                ) : null}
            </CardContent>
        </Card>
    );
}

/** Does this manifest's root `list-item` entry resolve a COMPONENT through the registry? */
function bindsListItem(manifest: ContextManifest, registry: ReturnType<typeof useFrameInjection>['registry']): boolean {
    const cm = manifest.byNode['']?.['list-item'];
    if (!cm?.participates) return false;
    const { widget } = resolveWidgetFor(ROOT_NODE, 'list-item', cm, undefined, registry);
    return widget !== undefined && typeof widget !== 'string';
}

/** `name` / `title` / `label` / `id` — the same order frame's row-actions confirm uses. */
function recordName(record: Row): string {
    for (const field of ['name', 'title', 'label'] as const) {
        const value = record[field];
        if (typeof value === 'string' && value !== '') return value;
    }
    return String(record.id ?? '');
}
