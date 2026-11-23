import type { ContextManifest } from './contexts';
import type { FrameTransport } from './types';

export interface FrameActionTransportDiagnostic {
    readonly code: 'frame.actions.unavailable';
    readonly actionKeys: readonly string[];
}

/** Describe declared actions that this transport cannot invoke, without changing the rendered surface. */
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
