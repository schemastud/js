import type { SchemaPurpose, FrameTransport } from '@schemastud/frame';
const read: SchemaPurpose = 'read';
// @ts-expect-error Widget presentation is not a schema projection purpose.
const invalid: SchemaPurpose = 'enriched';
export function readSchema(transport: FrameTransport) {
    void invalid;
    return transport.getFormSchema('requests', 'bare', read);
}
