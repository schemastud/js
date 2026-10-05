/**
 * The one rule for a rendered label (app-walkthrough APP-09, APP-21): a declared `title` wins. With none, a PROPERTY
 * label is the humanized property name (`parent_tenant_id` → "Parent tenant"), and anything else renders nothing.
 * Never a class short name, a backing value or a raw key. Hosts that set laravel-data-schemas'
 * `identifier_titles => false` stop emitting short-name titles, so this is where a missing title lands.
 */
export function displayLabel(
    schema: { title?: unknown } | null | undefined,
    key?: string | null,
    options: { property?: boolean } = {},
): string {
    const title = schema?.title;
    if (typeof title === 'string' && title.trim() !== '') return title;
    return options.property && key ? humanizeKey(key) : '';
}

/** `parent_tenant_id` → "Parent tenant", `billingPeriodEnd` → "Billing period end". A trailing id is dropped. */
export function humanizeKey(key: string): string {
    const words = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[\s_\-.]+/)
        .filter(Boolean)
        .map((word) => word.toLowerCase());
    if (words.length > 1 && words[words.length - 1] === 'id') words.pop();
    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
