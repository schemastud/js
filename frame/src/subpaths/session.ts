// =============================================================================
// @schemastud/frame/session — the session request (ticket 48): same-origin JSON with the XSRF token, and the token
// header alone for a request that is not JSON (FormData, SSE).
//
// It imports nothing, so a caller that mounts no frame pays for this module only. A rejection is the root's
// `FrameActionError`; a client outside frame reads its `status`, `errors` and `message` structurally.
// =============================================================================

export {
    createSessionRequest,
    xsrfHeader,
    type SessionRequest,
    type SessionRequestOptions,
    type SessionResponse,
} from '../session';
