import type { ContextManifest } from './contexts';
import type { FrameTransport } from './types';

export interface FrameActionTransportDiagnostic {
    readonly code: 'frame.actions.unavailable';
    readonly actionKeys: readonly string[];
}

/** Null means no declared actions need invoking or the transport can invoke them; it does not guarantee every action button renders, since input actions also need getActionSchema. */
export function getFrameActionTransportDiagnostic(
    transport: Pick<FrameTransport, 'invoke'>,
    manifest: Pick<ContextManifest, 'actions'>,
): FrameActionTransportDiagnostic | null {
    const actions = manifest.actions ?? [];
    if (typeof transport.invoke === 'function' || actions.length === 0) return null;

    return {
        code: 'frame.actions.unavailable',
        actionKeys: actions.map(({ key }) => key),
    };
}
