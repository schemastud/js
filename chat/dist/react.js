import {
  CHAT_CORE,
  createChatCore
} from "./chunk-4Q5ENFHM.js";
import {
  countDescendants,
  flattenThread,
  foldTree
} from "./chunk-RZVHGNBS.js";

// src/react/use-chat.ts
import { useMemo, useRef, useSyncExternalStore } from "react";
function isPrebuilt(options) {
  return "core" in options && !("transport" in options);
}
function useChat(arg) {
  const options = "kind" in arg ? { transport: arg } : arg;
  const key = isPrebuilt(options) ? options.core : options.transport;
  const built = useRef(null);
  if (!built.current || built.current.key !== key) {
    built.current = { key, core: isPrebuilt(options) ? options.core : createChatCore(options) };
  }
  const core = built.current.core;
  const snapshot = useSyncExternalStore(
    (onStoreChange) => core.subscribe(onStoreChange),
    () => core.getSnapshot(),
    () => core.getSnapshot()
  );
  return useMemo(
    () => ({
      snapshot,
      send: core.send,
      hydrate: core.hydrate,
      requestHuman: core.requestHuman,
      core
    }),
    [snapshot, core]
  );
}

// src/react/default-render.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function renderSegment(segment, message, overrides, key) {
  const override = overrides?.[segment.type];
  if (override) {
    return /* @__PURE__ */ jsx("div", { "data-chat-segment": segment.type, children: override(segment, message) }, key);
  }
  return /* @__PURE__ */ jsx("div", { "data-chat-segment": segment.type, children: defaultSegment(segment) }, key);
}
function defaultSegment(segment) {
  switch (segment.type) {
    case "text":
      return /* @__PURE__ */ jsx("span", { "data-chat-text": true, children: segment.text });
    case "tool_call":
      return /* @__PURE__ */ jsxs("div", { "data-chat-tool-call": true, "data-tool-name": segment.toolName, children: [
        segment.toolName,
        "(",
        JSON.stringify(segment.arguments),
        ")"
      ] });
    case "tool_result":
      return /* @__PURE__ */ jsx("div", { "data-chat-tool-result": true, "data-tool-name": segment.toolName, children: JSON.stringify(segment.result) });
    case "citation":
      return /* @__PURE__ */ jsx("span", { "data-chat-citation-segment": true, children: segment.name ?? segment.id ?? "citation" });
    default: {
      const _exhaustive = segment;
      void _exhaustive;
      return null;
    }
  }
}
function renderMessageBody(message, segmentOverrides) {
  if (message.segments && message.segments.length > 0) {
    return /* @__PURE__ */ jsx("div", { "data-chat-segments": true, children: message.segments.map((segment, index) => renderSegment(segment, message, segmentOverrides, index)) });
  }
  return /* @__PURE__ */ jsx("div", { "data-chat-content": true, children: message.content });
}

