import {
  DEFAULT_LIMITS,
  GUEST_RUNTIME_SOURCE,
  GuestFailure,
  GuestVm,
  SANDBOX_ORIGIN
} from "./chunk-ETYTCTMI.js";
import {
  BLOCK_TYPES,
  CAPABILITY_NAMES,
  DEFAULT_ALLOWLIST,
  DEFAULT_BLOCK_VOCABULARY,
  HostReceiver,
  RemoteSurface,
  TIER_CAPABILITIES,
  VOCABULARY_MAJOR,
  VOCABULARY_VERSION,
  createBlockVocabulary,
  evaluateManifest,
  eventRef,
  isEventRef,
  isKnownCapability,
  readManifest,
  registerBlock,
  renderRemoteTree,
  tierGrants
} from "./chunk-SYH6JHKW.js";

// src/bridge.ts
var RemoteComponentBridge = class _RemoteComponentBridge {
  constructor(host, vm) {
    this.host = host;
    this.vm = vm;
  }
  host;
  vm;
  static async create(options = {}) {
    let vmRef = null;
    const host = new HostReceiver({
      dispatchToGuest: (handlerId, payload) => vmRef?.dispatchEvent(handlerId, payload)
    });
    const vm = await GuestVm.create({
      limits: options.limits,
      onLog: options.onLog,
      onMutate: (records) => host.applyMutations(records),
      capabilityToken: options.capabilityToken,
      brokerCall: options.brokerCall
    });
    vmRef = vm;
    return new _RemoteComponentBridge(host, vm);
  }
  /** Load untrusted publisher source and paint its initial tree. */
  load(source) {
    this.vm.load(source);
  }
  dispose() {
    this.vm.dispose();
  }
};
export {
  BLOCK_TYPES,
  CAPABILITY_NAMES,
  DEFAULT_ALLOWLIST,
  DEFAULT_BLOCK_VOCABULARY,
  DEFAULT_LIMITS,
  GUEST_RUNTIME_SOURCE,
  GuestFailure,
  GuestVm,
  HostReceiver,
  RemoteComponentBridge,
  RemoteSurface,
  SANDBOX_ORIGIN,
  TIER_CAPABILITIES,
  VOCABULARY_MAJOR,
  VOCABULARY_VERSION,
  createBlockVocabulary,
  evaluateManifest,
  eventRef,
  isEventRef,
  isKnownCapability,
  readManifest,
  registerBlock,
  renderRemoteTree,
  tierGrants
};
//# sourceMappingURL=index.js.map