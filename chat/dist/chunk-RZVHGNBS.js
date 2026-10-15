// src/thread/index.ts
function foldTree(source, maxDepth = null) {
  const messages = source.messages;
  const byId = /* @__PURE__ */ new Map();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  const parentOf = /* @__PURE__ */ new Map();
  for (const message of messages) {
    const parentId = message.replyToId;
    if (parentId === void 0 || parentId === message.id || !byId.has(parentId)) {
      continue;
    }
    if (walksToSelf(message.id, parentId, byId)) {
      continue;
    }
    parentOf.set(message.id, parentId);
  }
  const nodes = /* @__PURE__ */ new Map();
  for (const message of messages) {
    nodes.set(message.id, { message, depth: 0, hidden: false, children: [] });
  }
  const roots = [];
  for (const message of messages) {
    const node = nodes.get(message.id);
    const parentId = parentOf.get(message.id);
    if (parentId === void 0) {
      roots.push(node);
      continue;
    }
    nodes.get(parentId).children.push(node);
  }
  const cap = maxDepth ?? Number.POSITIVE_INFINITY;
  const assign = (node, depth) => {
    node.depth = depth;
    node.hidden = depth >= cap;
    for (const child of node.children) {
      assign(child, depth + 1);
    }
  };
  for (const root of roots) {
    assign(root, 0);
  }
  return roots;
}
function walksToSelf(origin, from, byId) {
  const seen = /* @__PURE__ */ new Set([origin]);
  let cursor = from;
  while (cursor !== void 0) {
    if (seen.has(cursor)) {
      return true;
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.replyToId;
  }
  return false;
}
function flattenThread(roots, options = {}) {
  const collapsed = options.collapsed instanceof Set ? options.collapsed : new Set(options.collapsed ?? []);
  const rows = [];
  const walk = (node) => {
    if (node.hidden) {
      return;
    }
    rows.push(node);
    if (collapsed.has(node.message.id)) {
      return;
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  for (const root of roots) {
    walk(root);
  }
  return rows;
}
function countDescendants(node) {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}
var CHAT_THREAD = "schemastud-chat-thread";

export {
  foldTree,
  flattenThread,
  countDescendants,
  CHAT_THREAD
};
//# sourceMappingURL=chunk-RZVHGNBS.js.map