// src/react/chat-view.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function MessageRow({
  message,
  slots
}) {
  return /* @__PURE__ */ jsxs2("div", { "data-chat-message": true, "data-role": message.role, "data-message-id": message.id, children: [
    /* @__PURE__ */ jsx2("div", { "data-chat-message-body": true, children: renderMessageBody(message, slots.renderSegment) }),
    message.citations && message.citations.length > 0 && slots.citationChrome ? /* @__PURE__ */ jsx2("div", { "data-chat-citations": true, children: slots.citationChrome(message.citations, message) }) : null,
    slots.messageToolbar ? /* @__PURE__ */ jsx2("div", { "data-chat-message-toolbar": true, children: slots.messageToolbar(message) }) : null
  ] });
}
function ChatView({ chat, layout, slots = {} }) {
  const { snapshot, send, requestHuman } = chat;
  const { messages, roster, escalation, streaming } = snapshot;
  const composerApi = {
    send: (content) => send(content),
    requestHuman: (reason) => requestHuman(reason),
    streaming,
    escalated: escalation !== null
  };
  const bannerWho = roster.find((p) => p.kind === "agent" || p.kind === "visitor");
  return /* @__PURE__ */ jsxs2("div", { "data-chat-view": true, "data-layout": layout, "data-streaming": streaming, "data-escalated": escalation !== null, children: [
    slots.header ? /* @__PURE__ */ jsx2("div", { "data-chat-header": true, children: slots.header() }) : null,
    slots.participants && roster.length > 0 ? /* @__PURE__ */ jsx2("div", { "data-chat-participants": true, children: slots.participants(roster) }) : null,
    slots.participantBanner && bannerWho ? /* @__PURE__ */ jsx2("div", { "data-chat-participant-banner": true, children: slots.participantBanner(bannerWho) }) : null,
    /* @__PURE__ */ jsxs2("div", { "data-chat-messages": true, children: [
      messages.length === 0 && !streaming ? slots.emptyState ? slots.emptyState() : null : messages.map((message) => /* @__PURE__ */ jsx2(MessageRow, { message, slots }, message.id)),
      streaming && slots.loadingState ? /* @__PURE__ */ jsx2("div", { "data-chat-loading": true, children: slots.loadingState() }) : null
    ] }),
    escalation && slots.escalatedState ? /* @__PURE__ */ jsx2("div", { "data-chat-escalated": true, children: slots.escalatedState(escalation.reason) }) : null,
    slots.composer ? /* @__PURE__ */ jsx2("div", { "data-chat-composer": true, children: slots.composer(composerApi) }) : null
  ] });
}

// src/react/thread-view.tsx
import { useCallback, useMemo as useMemo2, useState } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function ThreadView({ snapshot, maxDepth = null, slots = {}, initialCollapsed = [] }) {
  const [collapsed, setCollapsed] = useState(() => new Set(initialCollapsed));
  const roots = useMemo2(() => foldTree(snapshot, maxDepth), [snapshot, maxDepth]);
  const rows = useMemo2(() => flattenThread(roots, { collapsed }), [roots, collapsed]);
  const toggle = useCallback((id) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);
  return /* @__PURE__ */ jsxs3("div", { "data-thread-view": true, "data-max-depth": maxDepth ?? "unbounded", children: [
    rows.length === 0 && slots.emptyState ? slots.emptyState() : null,
    rows.map((row) => {
      const childCount = countDescendants(row);
      const isCollapsed = collapsed.has(row.message.id);
      return /* @__PURE__ */ jsxs3(
        "div",
        {
          "data-thread-row": true,
          "data-depth": row.depth,
          "data-collapsed": isCollapsed,
          style: { marginInlineStart: `${row.depth}rem` },
          children: [
            slots.threadRowChrome ? /* @__PURE__ */ jsx3("div", { "data-thread-row-chrome": true, children: slots.threadRowChrome({
              message: row.message,
              depth: row.depth,
              childCount,
              collapsed: isCollapsed,
              toggle: () => toggle(row.message.id)
            }) }) : childCount > 0 ? /* @__PURE__ */ jsx3("button", { type: "button", "data-thread-toggle": true, onClick: () => toggle(row.message.id), children: isCollapsed ? `Show ${childCount} replies` : `Hide ${childCount} replies` }) : null,
            /* @__PURE__ */ jsxs3("div", { "data-chat-message": true, "data-role": row.message.role, children: [
              renderMessageBody(row.message, slots.renderSegment),
              slots.messageToolbar ? /* @__PURE__ */ jsx3("div", { "data-chat-message-toolbar": true, children: slots.messageToolbar(row.message) }) : null
            ] })
          ]
        },
        row.message.id
      );
    })
  ] });
}

