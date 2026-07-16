/**
 * RCP-05 — the guest-side capability surface. Proves that an isolated guest, holding
 * ONLY an injected scoped token, can call a brokered capability by name and gets the
 * host broker's result — and that over-asking / a missing token / a missing broker are
 * refused in-VM (returned, never thrown, never a credential leak).
 *
 * The broker here is a FAKE host authority that mimics the server-side CapabilityBroker:
 * it authorizes `resolve` and refuses everything else. In a real embedder this callback
 * POSTs to `/embed/capability` presenting the token; the trust decision is identical.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { GuestVm, type BrokerCall } from '../src/guest/vm.js';

/** A guest that resolves a $ref through the brokered capability and reports the result. */
const RESOLVE_GUEST = /* js */ `
  var r = FrameRemote.capability('resolve', { id: 'nod_in_scope' });
  globalThis.__RESULT__ = r;
`;

/** A guest that over-asks a capability its grant never included. */
const OVERASK_GUEST = /* js */ `
  globalThis.__RESULT__ = FrameRemote.capability('request_save', { any: 'thing' });
`;

/** A guest that tries to READ the token as a value (it must not be able to). */
const EXFIL_GUEST = /* js */ `
  globalThis.__RESULT__ = {
    // The runtime reads the token to arm capability(), but never re-exposes it.
    tokenType: typeof (FrameRemote.token),
    rawType: typeof __frame_capability_token,
  };
`;

describe('RCP-05 guest capability surface', () => {
    let vm: GuestVm | null = null;
    afterEach(() => {
        vm?.dispose();
        vm = null;
    });

    // A fake server-side broker: allow `resolve`, refuse everything else. Mirrors the
    // PHP CapabilityBroker's allow/refuse contract shape ({ ok, data } | { ok, reason }).
    const fakeBroker: BrokerCall = (name, args) => {
        if (name === 'resolve') {
            const id = (args as { id?: string }).id ?? '';
            if (id === 'nod_in_scope') {
                return { ok: true, data: { '@id': id, name: 'Cold Holding' } };
            }
            return { ok: false, reason: 'ref_out_of_scope' };
        }
        return { ok: false, reason: 'capability_not_granted' };
    };

    it('brokers a resolve using only the injected token, returning the host result', async () => {
        vm = await GuestVm.create({
            onMutate: () => {},
            capabilityToken: 'cap.token.here',
            brokerCall: fakeBroker,
        });
        vm.load(RESOLVE_GUEST);

        const result = vm.read<{ ok: boolean; data?: { '@id': string; name: string } }>('__RESULT__');
        expect(result.ok).toBe(true);
        expect(result.data?.['@id']).toBe('nod_in_scope');
        expect(result.data?.name).toBe('Cold Holding');
    });

    it('refuses a capability outside the grant (over-ask) — returned, not thrown', async () => {
        vm = await GuestVm.create({
            onMutate: () => {},
            capabilityToken: 'cap.token.here',
            brokerCall: fakeBroker,
        });
        vm.load(OVERASK_GUEST);

        const result = vm.read<{ ok: boolean; reason?: string }>('__RESULT__');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('capability_not_granted');
    });

    it('refuses every capability when no token was injected (deny-by-default)', async () => {
        vm = await GuestVm.create({ onMutate: () => {}, brokerCall: fakeBroker });
        vm.load(RESOLVE_GUEST);

        const result = vm.read<{ ok: boolean; reason?: string }>('__RESULT__');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_token');
    });

    it('refuses when a token is present but no broker is wired', async () => {
        vm = await GuestVm.create({ onMutate: () => {}, capabilityToken: 'cap.token.here' });
        vm.load(RESOLVE_GUEST);

        const result = vm.read<{ ok: boolean; reason?: string }>('__RESULT__');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_broker');
    });

    it('does not re-expose the token as a readable value on the SDK', async () => {
        vm = await GuestVm.create({
            onMutate: () => {},
            capabilityToken: 'super.secret.token',
            brokerCall: fakeBroker,
        });
        vm.load(EXFIL_GUEST);

        const result = vm.read<{ tokenType: string; rawType: string }>('__RESULT__');
        // FrameRemote.token is never defined — the guest holds a capability, not a credential.
        expect(result.tokenType).toBe('undefined');
    });
});
