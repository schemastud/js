// src/core/wire.ts
var CHAT_WIRE_EVENT_TYPES = [
  "token",
  "tool_call",
  "tool_result",
  "citation",
  "session",
  "escalation",
  "roster",
  "done",
  "error"
];

// src/core/transport.ts
async function* readSse(response) {
  const body = response.body;
  if (!body) {
    return;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      yield parseFrame(chunk);
    }
  }
  const tail = buffer.trim();
  if (tail.length > 0) {
    yield parseFrame(tail);
  }
}
function parseFrame(chunk) {
  let event = "message";
  let data = "";
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }
  let parsed = data;
  try {
    parsed = JSON.parse(data);
  } catch {
  }
  return { event, data: parsed };
}

// src/core/fold.ts
function emptySnapshot() {
  return { messages: [], roster: [], sessionId: null, escalation: null, streaming: false };
}
function hydrate(seed) {
  return {
    ...emptySnapshot(),
    messages: seed.map((m) => ({ ...m }))
  };
}
function anyStreaming(messages) {
  return messages.some((m) => m.streaming?.partial === true);
}
function indexOf(messages, messageId) {
  return messages.findIndex((m) => m.id === messageId);
}
function patchAt(messages, index, patch) {
  const next = messages.slice();
  next[index] = patch(messages[index]);
  return next;
}
function ensureMessage(messages, messageId) {
  const existing = indexOf(messages, messageId);
  if (existing !== -1) {
    return [messages, existing];
  }
  const fresh = {
    id: messageId,
    role: "assistant",
    content: "",
    streaming: { partial: true }
  };
  return [[...messages, fresh], messages.length];
}
function appendToken(segments, delta) {
  const list = segments ? segments.slice() : [];
  const tail = list[list.length - 1];
  if (tail && tail.type === "text" && tail.body === void 0) {
    list[list.length - 1] = { ...tail, text: tail.text + delta };
  } else {
    list.push({ type: "text", text: delta });
  }
  return list;
}
function hasToolSegment(segments, type, toolId) {
  return (segments ?? []).some((s) => s.type === type && "toolId" in s && s.toolId === toolId);
}
function foldEvent(snapshot, event) {
  switch (event.type) {
    case "token": {
      if (event.delta === "") {
        return snapshot;
      }
      const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
      const target = messages[index];
      if (target.streaming && target.streaming.partial === false) {
        return snapshot;
      }
      const next = patchAt(messages, index, (m) => ({
        ...m,
        content: m.content + event.delta,
        segments: appendToken(m.segments, event.delta),
        streaming: m.streaming ?? { partial: true }
      }));
      return { ...snapshot, messages: next, streaming: anyStreaming(next) };
    }
    case "tool_call": {
      const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
      if (hasToolSegment(messages[index].segments, "tool_call", event.toolId)) {
        return messages === snapshot.messages ? snapshot : { ...snapshot, messages };
      }
      const segment = {
        type: "tool_call",
        toolId: event.toolId,
        toolName: event.toolName,
        arguments: event.arguments
      };
      const next = patchAt(messages, index, (m) => ({
        ...m,
        segments: [...m.segments ?? [], segment],
        streaming: m.streaming ?? { partial: true }
      }));
      return { ...snapshot, messages: next, streaming: anyStreaming(next) };
    }
    case "tool_result": {
      const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
      if (hasToolSegment(messages[index].segments, "tool_result", event.toolId)) {
        return messages === snapshot.messages ? snapshot : { ...snapshot, messages };
      }
      const segment = {
        type: "tool_result",
        toolId: event.toolId,
        toolName: event.toolName,
        result: event.result
      };
      const next = patchAt(messages, index, (m) => ({
        ...m,
        segments: [...m.segments ?? [], segment],
        streaming: m.streaming ?? { partial: true }
      }));
      return { ...snapshot, messages: next, streaming: anyStreaming(next) };
    }
    case "citation": {
      const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
      const citations = event.citations.map((c) => ({ ...c }));
      const next = patchAt(messages, index, (m) => ({ ...m, citations }));
      return { ...snapshot, messages: next };
    }
    case "session":
      if (snapshot.sessionId === event.session_id) {
        return snapshot;
      }
      return { ...snapshot, sessionId: event.session_id };
    case "escalation":
      return {
        ...snapshot,
        escalation: { reason: event.reason, ...event.offer !== void 0 ? { offer: event.offer } : {} }
      };
    case "roster":
      return { ...snapshot, roster: event.participants.map((p) => ({ ...p })) };
    case "done": {
      const index = indexOf(snapshot.messages, event.messageId);
      if (index === -1) {
        return snapshot;
      }
      const next = patchAt(snapshot.messages, index, (m) => ({
        ...m,
        streaming: { ...m.streaming ?? { partial: false }, partial: false },
        ...event.createdAt && !m.createdAt ? { createdAt: event.createdAt } : {}
      }));
      return { ...snapshot, messages: next, streaming: anyStreaming(next) };
    }
    case "error": {
      let index = event.messageId ? indexOf(snapshot.messages, event.messageId) : -1;
      if (index === -1) {
        for (let i = snapshot.messages.length - 1; i >= 0; i--) {
          if (snapshot.messages[i].streaming?.partial) {
            index = i;
            break;
          }
        }
      }
      if (index === -1) {
        const fresh = {
          id: event.messageId ?? `error_${snapshot.messages.length}`,
          role: "assistant",
          content: "",
          streaming: { partial: event.partial, error: event.error }
        };
        const next2 = [...snapshot.messages, fresh];
        return { ...snapshot, messages: next2, streaming: anyStreaming(next2) };
      }
      const next = patchAt(snapshot.messages, index, (m) => ({
        ...m,
        streaming: { partial: event.partial, error: event.error }
      }));
      return { ...snapshot, messages: next, streaming: anyStreaming(next) };
    }
    default: {
      const _exhaustive = event;
      void _exhaustive;
      return snapshot;
    }
  }
}
async function foldAll(start, events) {
  let snapshot = start;
  for await (const event of events) {
    snapshot = foldEvent(snapshot, event);
  }
  return snapshot;
}

