// Build-time only: imported by /vocabulary, never the app root. Each entry is tied to an executable reader export;
// deleting that export breaks typecheck. Key spelling follows laravel-frame's EmittedWireKeys groups.
import type { FrameReaders } from './vocabulary';
import { createHttpTransport } from './httpTransport';
import { createFrameKit } from './kit';
import { buildRealmRoutes } from './routes';
import { createMountDispatcher } from './mountDispatcher';
import { resolveWidgetFor } from './resolveWidgetFor';
import { resolveColumns } from './resolveColumns';
import { ListShell } from './ListShell';
import { SchemaView } from './SchemaView';
import { resolveActions, actionUrl } from './actions';
import { createResourceTransport } from './resourceTransport';
import { ActionButton } from './ResourceActions';
import { useListShellOf } from './useListShell';
import { readResourceRefConfig } from './ResourceRefWidget';

const readers = {
    'manifest:resources': createHttpTransport,
    'manifest:contexts': createFrameKit,
    'manifest:routeContext[].routeName': buildRealmRoutes,
    'manifest:routeContext[].path': buildRealmRoutes,
    'manifest:routeContext[].shell': buildRealmRoutes,
    'manifest:routeContext[].guard': buildRealmRoutes,
    'manifest:routeContext[].mounts': createMountDispatcher,
    'manifest:routeContext[].widget': createMountDispatcher,
    'manifest:routeContext[].resource': createMountDispatcher,
    'context-block:byNode': SchemaView,
    'context-block:createAffordance': useListShellOf,
    'context-block:singularLabel': ListShell,
    'context-block:can': createFrameKit,
    'context-block:can.create': createFrameKit,
    'context-block:can.update': createFrameKit,
    'context-block:can.delete': createFrameKit,
    'context-block:can.actions': resolveActions,
    'context-block:actions': resolveActions,
    'context-block:actions[].key': resolveActions,
    'context-block:actions[].label': ActionButton,
    'context-block:actions[].scope': resolveActions,
    'context-block:actions[].method': createResourceTransport,
    'context-block:actions[].url': actionUrl,
    'context-block:actions[].input': ActionButton,
    'context-block:actions[].result': ActionButton,
    'context-block:actions[].destructive': ActionButton,
    'context-block:collections': useListShellOf,
    'context-block:collections[].stem': useListShellOf,
    'context-block:collections[].label': ListShell,
    'context-block:entry.participates': resolveWidgetFor,
    'context-block:entry.widget': resolveWidgetFor,
    'context-block:entry.options': resolveWidgetFor,
    'context-block:entry.sort': resolveColumns,
    'context-block:entry.label': resolveColumns,
    'context-block:entry.inheritsBinding': resolveWidgetFor,
    'context-block:entry.heavyweight': SchemaView,
    'schema-keywords:x-widget': resolveWidgetFor,
    'schema-keywords:x-widget-options': resolveWidgetFor,
    'schema-keywords:x-stud-resource-ref': readResourceRefConfig,
} satisfies FrameReaders;

export default readers;

export const FRAME_READS: readonly string[] = Object.keys(readers).sort();
