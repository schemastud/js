/**
 * @schemastud/frame-remote — production-shape isolation substrate for rendering
 * untrusted remote components.
 *
 * Trust boundary = execution-context isolation (QuickJS-in-WASM realm, separate
 * origin), NOT API-guarding. The guest runs in a VM with no ambient browser
 * globals; it emits a real @remote-dom/core mutation stream; the trusted host
 * paints from a host-owned allowlist.
 */
export { RemoteComponentBridge, type RemoteComponentBridgeOptions } from './bridge.js';
export { SANDBOX_ORIGIN, DEFAULT_LIMITS, type VmLimits } from './config.js';
export {
    eventRef,
    isEventRef,
    type RemoteEventListenerRef,
    type RemoteMutationRecord,
    type WorkerToHostMessage,
    type HostToWorkerMessage,
    type GuestFailureKind,
} from './protocol.js';

// Guest + host subpaths are also exported directly (see ./guest, ./host).
export { GuestVm, GuestFailure, type GuestVmOptions, GUEST_RUNTIME_SOURCE } from './guest/index.js';
export {
    HostReceiver,
    type HostReceiverOptions,
    DEFAULT_ALLOWLIST,
    type HostComponent,
    type RenderContext,
    createBlockVocabulary,
    registerBlock,
    DEFAULT_BLOCK_VOCABULARY,
    type BlockVocabulary,
    BLOCK_TYPES,
    type BlockType,
    type BlockProps,
    type HandlerProp,
    RemoteSurface,
    renderRemoteTree,
    type RemoteSurfaceProps,
    type RenderTreeOptions,
    type RemoteReceiverElement,
    type RemoteReceiverRoot,
    type RemoteReceiverNode,
    VOCABULARY_VERSION,
    VOCABULARY_MAJOR,
    type TrustTier,
    type CapabilityName,
    CAPABILITY_NAMES,
    TIER_CAPABILITIES,
    isKnownCapability,
    tierGrants,
    type ComponentManifest,
    type LoadDecision,
    type LoadDecisionKind,
    type EvaluateManifestOptions,
    evaluateManifest,
    readManifest,
} from './host/index.js';