// src/core/store.ts
var autoId = 0;
var defaultGenerateId = () => `m_${Date.now().toString(36)}_${(autoId++).toString(36)}`;
function createChatCore(options) {
  const { transport, generateId = defaultGenerateId } = options;
  let snapshot = options.initialMessages ? hydrate(options.initialMessages) : emptySnapshot();
  let sending = false;
  const listeners = /* @__PURE__ */ new Set();
  const commit = (next) => {
    snapshot = {
      ...next,
      streaming: sending || next.messages.some((message) => message.streaming?.partial === true)
    };
    for (const fn of listeners) {
      fn(snapshot);
    }
  };
  const fold = (event) => commit(foldEvent(snapshot, event));
  const pushMessage = (message) => {
    commit({ ...snapshot, messages: [...snapshot.messages, message] });
  };
  async function* defaultAdapt(response, messageId) {
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      const data = body?.data ?? {};
      if (typeof data.session_id === "string") {
        yield { type: "session", session_id: data.session_id };
      }
      yield {
        type: "escalation",
        reason: typeof data.reason === "string" ? data.reason : "escalated",
        offer: data.offer
      };
      return;
    }
    for await (const frame of readSse(response)) {
      const mapped = mapFrame(frame.event, frame.data, messageId);
      if (mapped) {
        yield mapped;
      }
    }
    yield { type: "done", messageId };
  }
  async function send(content, sendOptions = {}) {
    if (!content || snapshot.streaming) {
      return;
    }
    sending = true;
    const userMessage = { id: generateId(), role: sendOptions.role ?? "user", content };
    pushMessage(userMessage);
    if (snapshot.escalation) {
      commit({ ...snapshot, escalation: null });
    }
    const assistantId = generateId();
    const ownedMessages = /* @__PURE__ */ new Set();
    try {
      const response = await transport.send({ content, session_id: snapshot.sessionId }, sendOptions.headers);
      const events = transport.adapt ? transport.adapt(response) : defaultAdapt(response, assistantId);
      for await (const event of events) {
        const previousMessages = new Set(snapshot.messages);
        const next = foldEvent(snapshot, event);
        for (const message of next.messages) {
          if (!previousMessages.has(message)) ownedMessages.add(message.id);
        }
        commit(next);
      }
    } catch {
      const messages = snapshot.messages.filter((message) => ownedMessages.has(message.id));
      const partials = messages.filter((message) => message.streaming?.partial);
      const failedMessages = partials.length ? partials : messages.slice(-1);
      if (failedMessages.length) {
        for (const message of failedMessages) {
          fold({
            type: "error",
            messageId: message.id,
            error: message.streaming?.error ?? "transport_error",
            partial: false
          });
        }
      } else {
        pushMessage({
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: { partial: false, error: "transport_error" }
        });
      }
      fold({ type: "escalation", reason: "transport_error" });
    } finally {
      for (const message of snapshot.messages) {
        if (ownedMessages.has(message.id) && message.streaming?.partial) {
          fold({ type: "done", messageId: message.id });
        }
      }
      sending = false;
      commit(snapshot);
    }
  }
  async function requestHuman(contact = null, consent = false) {
    try {
      await transport.send({ escalate: true, session_id: snapshot.sessionId, contact, consent });
    } catch {
    }
    if (!snapshot.escalation) {
      fold({ type: "escalation", reason: "visitor_request" });
    }
  }
  return {
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot);
      return () => {
        listeners.delete(fn);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    hydrate(seed) {
      commit(hydrate(seed));
    },
    send,
    requestHuman
  };
}
function mapFrame(event, data, messageId) {
  const payload = data && typeof data === "object" ? data : {};
  const mid = typeof payload.messageId === "string" ? payload.messageId : messageId;
  switch (event) {
    case "token":
    case "text_delta":
    case "text-delta": {
      const delta = typeof payload.delta === "string" ? payload.delta : typeof data === "string" ? data : "";
      return { type: "token", messageId: mid, delta };
    }
    case "tool_call":
      return {
        type: "tool_call",
        messageId: mid,
        toolId: String(payload.toolId ?? ""),
        toolName: String(payload.toolName ?? ""),
        arguments: payload.arguments
      };
    case "tool_result":
      return {
        type: "tool_result",
        messageId: mid,
        toolId: String(payload.toolId ?? ""),
        toolName: String(payload.toolName ?? ""),
        result: payload.result
      };
    case "citation":
      return {
        type: "citation",
        messageId: mid,
        citations: Array.isArray(payload.citations) ? payload.citations : []
      };
    case "session":
      return typeof payload.session_id === "string" ? { type: "session", session_id: payload.session_id } : null;
    case "escalation":
      return { type: "escalation", reason: String(payload.reason ?? "escalated"), offer: payload.offer };
    case "roster":
      return {
        type: "roster",
        participants: Array.isArray(payload.participants) ? payload.participants : []
      };
    case "done":
      return {
        type: "done",
        messageId: mid,
        createdAt: typeof payload.createdAt === "string" ? payload.createdAt : void 0
      };
    case "error":
      return {
        type: "error",
        messageId: typeof payload.messageId === "string" ? payload.messageId : mid,
        error: String(payload.error ?? "error"),
        partial: payload.partial === true
      };
    default:
      return null;
  }
}

// src/core/index.ts
var CHAT_CORE = "schemastud-chat-core";

export {
  CHAT_WIRE_EVENT_TYPES,
  readSse,
  emptySnapshot,
  hydrate,
  foldEvent,
  foldAll,
  createChatCore,
  CHAT_CORE
};
//# sourceMappingURL=chunk-4Q5ENFHM.js.map