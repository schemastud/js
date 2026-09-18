import { Badge } from '@schemastud/ui';
import type { Row } from '../types';
import type { CardWidgetProps } from './types';

/**
 * `record-line` — frame's ONE-LINE rendering of a record whose resource binds no `list-item`
 * widget of its own. `recent-list` draws each item with it when the TARGET's root `list-item`
 * declares NO name. Measured at tower and the flagship: the Activity overview card printed
 * `5,4,3,2,1`, because `splicewire/tower`'s `CentralActivityData` carries `description` /
 * `event` / `created_at` and no `name` / `title` / `label` — an unbound root through
 * `SchemaView` falls to its scalar default, and a display-name fallback that knows only three
 * field names falls through to the id.
 *
 * Three slots, each optional, read by field-name convention off the record the server sent:
 *   text  — the first present of `title | label | name | description | summary`
 *   badge — `event`, else `status`
 *   time  — the first present of `created_at | occurred_at | updated_at`: short relative
 *           within a week (`2h ago`, `yesterday`), the locale date beyond it, and the RAW string
 *           when unparseable — never `Invalid Date`, never a dash for a populated-and-wrong value
 * The id is the text only when no text field exists: the last resort, not the default.
 *
 * A NAMED widget only. It is deliberately NOT registered as the `list-item` context default:
 * that predicate would make every participates-but-unbound root resolve a component, and
 * `listItemRendersCards` would flip tower's threads/compositions tables into card grids.
 * `recent-list` picks it by name, and only where no name was declared — a declared name the
 * registry does not know stays the honest unbound marker there, as it does everywhere else.
 */
export function RecordLine({ value }: CardWidgetProps<Row>) {
    const record = value ?? {};
    const text = firstString(record, TEXT_FIELDS) ?? String(record.id ?? '');
    const badge = firstString(record, BADGE_FIELDS);
    const time = firstString(record, TIME_FIELDS);
    const parsed = time ? new Date(time) : undefined;
    const parses = parsed !== undefined && !Number.isNaN(parsed.getTime());

    return (
        <div data-frame-record-line className="flex items-center gap-2 text-sm">
            <span data-frame-record-line-text className="min-w-0 flex-1 truncate">
                {text}
            </span>
            {badge ? (
                <Badge variant="secondary" data-frame-record-line-badge className="shrink-0 font-normal">
                    {badge}
                </Badge>
            ) : null}
            {time ? (
                <time
                    data-frame-record-line-time
                    dateTime={time}
                    title={parses ? parsed.toLocaleString() : undefined}
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                >
                    {formatRecordTime(time)}
                </time>
            ) : null}
        </div>
    );
}

const TEXT_FIELDS = ['title', 'label', 'name', 'description', 'summary'] as const;
const BADGE_FIELDS = ['event', 'status'] as const;
const TIME_FIELDS = ['created_at', 'occurred_at', 'updated_at'] as const;

/** The first field that holds a non-blank string, in the order given. */
function firstString(record: Row, fields: readonly string[]): string | undefined {
    for (const field of fields) {
        const value = record[field];
        if (typeof value === 'string' && value.trim() !== '') return value;
    }
    return undefined;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Short relative within a week, the locale date beyond it, the raw string when unparseable.
 * `now` is a parameter so a test pins it; the widget passes the wall clock.
 */
export function formatRecordTime(raw: string, now: number = Date.now()): string {
    const parsed = new Date(raw);
    const at = parsed.getTime();
    if (Number.isNaN(at)) return raw;

    const delta = at - now;
    const distance = Math.abs(delta);
    if (distance >= WEEK) return parsed.toLocaleDateString();

    const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
    if (distance < MINUTE) return relative.format(0, 'second');
    if (distance < HOUR) return relative.format(Math.trunc(delta / MINUTE), 'minute');
    if (distance < DAY) return relative.format(Math.trunc(delta / HOUR), 'hour');
    return relative.format(Math.trunc(delta / DAY), 'day');
}
