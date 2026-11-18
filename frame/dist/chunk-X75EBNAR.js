// src/session.ts
var FrameActionError = class extends Error {
  status;
  errors;
  body;
  constructor(status, body, fallback = `The request failed (${status}).`) {
    const envelope = body && typeof body === "object" ? body : {};
    super(typeof envelope.message === "string" && envelope.message !== "" ? envelope.message : fallback);
    this.name = "FrameActionError";
    this.status = status;
    this.body = body;
    this.errors = envelope.errors && typeof envelope.errors === "object" ? envelope.errors : {};
  }
};
function xsrfHeader() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? { "X-XSRF-TOKEN": decodeURIComponent(match[1]) } : {};
}
function withQuery(url, params) {
  const query = params ? new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString() : "";
  return query ? `${url}${url.includes("?") ? "&" : "?"}${query}` : url;
}
function createSessionRequest(options = {}) {
  const send = options.fetch ?? ((...args) => fetch(...args));
  const headers = (withBody) => {
    const merged = new Headers({ Accept: "application/json", "X-Requested-With": "XMLHttpRequest" });
    if (withBody) merged.set("Content-Type", "application/json");
    for (const [key, value] of Object.entries(xsrfHeader())) merged.set(key, value);
    const extra = typeof options.headers === "function" ? options.headers() : options.headers;
    new Headers(extra).forEach((value, key) => merged.set(key, value));
    return merged;
  };
  return async function request(method, url, params, body, init) {
    const target = withQuery(url, params);
    const res = await send(target, {
      method,
      headers: headers(body !== void 0),
      credentials: "same-origin",
      ...body === void 0 ? {} : { body: JSON.stringify(body) },
      ...init?.signal ? { signal: init.signal } : {}
    });
    const text = res.status === 204 ? "" : await res.text();
    let parsed = null;
    if (text !== "") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const where = `${method} ${target} failed (${res.status}).`;
      const error = new FrameActionError(res.status, parsed, where);
      Object.defineProperty(error, "cause", { value: new Error(where), enumerable: false, configurable: true, writable: true });
      throw error;
    }
    return { status: res.status, data: parsed };
  };
}

export {
  FrameActionError,
  xsrfHeader,
  createSessionRequest
};
//# sourceMappingURL=chunk-X75EBNAR.js.map