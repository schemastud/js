/* eslint-disable */
// =============================================================================
// story-fixtures — the shared fixture schemas for the @schemastud/seam catalog
// (component-seams map, ticket 17). NOT part of the shipped package: tsup builds
// only the `index.ts` graph, so this file (imported solely by *.stories.tsx) never
// enters `dist`. It mirrors frame's `story-harness.tsx` (ticket 15): the durable
// fixtures a catalog needs, kept out of the package surface.
//
// The seam's headline surface is `SchemaForm` — an RJSF (shadcn theme) form driven
// by a JSON schema. Per the rushing-prototype convention, a form is the REAL
// `SchemaForm` off a fixture schema; these fixtures are those schemas. They exercise
// representative field kinds (string / email / number / boolean / enum / date /
// grouped object / nested array) and validation constraints (required / minLength /
// format / minimum) so a story can drive the seam's error/validation `states` axis.
// =============================================================================
import type { SchemaNode } from './types';

/**
 * The representative field-kind schema — one property per RJSF field kind the seam
 * renders, so the catalog shows the full widget vocabulary in one form.
 */
export const FIELD_KINDS_SCHEMA: SchemaNode = {
    type: 'object',
    title: 'Member profile',
    description: 'A representative schema exercising the seam’s field-kind vocabulary.',
    required: ['name', 'email'],
    properties: {
        name: { type: 'string', title: 'Name', minLength: 2 },
        email: { type: 'string', title: 'Email', format: 'email' },
        bio: { type: 'string', title: 'Bio', description: 'A short description.' },
        age: { type: 'number', title: 'Age', minimum: 0, maximum: 120 },
        active: { type: 'boolean', title: 'Active' },
        role: { type: 'string', title: 'Role', enum: ['owner', 'admin', 'member'] },
        joinedAt: { type: 'string', title: 'Joined at', format: 'date' },
        tags: {
            type: 'array',
            title: 'Tags',
            items: { type: 'string' },
        },
    },
} as SchemaNode;

/** A minimal valid value for {@link FIELD_KINDS_SCHEMA} (the "populated" state). */
export const FIELD_KINDS_VALUE = {
    name: 'Ada Lovelace',
    email: 'ada@analytical.engine',
    bio: 'Wrote the first algorithm intended for a machine.',
    age: 36,
    active: true,
    role: 'owner',
    joinedAt: '1843-10-01',
    tags: ['founder', 'mathematician'],
};

/**
 * The grouped schema — every property carries an `x-group`, so it drives the
 * `GroupedObjectFieldTemplate` (wired into SchemaForm) into titled sections.
 * Cataloguing the grouped template IS a SchemaForm story: the template is not a
 * standalone surface, it is the object renderer SchemaForm installs.
 */
export const GROUPED_SCHEMA: SchemaNode = {
    type: 'object',
    title: 'Connector settings',
    required: ['name', 'endpoint'],
    properties: {
        name: { type: 'string', title: 'Name', 'x-group': 'Basics' } as SchemaNode,
        description: { type: 'string', title: 'Description', 'x-group': 'Basics' } as SchemaNode,
        endpoint: { type: 'string', title: 'Endpoint', format: 'uri', 'x-group': 'Retrieval' } as SchemaNode,
        timeoutMs: { type: 'number', title: 'Timeout (ms)', minimum: 0, 'x-group': 'Retrieval' } as SchemaNode,
        retries: { type: 'number', title: 'Retries', minimum: 0, 'x-group': 'Retrieval' } as SchemaNode,
        enabled: { type: 'boolean', title: 'Enabled', 'x-group': 'Targets' } as SchemaNode,
    },
} as SchemaNode;

/**
 * A schema whose two custom widgets opt in via `x-widget`, so a SchemaForm story can
 * catalog the seam's own widgets (`button-group`, `star-rating`) resolving through the
 * default registry inside a real form (not just in isolation).
 */
export const CUSTOM_WIDGET_SCHEMA: SchemaNode = {
    type: 'object',
    title: 'Feedback',
    properties: {
        priority: {
            type: 'string',
            title: 'Priority',
            enum: ['low', 'normal', 'high'],
            'x-widget': 'button-group',
        } as SchemaNode,
        rating: {
            type: 'number',
            title: 'Rating',
            maximum: 5,
            'x-widget': 'star-rating',
        } as SchemaNode,
    },
} as SchemaNode;

/** The custom-widget schema's populated value. */
export const CUSTOM_WIDGET_VALUE = { priority: 'high', rating: 4 };