// src/react/composer.tsx
import { useState as useState2 } from "react";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function Composer({
  send,
  requestHuman,
  streaming,
  escalated,
  placeholder = "Type a message\u2026",
  sendLabel = "Send",
  allowRequestHuman = false,
  requestHumanLabel = "Talk to a human"
}) {
  const [value, setValue] = useState2("");
  const canSend = value.trim().length > 0 && !streaming;
  async function submit() {
    const content = value.trim();
    if (!content || streaming) {
      return;
    }
    setValue("");
    await send(content);
  }
  return /* @__PURE__ */ jsxs4(
    "form",
    {
      "data-chat-composer-standard": true,
      "data-streaming": streaming,
      "data-escalated": escalated,
      onSubmit: (event) => {
        event.preventDefault();
        void submit();
      },
      children: [
        /* @__PURE__ */ jsxs4("label", { "data-chat-composer-label": true, children: [
          /* @__PURE__ */ jsx4("span", { "data-chat-composer-label-text": true, children: "Message" }),
          /* @__PURE__ */ jsx4(
            "textarea",
            {
              "data-chat-composer-input": true,
              value,
              placeholder,
              disabled: streaming,
              onChange: (event) => setValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("div", { "data-chat-composer-actions": true, children: [
          allowRequestHuman ? /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              "data-chat-composer-request-human": true,
              disabled: escalated,
              onClick: () => void requestHuman(),
              children: requestHumanLabel
            }
          ) : null,
          /* @__PURE__ */ jsx4("button", { type: "submit", "data-chat-composer-send": true, disabled: !canSend, children: sendLabel })
        ] })
      ]
    }
  );
}

// src/react/presets.tsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function rosterLine(roster) {
  return /* @__PURE__ */ jsx5("ul", { "data-chat-roster": true, children: roster.map((p) => /* @__PURE__ */ jsx5("li", { "data-chat-roster-member": true, "data-kind": p.kind, children: p.label ?? p.id }, p.id)) });
}
function joiningBanner(who) {
  return /* @__PURE__ */ jsxs5("div", { "data-chat-joining-banner": true, children: [
    who?.label ?? "A teammate",
    " is joining\u2026"
  ] });
}
var viewport = {
  layout: "viewport",
  slots: {
    composer: (api) => /* @__PURE__ */ jsx5(Composer, { ...api }),
    participants: (roster) => rosterLine(roster),
    emptyState: () => /* @__PURE__ */ jsx5("div", { "data-chat-empty": true, children: "No messages yet. Ask anything." }),
    loadingState: () => /* @__PURE__ */ jsx5("div", { "data-chat-loading-indicator": true, children: "Thinking\u2026" }),
    // Wired, ships UNFILLED — the verdict shell is a downstream capability.
    adjudicationPanel: void 0
  }
};
var popover = {
  layout: "popover",
  slots: {
    composer: (api) => /* @__PURE__ */ jsx5(Composer, { ...api, placeholder: "Ask a question\u2026" }),
    participantBanner: (who) => joiningBanner(who),
    emptyState: () => /* @__PURE__ */ jsx5("div", { "data-chat-empty": true, children: "How can we help?" })
  }
};
var siteAsk = {
  layout: "site-ask",
  slots: {
    composer: (api) => /* @__PURE__ */ jsx5(Composer, { ...api, placeholder: "Ask about this page\u2026", sendLabel: "Ask" }),
    participantBanner: (who) => joiningBanner(who),
    emptyState: () => /* @__PURE__ */ jsx5("div", { "data-chat-empty": true, children: "Ask about this page." })
  }
};
var support = {
  layout: "support",
  slots: {
    composer: (api) => /* @__PURE__ */ jsx5(Composer, { ...api, allowRequestHuman: true, placeholder: "Message support\u2026" }),
    participants: (roster) => rosterLine(roster),
    participantBanner: (who) => joiningBanner(who),
    escalatedState: (reason) => /* @__PURE__ */ jsx5("div", { "data-chat-escalated-notice": true, "data-reason": reason, children: "A human is joining this conversation." }),
    emptyState: () => /* @__PURE__ */ jsx5("div", { "data-chat-empty": true, children: "Tell us what you need help with." })
  }
};
var presets = { viewport, popover, siteAsk, support };

// src/react/index.ts
var CHAT_REACT = "schemastud-chat-react";
var CHAT_CORE_TAG = CHAT_CORE;
export {
  CHAT_CORE_TAG,
  CHAT_REACT,
  ChatView,
  Composer,
  ThreadView,
  popover,
  presets,
  renderMessageBody,
  renderSegment,
  siteAsk,
  support,
  useChat,
  viewport
};
//# sourceMappingURL=react.js.map