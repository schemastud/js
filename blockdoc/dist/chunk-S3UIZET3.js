import {
  DOMParser,
  DOMSerializer,
  Fragment,
  Mapping,
  Mark,
  NODE_ID_ATTR,
  Node as Node2,
  NodeRange,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  Schema,
  Slice,
  Transform,
  allBlockCategories,
  attrsFromSchema,
  canJoin,
  canSplit,
  collectManifestEntries,
  contentExpressionFor,
  dropPoint,
  findWrapping,
  generateNodeId,
  groupsFor,
  joinPoint,
  liftTarget,
  normalizeLegacyNodeNames,
  replaceStep
} from "./chunk-5NAL6HN7.js";

// src/react/commit-controller.ts
var CommitController = class {
  constructor(getDoc, deliver, policy = {}, initialValue) {
    this.getDoc = getDoc;
    this.deliver = deliver;
    this.debounceMs = policy.debounceMs ?? 400;
    this.commitOnBlur = policy.onBlur ?? true;
    this.lastCommitted = JSON.stringify(initialValue ?? null);
  }
  getDoc;
  deliver;
  debounceMs;
  commitOnBlur;
  lastCommitted;
  dirty = false;
  timer = null;
  /** A doc-changing transaction landed: restart the trailing debounce. */
  noteChange() {
    this.dirty = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }
  /** Blur commits immediately (unless the policy opts out). */
  noteBlur() {
    if (this.commitOnBlur) {
      this.flush();
    }
  }
  /** Commit synchronously when dirty; a clean flush is a no-op. */
  flush() {
    this.clearTimer();
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    const doc2 = this.getDoc();
    this.lastCommitted = JSON.stringify(doc2 ?? null);
    this.deliver(doc2);
  }
  /**
   * The last-committed guard: equal to what we last committed (the RJSF
   * onChange echo) ⇒ ignore; different ⇒ the island must rebuild.
   */
  receiveExternalValue(value) {
    return JSON.stringify(value ?? null) === this.lastCommitted ? "ignore" : "rebuild";
  }
  /**
   * The island rebuilt EditorState from an external value. Resets dirt and
   * any pending debounce — a rebuild never fires a commit — and re-seeds the
   * guard so the rebuilt value's own echo is absorbed.
   */
  noteRebuilt(value) {
    this.clearTimer();
    this.dirty = false;
    this.lastCommitted = JSON.stringify(value ?? null);
  }
  get isDirty() {
    return this.dirty;
  }
  dispose() {
    this.clearTimer();
    this.dirty = false;
  }
  clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
};

// src/react/doc-source.ts
function valueDocSource(value) {
  return {
    get: () => value ?? null
  };
}

// node_modules/.pnpm/prosemirror-state@1.4.4/node_modules/prosemirror-state/dist/index.js
var classesById = /* @__PURE__ */ Object.create(null);
var Selection = class {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++)
      if (ranges[i].$from.pos != ranges[i].$to.pos)
        return false;
    return true;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(tr, content = Slice.empty) {
    let lastNode = content.content.lastChild, lastParent = null;
    for (let i = 0; i < content.openEnd; i++) {
      lastParent = lastNode;
      lastNode = lastNode.lastChild;
    }
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
      if (i == 0)
        selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(tr, node) {
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      let from2 = mapping.map($from.pos), to = mapping.map($to.pos);
      if (i) {
        tr.deleteRange(from2, to);
      } else {
        tr.replaceRangeWith(from2, to, node);
        selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
      }
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom($pos, dir, textOnly = false) {
    let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
    if (inner)
      return inner;
    for (let depth = $pos.depth - 1; depth >= 0; depth--) {
      let found = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
      if (found)
        return found;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near($pos, bias = 1) {
    return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(doc2) {
    return findSelectionIn(doc2, doc2, 0, 0, 1) || new AllSelection(doc2);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(doc2) {
    return findSelectionIn(doc2, doc2, doc2.content.size, doc2.childCount, -1) || new AllSelection(doc2);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(doc2, json) {
    if (!json || !json.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let cls = classesById[json.type];
    if (!cls)
      throw new RangeError(`No selection type ${json.type} defined`);
    return cls.fromJSON(doc2, json);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(id, selectionClass) {
    if (id in classesById)
      throw new RangeError("Duplicate use of selection JSON ID " + id);
    classesById[id] = selectionClass;
    selectionClass.prototype.jsonID = id;
    return selectionClass;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
};
Selection.prototype.visible = true;
var SelectionRange = class {
  /**
  Create a range.
  */
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
};
var warnedAboutTextSelection = false;
function checkTextSelection($pos) {
  if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
    warnedAboutTextSelection = true;
    console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
  }
}
var TextSelection = class _TextSelection extends Selection {
  /**
  Construct a text selection between the given points.
  */
  constructor($anchor, $head = $anchor) {
    checkTextSelection($anchor);
    checkTextSelection($head);
    super($anchor, $head);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(doc2, mapping) {
    let $head = doc2.resolve(mapping.map(this.head));
    if (!$head.parent.inlineContent)
      return Selection.near($head);
    let $anchor = doc2.resolve(mapping.map(this.anchor));
    return new _TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
  }
  replace(tr, content = Slice.empty) {
    super.replace(tr, content);
    if (content == Slice.empty) {
      let marks = this.$from.marksAcross(this.$to);
      if (marks)
        tr.ensureMarks(marks);
    }
  }
  eq(other) {
    return other instanceof _TextSelection && other.anchor == this.anchor && other.head == this.head;
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number" || typeof json.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new _TextSelection(doc2.resolve(json.anchor), doc2.resolve(json.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(doc2, anchor, head = anchor) {
    let $anchor = doc2.resolve(anchor);
    return new this($anchor, head == anchor ? $anchor : doc2.resolve(head));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between($anchor, $head, bias) {
    let dPos = $anchor.pos - $head.pos;
    if (!bias || dPos)
      bias = dPos >= 0 ? 1 : -1;
    if (!$head.parent.inlineContent) {
      let found = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
      if (found)
        $head = found.$head;
      else
        return Selection.near($head, bias);
    }
    if (!$anchor.parent.inlineContent) {
      if (dPos == 0) {
        $anchor = $head;
      } else {
        $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
        if ($anchor.pos < $head.pos != dPos < 0)
          $anchor = $head;
      }
    }
    return new _TextSelection($anchor, $head);
  }
};
Selection.jsonID("text", TextSelection);
var TextBookmark = class _TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new _TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc2) {
    return TextSelection.between(doc2.resolve(this.anchor), doc2.resolve(this.head));
  }
};
var NodeSelection = class _NodeSelection extends Selection {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor($pos) {
    let node = $pos.nodeAfter;
    let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }
  map(doc2, mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    let $pos = doc2.resolve(pos);
    if (deleted)
      return Selection.near($pos);
    return new _NodeSelection($pos);
  }
  content() {
    return new Slice(Fragment.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof _NodeSelection && other.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new _NodeSelection(doc2.resolve(json.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(doc2, from2) {
    return new _NodeSelection(doc2.resolve(from2));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
};
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
var NodeBookmark = class _NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    return deleted ? new TextBookmark(pos, pos) : new _NodeBookmark(pos);
  }
  resolve(doc2) {
    let $pos = doc2.resolve(this.anchor), node = $pos.nodeAfter;
    if (node && NodeSelection.isSelectable(node))
      return new NodeSelection($pos);
    return Selection.near($pos);
  }
};
var AllSelection = class _AllSelection extends Selection {
  /**
  Create an all-selection over the given document.
  */
  constructor(doc2) {
    super(doc2.resolve(0), doc2.resolve(doc2.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content == Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      let sel = Selection.atStart(tr.doc);
      if (!sel.eq(tr.selection))
        tr.setSelection(sel);
    } else {
      super.replace(tr, content);
    }
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(doc2) {
    return new _AllSelection(doc2);
  }
  map(doc2) {
    return new _AllSelection(doc2);
  }
  eq(other) {
    return other instanceof _AllSelection;
  }
  getBookmark() {
    return AllBookmark;
  }
};
Selection.jsonID("all", AllSelection);
var AllBookmark = {
  map() {
    return this;
  },
  resolve(doc2) {
    return new AllSelection(doc2);
  }
};
function findSelectionIn(doc2, node, pos, index, dir, text = false) {
  if (node.inlineContent)
    return TextSelection.create(doc2, pos);
  for (let i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
    let child = node.child(i);
    if (!child.isAtom) {
      let inner = findSelectionIn(doc2, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
      if (inner)
        return inner;
    } else if (!text && NodeSelection.isSelectable(child)) {
      return NodeSelection.create(doc2, pos - (dir < 0 ? child.nodeSize : 0));
    }
    pos += child.nodeSize * dir;
  }
  return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
  let last = tr.steps.length - 1;
  if (last < startLen)
    return;
  let step = tr.steps[last];
  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
    return;
  let map2 = tr.mapping.maps[last], end;
  map2.forEach((_from, _to, _newFrom, newTo) => {
    if (end == null)
      end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
var UPDATED_SEL = 1;
var UPDATED_MARKS = 2;
var UPDATED_SCROLL = 4;
var Transaction = class extends Transform {
  /**
  @internal
  */
  constructor(state) {
    super(state.doc);
    this.curSelectionFor = 0;
    this.updated = 0;
    this.meta = /* @__PURE__ */ Object.create(null);
    this.time = Date.now();
    this.curSelection = state.selection;
    this.storedMarks = state.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    if (this.curSelectionFor < this.steps.length) {
      this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
      this.curSelectionFor = this.steps.length;
    }
    return this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(selection) {
    if (selection.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    this.curSelection = selection;
    this.curSelectionFor = this.steps.length;
    this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
    this.storedMarks = null;
    return this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & UPDATED_SEL) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(marks) {
    this.storedMarks = marks;
    this.updated |= UPDATED_MARKS;
    return this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(marks) {
    if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
      this.setStoredMarks(marks);
    return this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(mark) {
    return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(mark) {
    return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & UPDATED_MARKS) > 0;
  }
  /**
  @internal
  */
  addStep(step, doc2) {
    super.addStep(step, doc2);
    this.updated = this.updated & ~UPDATED_MARKS;
    this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(time) {
    this.time = time;
    return this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(slice2) {
    this.selection.replace(this, slice2);
    return this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(node, inheritMarks = true) {
    let selection = this.selection;
    if (inheritMarks)
      node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark.none));
    selection.replaceWith(this, node);
    return this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    this.selection.replace(this);
    return this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(text, from2, to) {
    let schema = this.doc.type.schema;
    if (from2 == null) {
      if (!text)
        return this.deleteSelection();
      return this.replaceSelectionWith(schema.text(text), true);
    } else {
      if (to == null)
        to = from2;
      if (!text)
        return this.deleteRange(from2, to);
      let marks = this.storedMarks;
      if (!marks) {
        let $from = this.doc.resolve(from2);
        marks = to == from2 ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
      }
      this.replaceRangeWith(from2, to, schema.text(text, marks));
      if (!this.selection.empty && this.selection.to == from2 + text.length)
        this.setSelection(Selection.near(this.selection.$to));
      return this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(key, value) {
    this.meta[typeof key == "string" ? key : key.key] = value;
    return this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(key) {
    return this.meta[typeof key == "string" ? key : key.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let _ in this.meta)
      return false;
    return true;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    this.updated |= UPDATED_SCROLL;
    return this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & UPDATED_SCROLL) > 0;
  }
};
function bind(f, self) {
  return !self || !f ? f : f.bind(self);
}
var FieldDesc = class {
  constructor(name, desc, self) {
    this.name = name;
    this.init = bind(desc.init, self);
    this.apply = bind(desc.apply, self);
  }
};
var baseFields = [
  new FieldDesc("doc", {
    init(config) {
      return config.doc || config.schema.topNodeType.createAndFill();
    },
    apply(tr) {
      return tr.doc;
    }
  }),
  new FieldDesc("selection", {
    init(config, instance) {
      return config.selection || Selection.atStart(instance.doc);
    },
    apply(tr) {
      return tr.selection;
    }
  }),
  new FieldDesc("storedMarks", {
    init(config) {
      return config.storedMarks || null;
    },
    apply(tr, _marks, _old, state) {
      return state.selection.$cursor ? tr.storedMarks : null;
    }
  }),
  new FieldDesc("scrollToSelection", {
    init() {
      return 0;
    },
    apply(tr, prev) {
      return tr.scrolledIntoView ? prev + 1 : prev;
    }
  })
];
var Configuration = class {
  constructor(schema, plugins) {
    this.schema = schema;
    this.plugins = [];
    this.pluginsByKey = /* @__PURE__ */ Object.create(null);
    this.fields = baseFields.slice();
    if (plugins)
      plugins.forEach((plugin) => {
        if (this.pluginsByKey[plugin.key])
          throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
        this.plugins.push(plugin);
        this.pluginsByKey[plugin.key] = plugin;
        if (plugin.spec.state)
          this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
      });
  }
};
var EditorState = class _EditorState {
  /**
  @internal
  */
  constructor(config) {
    this.config = config;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(tr) {
    return this.applyTransaction(tr).state;
  }
  /**
  @internal
  */
  filterTransaction(tr, ignore = -1) {
    for (let i = 0; i < this.config.plugins.length; i++)
      if (i != ignore) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr, this))
          return false;
      }
    return true;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(rootTr) {
    if (!this.filterTransaction(rootTr))
      return { state: this, transactions: [] };
    let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
    for (; ; ) {
      let haveNew = false;
      for (let i = 0; i < this.config.plugins.length; i++) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.appendTransaction) {
          let n = seen ? seen[i].n : 0, oldState = seen ? seen[i].state : this;
          let tr = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
          if (tr && newState.filterTransaction(tr, i)) {
            tr.setMeta("appendedTransaction", rootTr);
            if (!seen) {
              seen = [];
              for (let j = 0; j < this.config.plugins.length; j++)
                seen.push(j < i ? { state: newState, n: trs.length } : { state: this, n: 0 });
            }
            trs.push(tr);
            newState = newState.applyInner(tr);
            haveNew = true;
          }
          if (seen)
            seen[i] = { state: newState, n: trs.length };
        }
      }
      if (!haveNew)
        return { state: newState, transactions: trs };
    }
  }
  /**
  @internal
  */
  applyInner(tr) {
    if (!tr.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let newInstance = new _EditorState(this.config), fields = this.config.fields;
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      newInstance[field.name] = field.apply(tr, this[field.name], this, newInstance);
    }
    return newInstance;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Transaction(this);
  }
  /**
  Create a new state.
  */
  static create(config) {
    let $config = new Configuration(config.doc ? config.doc.type.schema : config.schema, config.plugins);
    let instance = new _EditorState($config);
    for (let i = 0; i < $config.fields.length; i++)
      instance[$config.fields[i].name] = $config.fields[i].init(config, instance);
    return instance;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(config) {
    let $config = new Configuration(this.schema, config.plugins);
    let fields = $config.fields, instance = new _EditorState($config);
    for (let i = 0; i < fields.length; i++) {
      let name = fields[i].name;
      instance[name] = this.hasOwnProperty(name) ? this[name] : fields[i].init(config, instance);
    }
    return instance;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(pluginFields) {
    let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks)
      result.storedMarks = this.storedMarks.map((m) => m.toJSON());
    if (pluginFields && typeof pluginFields == "object")
      for (let prop in pluginFields) {
        if (prop == "doc" || prop == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let plugin = pluginFields[prop], state = plugin.spec.state;
        if (state && state.toJSON)
          result[prop] = state.toJSON.call(plugin, this[plugin.key]);
      }
    return result;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(config, json, pluginFields) {
    if (!json)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!config.schema)
      throw new RangeError("Required config field 'schema' missing");
    let $config = new Configuration(config.schema, config.plugins);
    let instance = new _EditorState($config);
    $config.fields.forEach((field) => {
      if (field.name == "doc") {
        instance.doc = Node2.fromJSON(config.schema, json.doc);
      } else if (field.name == "selection") {
        instance.selection = Selection.fromJSON(instance.doc, json.selection);
      } else if (field.name == "storedMarks") {
        if (json.storedMarks)
          instance.storedMarks = json.storedMarks.map(config.schema.markFromJSON);
      } else {
        if (pluginFields)
          for (let prop in pluginFields) {
            let plugin = pluginFields[prop], state = plugin.spec.state;
            if (plugin.key == field.name && state && state.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
              instance[field.name] = state.fromJSON.call(plugin, config, json[prop], instance);
              return;
            }
          }
        instance[field.name] = field.init(config, instance);
      }
    });
    return instance;
  }
};
function bindProps(obj, self, target) {
  for (let prop in obj) {
    let val = obj[prop];
    if (val instanceof Function)
      val = val.bind(self);
    else if (prop == "handleDOMEvents")
      val = bindProps(val, self, {});
    target[prop] = val;
  }
  return target;
}
var Plugin = class {
  /**
  Create a plugin.
  */
  constructor(spec) {
    this.spec = spec;
    this.props = {};
    if (spec.props)
      bindProps(spec.props, this, this.props);
    this.key = spec.key ? spec.key.key : createKey("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(state) {
    return state[this.key];
  }
};
var keys = /* @__PURE__ */ Object.create(null);
function createKey(name) {
  if (name in keys)
    return name + "$" + ++keys[name];
  keys[name] = 0;
  return name + "$";
}
var PluginKey = class {
  /**
  Create a plugin key.
  */
  constructor(name = "key") {
    this.key = createKey(name);
  }
  /**
  Get the active plugin with this key, if any, from an editor
  state.
  */
  get(state) {
    return state.config.pluginsByKey[this.key];
  }
  /**
  Get the plugin's state from an editor state.
  */
  getState(state) {
    return state[this.key];
  }
};

// src/react/annotation-plugin.ts
var ANNOTATION_MARK_NAME = "annotation";
var annotationIntegrityKey = new PluginKey("blockdoc-annotation-integrity");
function annotationMarksOf(node) {
  return node.marks.filter((mark) => mark.type.name === ANNOTATION_MARK_NAME);
}
function annotationIntegrityPlugin() {
  return new Plugin({
    key: annotationIntegrityKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr2) => tr2.docChanged)) {
        return null;
      }
      if (!newState.schema.marks[ANNOTATION_MARK_NAME]) {
        return null;
      }
      const tr = newState.tr;
      let changed = false;
      newState.doc.descendants((node, pos) => {
        for (const mark of annotationMarksOf(node)) {
          if (mark.attrs.id == null) {
            const markType = newState.schema.marks[ANNOTATION_MARK_NAME];
            tr.removeMark(pos, pos + node.nodeSize, mark);
            tr.addMark(
              pos,
              pos + node.nodeSize,
              markType.create({ ...mark.attrs, id: generateNodeId() })
            );
            changed = true;
          }
        }
        return true;
      });
      return changed ? tr : null;
    }
  });
}
function annotationRanges(doc2, id) {
  const ranges = [];
  doc2.descendants((node, pos) => {
    const marked = annotationMarksOf(node).some((mark) => mark.attrs.id === id);
    if (!marked) {
      return true;
    }
    const from2 = pos;
    const to = pos + node.nodeSize;
    const last = ranges[ranges.length - 1];
    if (last && last.to === from2) {
      last.to = to;
    } else {
      ranges.push({ from: from2, to });
    }
    return true;
  });
  return ranges;
}
function annotationIds(doc2) {
  const ids = /* @__PURE__ */ new Set();
  doc2.descendants((node) => {
    for (const mark of annotationMarksOf(node)) {
      if (typeof mark.attrs.id === "string") {
        ids.add(mark.attrs.id);
      }
    }
    return true;
  });
  return ids;
}

// src/react/node-id-plugin.ts
function nodeIdPlugin() {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }
      const seen = /* @__PURE__ */ new Set();
      let patch = null;
      newState.doc.descendants((node, pos) => {
        if (!(NODE_ID_ATTR in node.attrs)) {
          return true;
        }
        const id = node.attrs[NODE_ID_ATTR];
        if (typeof id !== "string" || id === "" || seen.has(id)) {
          patch = patch ?? newState.tr;
          patch.setNodeAttribute(pos, NODE_ID_ATTR, generateNodeId());
        } else {
          seen.add(id);
        }
        return true;
      });
      return patch;
    }
  });
}

// node_modules/.pnpm/@tiptap+react@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm_lohxrbqxtwg33brminwnmd7kcm/node_modules/@tiptap/react/dist/index.js
import React, { createContext, createElement, createRef, forwardRef, memo, useContext, useDebugValue as useDebugValue2, useEffect as useEffect2, useLayoutEffect, useMemo as useMemo2, useRef as useRef2, useState, version } from "react";
import ReactDOM, { flushSync } from "react-dom";

// src/shims/use-sync-external-store-shim.ts
import { useSyncExternalStore } from "react";

// node_modules/.pnpm/@tiptap+core@3.32.0_@tiptap+pm@3.32.0/node_modules/@tiptap/core/dist/rolldown-runtime-D7D4PA-g.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
  let target = {};
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
  if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
  return target;
};

// node_modules/.pnpm/prosemirror-commands@1.7.2/node_modules/prosemirror-commands/dist/index.js
var deleteSelection = (state, dispatch) => {
  if (state.selection.empty)
    return false;
  if (dispatch)
    dispatch(state.tr.deleteSelection().scrollIntoView());
  return true;
};
function atBlockStart(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
    return null;
  return $cursor;
}
var joinBackward = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutBefore($cursor);
  if (!$cut) {
    let range = $cursor.blockRange(), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  let before = $cut.nodeBefore;
  if (deleteBarrier(state, $cut, dispatch, -1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
    for (let depth = $cursor.depth; ; depth--) {
      let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty);
      if (delStep && delStep.slice.size < delStep.to - delStep.from) {
        if (dispatch) {
          let tr = state.tr.step(delStep);
          tr.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1) : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize));
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
      if (depth == 1 || $cursor.node(depth - 1).childCount > 1)
        break;
    }
  }
  if (before.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView());
    return true;
  }
  return false;
};
var joinTextblockBackward = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutBefore($cursor);
  return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
};
var joinTextblockForward = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutAfter($cursor);
  return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
};
function joinTextblocksAround(state, $cut, dispatch) {
  let before = $cut.nodeBefore, beforeText = before, beforePos = $cut.pos - 1;
  for (; !beforeText.isTextblock; beforePos--) {
    if (beforeText.type.spec.isolating)
      return false;
    let child = beforeText.lastChild;
    if (!child)
      return false;
    beforeText = child;
  }
  let after = $cut.nodeAfter, afterText = after, afterPos = $cut.pos + 1;
  for (; !afterText.isTextblock; afterPos++) {
    if (afterText.type.spec.isolating)
      return false;
    let child = afterText.firstChild;
    if (!child)
      return false;
    afterText = child;
  }
  let step = replaceStep(state.doc, beforePos, afterPos, Slice.empty);
  if (!step || step.from != beforePos || step instanceof ReplaceStep && step.slice.size >= afterPos - beforePos)
    return false;
  if (dispatch) {
    let tr = state.tr.step(step);
    tr.setSelection(TextSelection.create(tr.doc, beforePos));
    dispatch(tr.scrollIntoView());
  }
  return true;
}
function textblockAt(node, side, only = false) {
  for (let scan = node; scan; scan = side == "start" ? scan.firstChild : scan.lastChild) {
    if (scan.isTextblock)
      return true;
    if (only && scan.childCount != 1)
      return false;
  }
  return false;
}
var selectNodeBackward = (state, dispatch, view) => {
  let { $head, empty: empty2 } = state.selection, $cut = $head;
  if (!empty2)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("backward", state) : $head.parentOffset > 0)
      return false;
    $cut = findCutBefore($head);
  }
  let node = $cut && $cut.nodeBefore;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView());
  return true;
};
function findCutBefore($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      if ($pos.index(i) > 0)
        return $pos.doc.resolve($pos.before(i + 1));
      if ($pos.node(i).type.spec.isolating)
        break;
    }
  return null;
}
function atBlockEnd(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("forward", state) : $cursor.parentOffset < $cursor.parent.content.size))
    return null;
  return $cursor;
}
var joinForward = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutAfter($cursor);
  if (!$cut)
    return false;
  let after = $cut.nodeAfter;
  if (deleteBarrier(state, $cut, dispatch, 1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
    let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty);
    if (delStep && delStep.slice.size < delStep.to - delStep.from) {
      if (dispatch) {
        let tr = state.tr.step(delStep);
        tr.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1) : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos)));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  if (after.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView());
    return true;
  }
  return false;
};
var selectNodeForward = (state, dispatch, view) => {
  let { $head, empty: empty2 } = state.selection, $cut = $head;
  if (!empty2)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("forward", state) : $head.parentOffset < $head.parent.content.size)
      return false;
    $cut = findCutAfter($head);
  }
  let node = $cut && $cut.nodeAfter;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView());
  return true;
};
function findCutAfter($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      let parent = $pos.node(i);
      if ($pos.index(i) + 1 < parent.childCount)
        return $pos.doc.resolve($pos.after(i + 1));
      if (parent.type.spec.isolating)
        break;
    }
  return null;
}
var joinUp = (state, dispatch) => {
  let sel = state.selection, nodeSel = sel instanceof NodeSelection, point;
  if (nodeSel) {
    if (sel.node.isTextblock || !canJoin(state.doc, sel.from))
      return false;
    point = sel.from;
  } else {
    point = joinPoint(state.doc, sel.from, -1);
    if (point == null)
      return false;
  }
  if (dispatch) {
    let tr = state.tr.join(point);
    if (nodeSel)
      tr.setSelection(NodeSelection.create(tr.doc, point - state.doc.resolve(point).nodeBefore.nodeSize));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var joinDown = (state, dispatch) => {
  let sel = state.selection, point;
  if (sel instanceof NodeSelection) {
    if (sel.node.isTextblock || !canJoin(state.doc, sel.to))
      return false;
    point = sel.to;
  } else {
    point = joinPoint(state.doc, sel.to, 1);
    if (point == null)
      return false;
  }
  if (dispatch)
    dispatch(state.tr.join(point).scrollIntoView());
  return true;
};
var lift = (state, dispatch) => {
  let { $from, $to } = state.selection;
  let range = $from.blockRange($to), target = range && liftTarget(range);
  if (target == null)
    return false;
  if (dispatch)
    dispatch(state.tr.lift(range, target).scrollIntoView());
  return true;
};
var newlineInCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  if (dispatch)
    dispatch(state.tr.insertText("\n").scrollIntoView());
  return true;
};
function defaultBlockAt(match) {
  for (let i = 0; i < match.edgeCount; i++) {
    let { type } = match.edge(i);
    if (type.isTextblock && !type.hasRequiredAttrs())
      return type;
  }
  return null;
}
var exitCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  let above = $head.node(-1), after = $head.indexAfter(-1), type = defaultBlockAt(above.contentMatchAt(after));
  if (!type || !above.canReplaceWith(after, after, type))
    return false;
  if (dispatch) {
    let pos = $head.after(), tr = state.tr.replaceWith(pos, pos, type.createAndFill());
    tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var createParagraphNear = (state, dispatch) => {
  let sel = state.selection, { $from, $to } = sel;
  if (sel instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
    return false;
  let type = defaultBlockAt($to.parent.contentMatchAt($to.indexAfter()));
  if (!type || !type.isTextblock)
    return false;
  if (dispatch) {
    let side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos;
    let tr = state.tr.insert(side, type.createAndFill());
    tr.setSelection(TextSelection.create(tr.doc, side + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var liftEmptyBlock = (state, dispatch) => {
  let { $cursor } = state.selection;
  if (!$cursor || $cursor.parent.content.size)
    return false;
  if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
    let before = $cursor.before();
    if (canSplit(state.doc, before)) {
      if (dispatch)
        dispatch(state.tr.split(before).scrollIntoView());
      return true;
    }
  }
  let range = $cursor.blockRange(), target = range && liftTarget(range);
  if (target == null)
    return false;
  if (dispatch)
    dispatch(state.tr.lift(range, target).scrollIntoView());
  return true;
};
function splitBlockAs(splitNode) {
  return (state, dispatch) => {
    if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
      let { $from: $from2 } = state.selection;
      if (!$from2.parentOffset || !canSplit(state.doc, $from2.pos))
        return false;
      if (dispatch)
        dispatch(state.tr.split($from2.pos).scrollIntoView());
      return true;
    }
    if (!state.selection.$from.depth)
      return false;
    let tr = state.tr;
    if (!state.selection.empty && (state.selection instanceof TextSelection || state.selection instanceof AllSelection))
      tr.deleteSelection();
    let { $from } = tr.selection, mapFrom = tr.steps.length;
    let types = [];
    let splitDepth, deflt, atEnd = false, atStart = false;
    for (let d = $from.depth; ; d--) {
      let node = $from.node(d);
      if (node.isBlock) {
        atEnd = $from.end(d) == $from.pos + ($from.depth - d);
        atStart = $from.start(d) == $from.pos - ($from.depth - d);
        deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
        let splitType = splitNode && splitNode($from.parent, atEnd, $from);
        types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
        splitDepth = d;
        break;
      } else {
        if (d == 1)
          return false;
        types.unshift(null);
      }
    }
    let splitPos = $from.pos;
    let can = canSplit(tr.doc, splitPos, types.length, types);
    if (!can) {
      types[0] = deflt ? { type: deflt } : null;
      can = canSplit(tr.doc, splitPos, types.length, types);
    }
    if (!can)
      return false;
    tr.split(splitPos, types.length, types);
    if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
      let mapping = tr.mapping.slice(mapFrom);
      let first2 = mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first2);
      if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
        tr.setNodeMarkup(mapping.map($from.before(splitDepth)), deflt);
    }
    if (dispatch)
      dispatch(tr.scrollIntoView());
    return true;
  };
}
var splitBlock = splitBlockAs();
var selectParentNode = (state, dispatch) => {
  let { $from, to } = state.selection, pos;
  let same = $from.sharedDepth(to);
  if (same == 0)
    return false;
  pos = $from.before(same);
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
  return true;
};
var selectAll = (state, dispatch) => {
  if (dispatch)
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
  return true;
};
function joinMaybeClear(state, $pos, dispatch) {
  let before = $pos.nodeBefore, after = $pos.nodeAfter, index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type))
    return false;
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch)
      dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView());
    return true;
  }
  if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
    return false;
  if (dispatch)
    dispatch(state.tr.join($pos.pos).scrollIntoView());
  return true;
}
function deleteBarrier(state, $cut, dispatch, dir) {
  let before = $cut.nodeBefore, after = $cut.nodeAfter, conn, match;
  let isolated = before.type.spec.isolating || after.type.spec.isolating;
  if (!isolated && joinMaybeClear(state, $cut, dispatch))
    return true;
  let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
  if (canDelAfter && (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) && match.matchType(conn[0] || after.type).validEnd) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize, wrap = Fragment.empty;
      for (let i = conn.length - 1; i >= 0; i--)
        wrap = Fragment.from(conn[i].create(null, wrap));
      wrap = Fragment.from(before.copy(wrap));
      let tr = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap, 1, 0), conn.length, true));
      let $joinAt = tr.doc.resolve(end + 2 * conn.length);
      if ($joinAt.nodeAfter && $joinAt.nodeAfter.type == before.type && canJoin(tr.doc, $joinAt.pos))
        tr.join($joinAt.pos);
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  let selAfter = after.type.spec.isolating || dir > 0 && isolated ? null : Selection.findFrom($cut, 1);
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range);
  if (target != null && target >= $cut.depth) {
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  if (canDelAfter && textblockAt(after, "start", true) && textblockAt(before, "end")) {
    let at = before, wrap = [];
    for (; ; ) {
      wrap.push(at);
      if (at.isTextblock)
        break;
      at = at.lastChild;
    }
    let afterText = after, afterDepth = 1;
    for (; !afterText.isTextblock; afterText = afterText.firstChild)
      afterDepth++;
    if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
      if (dispatch) {
        let end = Fragment.empty;
        for (let i = wrap.length - 1; i >= 0; i--)
          end = Fragment.from(wrap[i].copy(end));
        let tr = state.tr.step(new ReplaceAroundStep($cut.pos - wrap.length, $cut.pos + after.nodeSize, $cut.pos + afterDepth, $cut.pos + after.nodeSize - afterDepth, new Slice(end, wrap.length, 0), 0, true));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  return false;
}
function selectTextblockSide(side) {
  return function(state, dispatch) {
    let sel = state.selection, $pos = side < 0 ? sel.$from : sel.$to;
    let depth = $pos.depth;
    while ($pos.node(depth).isInline) {
      if (!depth)
        return false;
      depth--;
    }
    if (!$pos.node(depth).isTextblock)
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))));
    return true;
  };
}
var selectTextblockStart = selectTextblockSide(-1);
var selectTextblockEnd = selectTextblockSide(1);
function wrapIn(nodeType, attrs = null) {
  return function(state, dispatch) {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to), wrapping = range && findWrapping(range, nodeType, attrs);
    if (!wrapping)
      return false;
    if (dispatch)
      dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    return true;
  };
}
function setBlockType(nodeType, attrs = null) {
  return function(state, dispatch) {
    let applicable = false;
    for (let i = 0; i < state.selection.ranges.length && !applicable; i++) {
      let { $from: { pos: from2 }, $to: { pos: to } } = state.selection.ranges[i];
      state.doc.nodesBetween(from2, to, (node, pos) => {
        if (applicable)
          return false;
        if (!node.isTextblock || node.hasMarkup(nodeType, attrs))
          return;
        if (node.type == nodeType) {
          applicable = true;
        } else {
          let $pos = state.doc.resolve(pos), index = $pos.index();
          applicable = $pos.parent.canReplaceWith(index, index + 1, nodeType);
        }
      });
    }
    if (!applicable)
      return false;
    if (dispatch) {
      let tr = state.tr;
      for (let i = 0; i < state.selection.ranges.length; i++) {
        let { $from: { pos: from2 }, $to: { pos: to } } = state.selection.ranges[i];
        tr.setBlockType(from2, to, nodeType, attrs);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
function chainCommands(...commands) {
  return function(state, dispatch, view) {
    for (let i = 0; i < commands.length; i++)
      if (commands[i](state, dispatch, view))
        return true;
    return false;
  };
}
var backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward);
var del = chainCommands(deleteSelection, joinForward, selectNodeForward);
var pcBaseKeymap = {
  "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
  "Mod-Enter": exitCode,
  "Backspace": backspace,
  "Mod-Backspace": backspace,
  "Shift-Backspace": backspace,
  "Delete": del,
  "Mod-Delete": del,
  "Mod-a": selectAll
};
var macBaseKeymap = {
  "Ctrl-h": pcBaseKeymap["Backspace"],
  "Alt-Backspace": pcBaseKeymap["Mod-Backspace"],
  "Ctrl-d": pcBaseKeymap["Delete"],
  "Ctrl-Alt-Backspace": pcBaseKeymap["Mod-Delete"],
  "Alt-Delete": pcBaseKeymap["Mod-Delete"],
  "Alt-d": pcBaseKeymap["Mod-Delete"],
  "Ctrl-a": selectTextblockStart,
  "Ctrl-e": selectTextblockEnd
};
for (let key in pcBaseKeymap)
  macBaseKeymap[key] = pcBaseKeymap[key];
var mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os != "undefined" && os.platform ? os.platform() == "darwin" : false;

// node_modules/.pnpm/prosemirror-schema-list@1.5.1/node_modules/prosemirror-schema-list/dist/index.js
function wrapInList(listType, attrs = null) {
  return function(state, dispatch) {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to);
    if (!range)
      return false;
    let tr = dispatch ? state.tr : null;
    if (!wrapRangeInList(tr, range, listType, attrs))
      return false;
    if (dispatch)
      dispatch(tr.scrollIntoView());
    return true;
  };
}
function wrapRangeInList(tr, range, listType, attrs = null) {
  let doJoin = false, outerRange = range, doc2 = range.$from.doc;
  if (range.depth >= 2 && range.$from.node(range.depth - 1).type.compatibleContent(listType) && range.startIndex == 0) {
    if (range.$from.index(range.depth - 1) == 0)
      return false;
    let $insert = doc2.resolve(range.start - 2);
    outerRange = new NodeRange($insert, $insert, range.depth);
    if (range.endIndex < range.parent.childCount)
      range = new NodeRange(range.$from, doc2.resolve(range.$to.end(range.depth)), range.depth);
    doJoin = true;
  }
  let wrap = findWrapping(outerRange, listType, attrs, range);
  if (!wrap)
    return false;
  if (tr)
    doWrapInList(tr, range, wrap, doJoin, listType);
  return true;
}
function doWrapInList(tr, range, wrappers, joinBefore, listType) {
  let content = Fragment.empty;
  for (let i = wrappers.length - 1; i >= 0; i--)
    content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content));
  tr.step(new ReplaceAroundStep(range.start - (joinBefore ? 2 : 0), range.end, range.start, range.end, new Slice(content, 0, 0), wrappers.length, true));
  let found = 0;
  for (let i = 0; i < wrappers.length; i++)
    if (wrappers[i].type == listType)
      found = i + 1;
  let splitDepth = wrappers.length - found;
  let splitPos = range.start + wrappers.length - (joinBefore ? 2 : 0), parent = range.parent;
  for (let i = range.startIndex, e = range.endIndex, first2 = true; i < e; i++, first2 = false) {
    if (!first2 && canSplit(tr.doc, splitPos, splitDepth)) {
      tr.split(splitPos, splitDepth);
      splitPos += 2 * splitDepth;
    }
    splitPos += parent.child(i).nodeSize;
  }
  return tr;
}
function splitListItem(itemType, itemAttrs) {
  return function(state, dispatch) {
    let { $from, $to, node } = state.selection;
    if (node && node.isBlock || $from.depth < 2 || !$from.sameParent($to))
      return false;
    let grandParent = $from.node(-1);
    if (grandParent.type != itemType)
      return false;
    if ($from.parent.content.size == 0 && $from.node(-1).childCount == $from.indexAfter(-1)) {
      if ($from.depth == 3 || $from.node(-3).type != itemType || $from.index(-2) != $from.node(-2).childCount - 1)
        return false;
      if (dispatch) {
        let wrap = Fragment.empty;
        let depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;
        for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d--)
          wrap = Fragment.from($from.node(d).copy(wrap));
        let depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;
        wrap = wrap.append(Fragment.from(itemType.createAndFill()));
        let start = $from.before($from.depth - (depthBefore - 1));
        let tr2 = state.tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));
        let sel = -1;
        tr2.doc.nodesBetween(start, tr2.doc.content.size, (node2, pos) => {
          if (sel > -1)
            return false;
          if (node2.isTextblock && node2.content.size == 0)
            sel = pos + 1;
        });
        if (sel > -1)
          tr2.setSelection(Selection.near(tr2.doc.resolve(sel)));
        dispatch(tr2.scrollIntoView());
      }
      return true;
    }
    let nextType = $to.pos == $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
    let tr = state.tr.delete($from.pos, $to.pos);
    let types = nextType ? [itemAttrs ? { type: itemType, attrs: itemAttrs } : null, { type: nextType }] : void 0;
    if (!canSplit(tr.doc, $from.pos, 2, types))
      return false;
    if (dispatch)
      dispatch(tr.split($from.pos, 2, types).scrollIntoView());
    return true;
  };
}
function liftListItem(itemType) {
  return function(state, dispatch) {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to, (node) => node.childCount > 0 && node.firstChild.type == itemType);
    if (!range)
      return false;
    if (!dispatch)
      return true;
    if ($from.node(range.depth - 1).type == itemType)
      return liftToOuterList(state, dispatch, itemType, range);
    else
      return liftOutOfList(state, dispatch, range);
  };
}
function liftToOuterList(state, dispatch, itemType, range) {
  let tr = state.tr, end = range.end, endOfList = range.$to.end(range.depth);
  if (end < endOfList) {
    tr.step(new ReplaceAroundStep(end - 1, endOfList, end, endOfList, new Slice(Fragment.from(itemType.create(null, range.parent.copy())), 1, 0), 1, true));
    range = new NodeRange(tr.doc.resolve(range.$from.pos), tr.doc.resolve(endOfList), range.depth);
  }
  const target = liftTarget(range);
  if (target == null)
    return false;
  tr.lift(range, target);
  let $after = tr.doc.resolve(tr.mapping.map(end, -1) - 1);
  if (canJoin(tr.doc, $after.pos) && $after.nodeBefore.type == $after.nodeAfter.type)
    tr.join($after.pos);
  dispatch(tr.scrollIntoView());
  return true;
}
function liftOutOfList(state, dispatch, range) {
  let tr = state.tr, list = range.parent;
  for (let pos = range.end, i = range.endIndex - 1, e = range.startIndex; i > e; i--) {
    pos -= list.child(i).nodeSize;
    tr.delete(pos - 1, pos + 1);
  }
  let $start = tr.doc.resolve(range.start), item = $start.nodeAfter;
  if (tr.mapping.map(range.end) != range.start + $start.nodeAfter.nodeSize)
    return false;
  let atStart = range.startIndex == 0, atEnd = range.endIndex == list.childCount;
  let parent = $start.node(-1), indexBefore = $start.index(-1);
  if (!parent.canReplace(indexBefore + (atStart ? 0 : 1), indexBefore + 1, item.content.append(atEnd ? Fragment.empty : Fragment.from(list))))
    return false;
  let start = $start.pos, end = start + item.nodeSize;
  tr.step(new ReplaceAroundStep(start - (atStart ? 1 : 0), end + (atEnd ? 1 : 0), start + 1, end - 1, new Slice((atStart ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))).append(atEnd ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))), atStart ? 0 : 1, atEnd ? 0 : 1), atStart ? 0 : 1));
  dispatch(tr.scrollIntoView());
  return true;
}
function sinkListItem(itemType) {
  return function(state, dispatch) {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to, (node) => node.childCount > 0 && node.firstChild.type == itemType);
    if (!range)
      return false;
    let startIndex = range.startIndex;
    if (startIndex == 0)
      return false;
    let parent = range.parent, nodeBefore = parent.child(startIndex - 1);
    if (nodeBefore.type != itemType)
      return false;
    if (dispatch) {
      let nestedBefore = nodeBefore.lastChild && nodeBefore.lastChild.type == parent.type;
      let inner = Fragment.from(nestedBefore ? itemType.create() : null);
      let slice2 = new Slice(Fragment.from(itemType.create(null, Fragment.from(parent.type.create(null, inner)))), nestedBefore ? 3 : 1, 0);
      let before = range.start, after = range.end;
      dispatch(state.tr.step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after, before, after, slice2, 1, true)).scrollIntoView());
    }
    return true;
  };
}

// node_modules/.pnpm/prosemirror-view@1.42.6/node_modules/prosemirror-view/dist/index.js
var domIndex = function(node) {
  for (var index = 0; ; index++) {
    node = node.previousSibling;
    if (!node)
      return index;
  }
};
var parentNode = function(node) {
  let parent = node.assignedSlot || node.parentNode;
  return parent && parent.nodeType == 11 ? parent.host : parent;
};
var reusedRange = null;
var textRange = function(node, from2, to) {
  let range = reusedRange || (reusedRange = document.createRange());
  range.setEnd(node, to == null ? node.nodeValue.length : to);
  range.setStart(node, from2 || 0);
  return range;
};
var clearReusedRange = function() {
  reusedRange = null;
};
var isEquivalentPosition = function(node, off, targetNode, targetOff) {
  return targetNode && (scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1));
};
var atomElements = /^(img|br|input|textarea|hr)$/i;
function scanFor(node, off, targetNode, targetOff, dir) {
  var _a;
  for (; ; ) {
    if (node == targetNode && off == targetOff)
      return true;
    if (off == (dir < 0 ? 0 : nodeSize(node))) {
      let parent = node.parentNode;
      if (!parent || !isElt(parent) || hasBlockDesc(node) || atomElements.test(node.nodeName) || node.contentEditable == "false")
        return false;
      off = domIndex(node) + (dir < 0 ? 0 : 1);
      node = parent;
    } else if (isElt(node)) {
      let child = node.childNodes[off + (dir < 0 ? -1 : 0)];
      if (isElt(child) && child.contentEditable == "false") {
        if ((_a = child.pmViewDesc) === null || _a === void 0 ? void 0 : _a.ignoreForSelection)
          off += dir;
        else
          return false;
      } else {
        node = child;
        off = dir < 0 ? nodeSize(node) : 0;
      }
    } else {
      return false;
    }
  }
}
function nodeSize(node) {
  return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
function isElt(node) {
  return node.nodeType == 1;
}
function isText(node) {
  return node.nodeType == 3;
}
function contains(parent, child) {
  return child ? parent.contains(isElt(child) ? child : child.parentNode) : false;
}
function textNodeBefore$1(node, offset3) {
  for (; ; ) {
    if (isText(node) && offset3)
      return node;
    if (isElt(node) && offset3 > 0) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset3 - 1];
      offset3 = nodeSize(node);
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset3 = domIndex(node);
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function textNodeAfter$1(node, offset3) {
  for (; ; ) {
    if (isText(node) && offset3 < node.nodeValue.length)
      return node;
    if (isElt(node) && offset3 < node.childNodes.length) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset3];
      offset3 = 0;
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset3 = domIndex(node) + 1;
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function isOnEdge(node, offset3, parent) {
  for (let atStart = offset3 == 0, atEnd = offset3 == nodeSize(node); atStart || atEnd; ) {
    if (node == parent)
      return true;
    let index = domIndex(node);
    node = node.parentNode;
    if (!node)
      return false;
    atStart = atStart && index == 0;
    atEnd = atEnd && index == nodeSize(node);
  }
}
function hasBlockDesc(dom) {
  let desc;
  for (let cur = dom; cur; cur = cur.parentNode)
    if (desc = cur.pmViewDesc)
      break;
  return desc && desc.node && desc.node.isBlock && (desc.dom == dom || desc.contentDOM == dom);
}
var selectionCollapsed = function(domSel) {
  return domSel.focusNode && isEquivalentPosition(domSel.focusNode, domSel.focusOffset, domSel.anchorNode, domSel.anchorOffset);
};
function keyEvent(keyCode, key) {
  let event = document.createEvent("Event");
  event.initEvent("keydown", true, true);
  event.keyCode = keyCode;
  event.key = event.code = key;
  return event;
}
function deepActiveElement(doc2) {
  let elt = doc2.activeElement;
  while (elt && elt.shadowRoot)
    elt = elt.shadowRoot.activeElement;
  return elt;
}
function caretFromPoint(doc2, x, y) {
  if (doc2.caretPositionFromPoint) {
    try {
      let pos = doc2.caretPositionFromPoint(x, y);
      if (pos)
        return { node: pos.offsetNode, offset: Math.min(nodeSize(pos.offsetNode), pos.offset) };
    } catch (_) {
    }
  }
  if (doc2.caretRangeFromPoint) {
    let range = doc2.caretRangeFromPoint(x, y);
    if (range)
      return { node: range.startContainer, offset: Math.min(nodeSize(range.startContainer), range.startOffset) };
  }
}
var nav = typeof navigator != "undefined" ? navigator : null;
var doc = typeof document != "undefined" ? document : null;
var agent = nav && nav.userAgent || "";
var ie_edge = /Edge\/(\d+)/.exec(agent);
var ie_upto10 = /MSIE \d/.exec(agent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(agent);
var ie = !!(ie_upto10 || ie_11up || ie_edge);
var ie_version = ie_upto10 ? document.documentMode : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0;
var gecko = !ie && /gecko\/(\d+)/i.test(agent);
gecko && +(/Firefox\/(\d+)/.exec(agent) || [0, 0])[1];
var _chrome = !ie && /Chrome\/(\d+)/.exec(agent);
var chrome = !!_chrome;
var chrome_version = _chrome ? +_chrome[1] : 0;
var safari = !ie && !!nav && /Apple Computer/.test(nav.vendor);
var ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2);
var mac2 = ios || (nav ? /Mac/.test(nav.platform) : false);
var windows = nav ? /Win/.test(nav.platform) : false;
var android = /Android \d/.test(agent);
var webkit = !!doc && "webkitFontSmoothing" in doc.documentElement.style;
var webkit_version = webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function windowRect(doc2) {
  let vp = doc2.defaultView && doc2.defaultView.visualViewport;
  if (vp)
    return {
      left: 0,
      right: vp.width,
      top: 0,
      bottom: vp.height
    };
  return {
    left: 0,
    right: doc2.documentElement.clientWidth,
    top: 0,
    bottom: doc2.documentElement.clientHeight
  };
}
function getSide(value, side) {
  return typeof value == "number" ? value : value[side];
}
function clientRect(node) {
  let rect = node.getBoundingClientRect();
  let scaleX = rect.width / node.offsetWidth || 1;
  let scaleY = rect.height / node.offsetHeight || 1;
  return {
    left: rect.left,
    right: rect.left + node.clientWidth * scaleX,
    top: rect.top,
    bottom: rect.top + node.clientHeight * scaleY
  };
}
function scrollRectIntoView(view, rect, startDOM) {
  if (!nonZero(rect) && rect.left == 0)
    return;
  let scrollThreshold = view.someProp("scrollThreshold") || 0, scrollMargin = view.someProp("scrollMargin") || 5;
  let doc2 = view.dom.ownerDocument;
  for (let parent = startDOM || view.dom; ; ) {
    if (!parent)
      break;
    if (!isElt(parent)) {
      parent = parentNode(parent);
      continue;
    }
    let atTop = parent == doc2.body;
    let bounding = atTop ? windowRect(doc2) : clientRect(parent);
    let moveX = 0, moveY = 0;
    if (rect.top < bounding.top + getSide(scrollThreshold, "top"))
      moveY = -(bounding.top - rect.top + getSide(scrollMargin, "top"));
    else if (rect.bottom > bounding.bottom - getSide(scrollThreshold, "bottom"))
      moveY = rect.bottom - rect.top > bounding.bottom - bounding.top ? rect.top + getSide(scrollMargin, "top") - bounding.top : rect.bottom - bounding.bottom + getSide(scrollMargin, "bottom");
    if (rect.left < bounding.left + getSide(scrollThreshold, "left"))
      moveX = -(bounding.left - rect.left + getSide(scrollMargin, "left"));
    else if (rect.right > bounding.right - getSide(scrollThreshold, "right"))
      moveX = rect.right - bounding.right + getSide(scrollMargin, "right");
    if (moveX || moveY) {
      if (atTop) {
        doc2.defaultView.scrollBy(moveX, moveY);
      } else {
        let startX = parent.scrollLeft, startY = parent.scrollTop;
        if (moveY)
          parent.scrollTop += moveY;
        if (moveX)
          parent.scrollLeft += moveX;
        let dX = parent.scrollLeft - startX, dY = parent.scrollTop - startY;
        rect = { left: rect.left - dX, top: rect.top - dY, right: rect.right - dX, bottom: rect.bottom - dY };
      }
    }
    let pos = atTop ? "fixed" : getComputedStyle(parent).position;
    if (/^(fixed|sticky)$/.test(pos))
      break;
    parent = pos == "absolute" ? parent.offsetParent : parentNode(parent);
  }
}
function storeScrollPos(view) {
  let rect = view.dom.getBoundingClientRect(), startY = Math.max(0, rect.top);
  let refDOM, refTop;
  for (let x = (rect.left + rect.right) / 2, y = startY + 1; y < Math.min(innerHeight, rect.bottom); y += 5) {
    let dom = view.root.elementFromPoint(x, y);
    if (!dom || dom == view.dom || !view.dom.contains(dom))
      continue;
    let localRect = dom.getBoundingClientRect();
    if (localRect.top >= startY - 20) {
      refDOM = dom;
      refTop = localRect.top;
      break;
    }
  }
  return { refDOM, refTop, stack: scrollStack(view.dom) };
}
function scrollStack(dom) {
  let stack = [], doc2 = dom.ownerDocument;
  for (let cur = dom; cur; cur = parentNode(cur)) {
    stack.push({ dom: cur, top: cur.scrollTop, left: cur.scrollLeft });
    if (dom == doc2)
      break;
  }
  return stack;
}
function resetScrollPos({ refDOM, refTop, stack }) {
  let newRefTop = refDOM ? refDOM.getBoundingClientRect().top : 0;
  restoreScrollStack(stack, newRefTop == 0 ? 0 : newRefTop - refTop);
}
function restoreScrollStack(stack, dTop) {
  for (let i = 0; i < stack.length; i++) {
    let { dom, top, left } = stack[i];
    if (dom.scrollTop != top + dTop)
      dom.scrollTop = top + dTop;
    if (dom.scrollLeft != left)
      dom.scrollLeft = left;
  }
}
var preventScrollSupported = null;
function focusPreventScroll(dom) {
  if (dom.setActive)
    return dom.setActive();
  if (preventScrollSupported)
    return dom.focus(preventScrollSupported);
  let stored = scrollStack(dom);
  dom.focus(preventScrollSupported == null ? {
    get preventScroll() {
      preventScrollSupported = { preventScroll: true };
      return true;
    }
  } : void 0);
  if (!preventScrollSupported) {
    preventScrollSupported = false;
    restoreScrollStack(stored, 0);
  }
}
function findOffsetInNode(node, coords) {
  let closest;
  let dxClosest = 2e8, coordsClosest, offset3 = 0;
  let rowBot = coords.top, rowTop = coords.top;
  let firstBelow, coordsBelow;
  for (let child = node.firstChild, childIndex = 0; child; child = child.nextSibling, childIndex++) {
    let rects;
    if (isElt(child))
      rects = child.getClientRects();
    else if (isText(child))
      rects = textRange(child).getClientRects();
    else
      continue;
    for (let i = 0; i < rects.length; i++) {
      let rect = rects[i];
      if (rect.top <= rowBot && rect.bottom >= rowTop) {
        rowBot = Math.max(rect.bottom, rowBot);
        rowTop = Math.min(rect.top, rowTop);
        let dx = rect.left > coords.left ? rect.left - coords.left : rect.right < coords.left ? coords.left - rect.right : 0;
        if (dx < dxClosest) {
          closest = child;
          dxClosest = dx;
          coordsClosest = dx && isText(closest) ? {
            left: rect.right < coords.left ? rect.right : rect.left,
            top: coords.top
          } : coords;
          if (isElt(child) && dx)
            offset3 = childIndex + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
          continue;
        }
      } else if (rect.top > coords.top && !firstBelow && rect.left <= coords.left && rect.right >= coords.left) {
        firstBelow = child;
        coordsBelow = { left: Math.max(rect.left, Math.min(rect.right, coords.left)), top: rect.top };
      }
      if (!closest && (coords.left >= rect.right && coords.top >= rect.top || coords.left >= rect.left && coords.top >= rect.bottom))
        offset3 = childIndex + 1;
    }
  }
  if (!closest && firstBelow) {
    closest = firstBelow;
    coordsClosest = coordsBelow;
    dxClosest = 0;
  }
  if (closest && isText(closest))
    return findOffsetInText(closest, coordsClosest);
  if (!closest || dxClosest)
    return { node, offset: offset3 };
  return findOffsetInNode(closest, coordsClosest);
}
function findOffsetInText(node, coords) {
  let len = node.nodeValue.length;
  let range = document.createRange(), result;
  for (let i = 0; i < len; i++) {
    range.setEnd(node, i + 1);
    range.setStart(node, i);
    let rect = singleRect(range, 1);
    if (rect.top == rect.bottom)
      continue;
    if (inRect(coords, rect)) {
      result = { node, offset: i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
      break;
    }
  }
  range.detach();
  return result || { node, offset: 0 };
}
function inRect(coords, rect) {
  return coords.left >= rect.left - 1 && coords.left <= rect.right + 1 && coords.top >= rect.top - 1 && coords.top <= rect.bottom + 1;
}
function targetKludge(dom, coords) {
  let parent = dom.parentNode;
  if (parent && /^li$/i.test(parent.nodeName) && coords.left < dom.getBoundingClientRect().left)
    return parent;
  return dom;
}
function posFromElement(view, elt, coords) {
  let { node, offset: offset3 } = findOffsetInNode(elt, coords), bias = -1;
  if (isElt(node) && !node.firstChild) {
    let rect = node.getBoundingClientRect();
    bias = rect.left != rect.right && coords.left > (rect.left + rect.right) / 2 ? 1 : -1;
  }
  return view.docView.posFromDOM(node, offset3, bias);
}
function posFromCaret(view, node, offset3, coords) {
  let outsideBlock = -1;
  for (let cur = node, sawBlock = false; ; ) {
    if (cur == view.dom)
      break;
    let desc = view.docView.nearestDesc(cur, true), rect;
    if (!desc)
      return null;
    if (isElt(desc.dom) && (desc.node.isBlock && desc.parent || !desc.contentDOM) && // Ignore elements with zero-size bounding rectangles
    ((rect = desc.dom.getBoundingClientRect()).width || rect.height)) {
      if (desc.node.isBlock && desc.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(desc.dom.nodeName)) {
        if (!sawBlock && rect.left > coords.left || rect.top > coords.top)
          outsideBlock = desc.posBefore;
        else if (!sawBlock && rect.right < coords.left || rect.bottom < coords.top)
          outsideBlock = desc.posAfter;
        sawBlock = true;
      }
      if (!desc.contentDOM && outsideBlock < 0 && !desc.node.isText) {
        let before = desc.node.isBlock ? coords.top < (rect.top + rect.bottom) / 2 : coords.left < (rect.left + rect.right) / 2;
        return before ? desc.posBefore : desc.posAfter;
      }
    }
    cur = desc.dom.parentNode;
  }
  return outsideBlock > -1 ? outsideBlock : view.docView.posFromDOM(node, offset3, -1);
}
function elementFromPoint(element, coords, box) {
  let len = element.childNodes.length;
  if (len && box.top < box.bottom) {
    for (let startI = Math.max(0, Math.min(len - 1, Math.floor(len * (coords.top - box.top) / (box.bottom - box.top)) - 2)), i = startI; ; ) {
      let child = element.childNodes[i];
      if (isElt(child)) {
        let rects = child.getClientRects();
        for (let j = 0; j < rects.length; j++) {
          let rect = rects[j];
          if (inRect(coords, rect))
            return elementFromPoint(child, coords, rect);
        }
      }
      if ((i = (i + 1) % len) == startI)
        break;
    }
  }
  return element;
}
function posAtCoords(view, coords) {
  let doc2 = view.dom.ownerDocument, node, offset3 = 0;
  let caret = caretFromPoint(doc2, coords.left, coords.top);
  if (caret)
    ({ node, offset: offset3 } = caret);
  let elt = (view.root.elementFromPoint ? view.root : doc2).elementFromPoint(coords.left, coords.top);
  let pos;
  if (!elt || !view.dom.contains(elt)) {
    let box = view.dom.getBoundingClientRect();
    if (!inRect(coords, box))
      return null;
    elt = elementFromPoint(view.dom, coords, box);
    if (!elt)
      return null;
  }
  if (safari) {
    for (let p = elt; node && p; p = parentNode(p))
      if (p.draggable)
        node = void 0;
  }
  elt = targetKludge(elt, coords);
  if (node) {
    if (gecko && isElt(node)) {
      offset3 = Math.min(offset3, node.childNodes.length);
      if (offset3 < node.childNodes.length) {
        let next = node.childNodes[offset3], box;
        if (next.nodeName == "IMG" && (box = next.getBoundingClientRect()).right <= coords.left && box.bottom > coords.top)
          offset3++;
      }
    }
    let prev;
    if (webkit && offset3 && isElt(node) && isElt(prev = node.childNodes[offset3 - 1]) && prev.contentEditable == "false" && prev.getBoundingClientRect().top >= coords.top)
      offset3--;
    if (node == view.dom && offset3 == node.childNodes.length - 1 && isElt(node.lastChild) && coords.top > node.lastChild.getBoundingClientRect().bottom)
      pos = view.state.doc.content.size;
    else if (offset3 == 0 || !isElt(node) || node.childNodes[offset3 - 1].nodeName != "BR")
      pos = posFromCaret(view, node, offset3, coords);
  }
  if (pos == null)
    pos = posFromElement(view, elt, coords);
  let desc = view.docView.nearestDesc(elt, true);
  return { pos, inside: desc ? desc.posAtStart - desc.border : -1 };
}
function nonZero(rect) {
  return rect.top < rect.bottom || rect.left < rect.right;
}
function singleRect(target, bias) {
  let rects = target.getClientRects();
  if (rects.length) {
    let first2 = rects[bias < 0 ? 0 : rects.length - 1];
    if (nonZero(first2))
      return first2;
  }
  return Array.prototype.find.call(rects, nonZero) || target.getBoundingClientRect();
}
var BIDI = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function coordsAtPos(view, pos, side) {
  let { node, offset: offset3, atom } = view.docView.domFromPos(pos, side < 0 ? -1 : 1);
  let supportEmptyRange = webkit || gecko;
  if (isText(node)) {
    if (supportEmptyRange && (BIDI.test(node.nodeValue) || (side < 0 ? !offset3 : offset3 == node.nodeValue.length))) {
      let rect = singleRect(textRange(node, offset3, offset3), side);
      if (gecko && offset3 && /\s/.test(node.nodeValue[offset3 - 1]) && offset3 < node.nodeValue.length) {
        let rectBefore = singleRect(textRange(node, offset3 - 1, offset3 - 1), -1);
        if (rectBefore.top == rect.top) {
          let rectAfter = singleRect(textRange(node, offset3, offset3 + 1), -1);
          if (rectAfter.top != rect.top)
            return flattenV(rectAfter, rectAfter.left < rectBefore.left);
        }
      }
      return rect;
    } else {
      let from2 = offset3, to = offset3, takeSide = side < 0 ? 1 : -1;
      if (side < 0 && !offset3) {
        to++;
        takeSide = -1;
      } else if (side >= 0 && offset3 == node.nodeValue.length) {
        from2--;
        takeSide = 1;
      } else if (side < 0) {
        from2--;
      } else {
        to++;
      }
      return flattenV(singleRect(textRange(node, from2, to), takeSide), takeSide < 0);
    }
  }
  let $dom = view.state.doc.resolve(pos - (atom || 0));
  if (!$dom.parent.inlineContent) {
    if (atom == null && offset3 && (side < 0 || offset3 == nodeSize(node))) {
      let before = node.childNodes[offset3 - 1];
      if (isElt(before))
        return flattenH(before.getBoundingClientRect(), false);
    }
    if (atom == null && offset3 < nodeSize(node)) {
      let after = node.childNodes[offset3];
      if (isElt(after))
        return flattenH(after.getBoundingClientRect(), true);
    }
    return flattenH(node.getBoundingClientRect(), side >= 0);
  }
  if (atom == null && offset3 && (side < 0 || offset3 == nodeSize(node))) {
    let before = node.childNodes[offset3 - 1];
    let target = isText(before) ? textRange(before, nodeSize(before) - (supportEmptyRange ? 0 : 1)) : isElt(before) && (before.nodeName != "BR" || !before.nextSibling) ? before : null;
    if (target)
      return flattenV(singleRect(target, 1), false);
  }
  if (atom == null && offset3 < nodeSize(node)) {
    let after = node.childNodes[offset3];
    while (after.pmViewDesc && after.pmViewDesc.ignoreForCoords)
      after = after.nextSibling;
    let target = !after ? null : isText(after) ? textRange(after, 0, supportEmptyRange ? 0 : 1) : isElt(after) ? after : null;
    if (target)
      return flattenV(singleRect(target, -1), true);
  }
  return flattenV(singleRect(isText(node) ? textRange(node) : node, -side), side >= 0);
}
function flattenV(rect, left) {
  if (rect.width == 0)
    return rect;
  let x = left ? rect.left : rect.right;
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}
function flattenH(rect, top) {
  if (rect.height == 0)
    return rect;
  let y = top ? rect.top : rect.bottom;
  return { top: y, bottom: y, left: rect.left, right: rect.right };
}
function withFlushedState(view, state, f) {
  let viewState = view.state, active = view.root.activeElement;
  if (viewState != state)
    view.updateState(state);
  if (active != view.dom)
    view.focus();
  try {
    return f();
  } finally {
    if (viewState != state)
      view.updateState(viewState);
    if (active != view.dom && active)
      active.focus();
  }
}
function endOfTextblockVertical(view, state, dir) {
  let sel = state.selection;
  let $pos = dir == "up" ? sel.$from : sel.$to;
  return withFlushedState(view, state, () => {
    let { node: dom } = view.docView.domFromPos($pos.pos, dir == "up" ? -1 : 1);
    for (; ; ) {
      let nearest = view.docView.nearestDesc(dom, true);
      if (!nearest)
        break;
      if (nearest.node.isBlock) {
        dom = nearest.contentDOM || nearest.dom;
        break;
      }
      dom = nearest.dom.parentNode;
    }
    let coords = coordsAtPos(view, $pos.pos, 1);
    for (let child = dom.firstChild; child; child = child.nextSibling) {
      let boxes;
      if (isElt(child))
        boxes = child.getClientRects();
      else if (isText(child))
        boxes = textRange(child, 0, child.nodeValue.length).getClientRects();
      else
        continue;
      for (let i = 0; i < boxes.length; i++) {
        let box = boxes[i];
        if (box.bottom > box.top + 1 && (dir == "up" ? coords.top - box.top > (box.bottom - coords.top) * 2 : box.bottom - coords.bottom > (coords.bottom - box.top) * 2))
          return false;
      }
    }
    return true;
  });
}
var maybeRTL = /[\u0590-\u08ac]/;
function endOfTextblockHorizontal(view, state, dir) {
  let { $head } = state.selection;
  if (!$head.parent.isTextblock)
    return false;
  let offset3 = $head.parentOffset, atStart = !offset3, atEnd = offset3 == $head.parent.content.size;
  let sel = view.domSelection();
  if (!sel)
    return $head.pos == $head.start() || $head.pos == $head.end();
  if (!maybeRTL.test($head.parent.textContent) || !sel.modify)
    return dir == "left" || dir == "backward" ? atStart : atEnd;
  return withFlushedState(view, state, () => {
    let { focusNode: oldNode, focusOffset: oldOff, anchorNode, anchorOffset } = view.domSelectionRange();
    let oldBidiLevel = sel.caretBidiLevel;
    sel.modify("move", dir, "character");
    let parentDOM = $head.depth ? view.docView.domAfterPos($head.before()) : view.dom;
    let { focusNode: newNode, focusOffset: newOff } = view.domSelectionRange();
    let result = newNode && !contains(parentDOM, newNode) || oldNode == newNode && oldOff == newOff;
    try {
      sel.collapse(anchorNode, anchorOffset);
      if (oldNode && (oldNode != anchorNode || oldOff != anchorOffset) && sel.extend)
        sel.extend(oldNode, oldOff);
    } catch (_) {
    }
    if (oldBidiLevel != null)
      sel.caretBidiLevel = oldBidiLevel;
    return result;
  });
}
var cachedState = null;
var cachedDir = null;
var cachedResult = false;
function endOfTextblock(view, state, dir) {
  if (cachedState == state && cachedDir == dir)
    return cachedResult;
  cachedState = state;
  cachedDir = dir;
  return cachedResult = dir == "up" || dir == "down" ? endOfTextblockVertical(view, state, dir) : endOfTextblockHorizontal(view, state, dir);
}
var NOT_DIRTY = 0;
var CHILD_DIRTY = 1;
var CONTENT_DIRTY = 2;
var NODE_DIRTY = 3;
var ViewDesc = class {
  constructor(parent, children, dom, contentDOM) {
    this.parent = parent;
    this.children = children;
    this.dom = dom;
    this.contentDOM = contentDOM;
    this.dirty = NOT_DIRTY;
    dom.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(widget) {
    return false;
  }
  matchesMark(mark) {
    return false;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return false;
  }
  matchesHack(nodeName) {
    return false;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule(addedNodes) {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(event) {
    return false;
  }
  // The size of the content represented by this desc.
  get size() {
    let size3 = 0;
    for (let i = 0; i < this.children.length; i++)
      size3 += this.children[i].size;
    return size3;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0;
    if (this.dom.pmViewDesc == this)
      this.dom.pmViewDesc = void 0;
    for (let i = 0; i < this.children.length; i++)
      this.children[i].destroy();
  }
  posBeforeChild(child) {
    for (let i = 0, pos = this.posAtStart; ; i++) {
      let cur = this.children[i];
      if (cur == child)
        return pos;
      pos += cur.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(dom, offset3, bias) {
    if (this.contentDOM && contains(this.contentDOM, dom)) {
      if (bias < 0) {
        let domBefore, desc;
        if (dom == this.contentDOM) {
          domBefore = dom.childNodes[offset3 - 1];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domBefore = dom.previousSibling;
        }
        while (domBefore && !((desc = domBefore.pmViewDesc) && desc.parent == this))
          domBefore = domBefore.previousSibling;
        return domBefore ? this.posBeforeChild(desc) + desc.size : this.posAtStart;
      } else {
        let domAfter, desc;
        if (dom == this.contentDOM) {
          domAfter = dom.childNodes[offset3];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domAfter = dom.nextSibling;
        }
        while (domAfter && !((desc = domAfter.pmViewDesc) && desc.parent == this))
          domAfter = domAfter.nextSibling;
        return domAfter ? this.posBeforeChild(desc) : this.posAtEnd;
      }
    }
    let atEnd;
    if (dom == this.dom && this.contentDOM) {
      atEnd = offset3 > domIndex(this.contentDOM);
    } else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) {
      atEnd = !!(dom.compareDocumentPosition(this.contentDOM) & 4);
    } else if (this.dom.firstChild) {
      if (offset3 == 0)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = false;
            break;
          }
          if (search.previousSibling)
            break;
        }
      if (atEnd == null && offset3 == dom.childNodes.length)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = true;
            break;
          }
          if (search.nextSibling)
            break;
        }
    }
    return (atEnd == null ? bias > 0 : atEnd) ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(dom, onlyNodes = false) {
    for (let first2 = true, cur = dom; cur; cur = cur.parentNode) {
      let desc = this.getDesc(cur), nodeDOM2;
      if (desc && (!onlyNodes || desc.node)) {
        if (first2 && (nodeDOM2 = desc.nodeDOM) && !(isElt(nodeDOM2) ? contains(nodeDOM2, dom) : nodeDOM2 == dom))
          first2 = false;
        else
          return desc;
      }
    }
  }
  getDesc(dom) {
    let desc = dom.pmViewDesc;
    for (let cur = desc; cur; cur = cur.parent)
      if (cur == this)
        return desc;
  }
  posFromDOM(dom, offset3, bias) {
    for (let scan = dom; scan; scan = scan.parentNode) {
      let desc = this.getDesc(scan);
      if (desc)
        return desc.localPosFromDOM(dom, offset3, bias);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(pos) {
    for (let i = 0, offset3 = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset3 + child.size;
      if (offset3 == pos && end != offset3) {
        while (!child.border && child.children.length) {
          for (let i2 = 0; i2 < child.children.length; i2++) {
            let inner = child.children[i2];
            if (inner.size) {
              child = inner;
              break;
            }
          }
        }
        return child;
      }
      if (pos < end)
        return child.descAt(pos - offset3 - child.border);
      offset3 = end;
    }
  }
  domFromPos(pos, side) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: pos + 1 };
    let i = 0, offset3 = 0;
    for (let curPos = 0; i < this.children.length; i++) {
      let child = this.children[i], end = curPos + child.size;
      if (end > pos) {
        offset3 = pos - curPos;
        break;
      }
      curPos = end;
    }
    if (offset3)
      return this.children[i].domFromPos(offset3 - this.children[i].border, side);
    for (; i > 0; i--) {
      let prev = this.children[i - 1];
      if (prev.size || !(prev instanceof BufferHackViewDesc || prev instanceof WidgetViewDesc && prev.side >= 0))
        break;
    }
    if (side <= 0) {
      let prev, enter2 = true;
      for (; ; i--, enter2 = false) {
        prev = i ? this.children[i - 1] : null;
        if (!prev || prev.dom.parentNode == this.contentDOM)
          break;
      }
      if (prev && side && enter2 && !prev.border && !prev.domAtom)
        return prev.domFromPos(prev.size, side);
      return { node: this.contentDOM, offset: prev ? domIndex(prev.dom) + 1 : 0 };
    } else {
      let next, enter2 = true;
      for (; ; i++, enter2 = false) {
        next = i < this.children.length ? this.children[i] : null;
        if (!next || next.dom.parentNode == this.contentDOM)
          break;
      }
      if (next && enter2 && !next.border && !next.domAtom)
        return next.domFromPos(0, side);
      return { node: this.contentDOM, offset: next ? domIndex(next.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(from2, to, base2 = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: from2, to, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let fromOffset = -1, toOffset = -1;
    for (let offset3 = base2, i = 0; ; i++) {
      let child = this.children[i], end = offset3 + child.size;
      if (fromOffset == -1 && from2 <= end) {
        let childBase = offset3 + child.border;
        if (from2 >= childBase && to <= end - child.border && child.node && child.contentDOM && this.contentDOM.contains(child.contentDOM))
          return child.parseRange(from2, to, childBase);
        from2 = offset3;
        for (let j = i; j > 0; j--) {
          let prev = this.children[j - 1];
          if (prev.size && prev.dom.parentNode == this.contentDOM && !prev.emptyChildAt(1)) {
            fromOffset = domIndex(prev.dom) + 1;
            break;
          }
          from2 -= prev.size;
        }
        if (fromOffset == -1)
          fromOffset = 0;
      }
      if (fromOffset > -1 && (end > to || i == this.children.length - 1)) {
        to = end;
        for (let j = i + 1; j < this.children.length; j++) {
          let next = this.children[j];
          if (next.size && next.dom.parentNode == this.contentDOM && !next.emptyChildAt(-1)) {
            toOffset = domIndex(next.dom);
            break;
          }
          to += next.size;
        }
        if (toOffset == -1)
          toOffset = this.contentDOM.childNodes.length;
        break;
      }
      offset3 = end;
    }
    return { node: this.contentDOM, from: from2, to, fromOffset, toOffset };
  }
  emptyChildAt(side) {
    if (this.border || !this.contentDOM || !this.children.length)
      return false;
    let child = this.children[side < 0 ? 0 : this.children.length - 1];
    return child.size == 0 || child.emptyChildAt(side);
  }
  domAfterPos(pos) {
    let { node, offset: offset3 } = this.domFromPos(pos, 0);
    if (!isElt(node) || offset3 == node.childNodes.length)
      throw new RangeError("No node after pos " + pos);
    return node.childNodes[offset3];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(anchor, head, view, force = false) {
    let from2 = Math.min(anchor, head), to = Math.max(anchor, head);
    for (let i = 0, offset3 = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset3 + child.size;
      if (from2 > offset3 && to < end)
        return child.setSelection(anchor - offset3 - child.border, head - offset3 - child.border, view, force);
      offset3 = end;
    }
    let anchorDOM = this.domFromPos(anchor, anchor ? -1 : 1);
    let headDOM = head == anchor ? anchorDOM : this.domFromPos(head, head ? -1 : 1);
    let domSel = view.root.getSelection();
    let selRange = view.domSelectionRange();
    let brKludge = false;
    if ((gecko || safari) && anchor == head) {
      let { node, offset: offset3 } = anchorDOM;
      if (isText(node)) {
        brKludge = !!(offset3 && node.nodeValue[offset3 - 1] == "\n");
        if (brKludge && offset3 == node.nodeValue.length) {
          for (let scan = node, after; scan; scan = scan.parentNode) {
            if (after = scan.nextSibling) {
              if (after.nodeName == "BR")
                anchorDOM = headDOM = { node: after.parentNode, offset: domIndex(after) + 1 };
              break;
            }
            let desc = scan.pmViewDesc;
            if (desc && desc.node && desc.node.isBlock)
              break;
          }
        }
      } else {
        let prev = node.childNodes[offset3 - 1];
        brKludge = prev && (prev.nodeName == "BR" || prev.contentEditable == "false");
      }
    }
    if (gecko && selRange.focusNode && selRange.focusNode != headDOM.node && isElt(selRange.focusNode)) {
      let after = selRange.focusNode.childNodes[selRange.focusOffset];
      if (after && after.contentEditable == "false")
        force = true;
    }
    if (!(force || brKludge && safari) && isEquivalentPosition(anchorDOM.node, anchorDOM.offset, selRange.anchorNode, selRange.anchorOffset) && isEquivalentPosition(headDOM.node, headDOM.offset, selRange.focusNode, selRange.focusOffset))
      return;
    let domSelExtended = false;
    if ((domSel.extend || anchor == head) && !(brKludge && gecko)) {
      domSel.collapse(anchorDOM.node, anchorDOM.offset);
      try {
        if (anchor != head)
          domSel.extend(headDOM.node, headDOM.offset);
        domSelExtended = true;
      } catch (_) {
      }
    }
    if (!domSelExtended) {
      if (anchor > head) {
        let tmp = anchorDOM;
        anchorDOM = headDOM;
        headDOM = tmp;
      }
      let range = document.createRange();
      range.setEnd(headDOM.node, headDOM.offset);
      range.setStart(anchorDOM.node, anchorDOM.offset);
      domSel.removeAllRanges();
      domSel.addRange(range);
    }
  }
  ignoreMutation(mutation) {
    return !this.contentDOM && mutation.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(from2, to) {
    for (let offset3 = 0, i = 0; i < this.children.length; i++) {
      let child = this.children[i], end = offset3 + child.size;
      if (offset3 == end ? from2 <= end && to >= offset3 : from2 < end && to > offset3) {
        let startInside = offset3 + child.border, endInside = end - child.border;
        if (from2 >= startInside && to <= endInside) {
          this.dirty = from2 == offset3 || to == end ? CONTENT_DIRTY : CHILD_DIRTY;
          if (from2 == startInside && to == endInside && (child.contentLost || child.dom.parentNode != this.contentDOM))
            child.dirty = NODE_DIRTY;
          else
            child.markDirty(from2 - startInside, to - startInside);
          return;
        } else {
          child.dirty = child.dom == child.contentDOM && child.dom.parentNode == this.contentDOM && !child.children.length ? CONTENT_DIRTY : NODE_DIRTY;
        }
      }
      offset3 = end;
    }
    this.dirty = CONTENT_DIRTY;
  }
  markParentsDirty() {
    let level = 1;
    for (let node = this.parent; node; node = node.parent, level++) {
      let dirty = level == 1 ? CONTENT_DIRTY : CHILD_DIRTY;
      if (node.dirty < dirty)
        node.dirty = dirty;
    }
  }
  get domAtom() {
    return false;
  }
  get ignoreForCoords() {
    return false;
  }
  get ignoreForSelection() {
    return false;
  }
  isText(text) {
    return false;
  }
};
var WidgetViewDesc = class extends ViewDesc {
  constructor(parent, widget, view, pos) {
    let self, dom = widget.type.toDOM;
    if (typeof dom == "function")
      dom = dom(view, () => {
        if (!self)
          return pos;
        if (self.parent)
          return self.parent.posBeforeChild(self);
      });
    if (!widget.type.spec.raw) {
      let elt = isElt(dom) ? dom : document.createElement("span");
      if (elt != dom)
        elt.appendChild(dom);
      if (!elt.hasAttribute("contenteditable"))
        elt.contentEditable = "false";
      elt.classList.add("ProseMirror-widget");
    }
    super(parent, [], dom, null);
    this.widget = widget;
    this.widget = widget;
    self = this;
  }
  matchesWidget(widget) {
    return this.dirty == NOT_DIRTY && widget.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: true };
  }
  stopEvent(event) {
    let stop = this.widget.spec.stopEvent;
    return stop ? stop(event) : false;
  }
  ignoreMutation(mutation) {
    return mutation.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom);
    super.destroy();
  }
  get domAtom() {
    return true;
  }
  get ignoreForSelection() {
    return !!this.widget.type.spec.relaxedSide;
  }
  get side() {
    return this.widget.type.side;
  }
};
var CompositionViewDesc = class extends ViewDesc {
  constructor(parent, dom, textDOM, text) {
    super(parent, [], dom, null);
    this.textDOM = textDOM;
    this.text = text;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(dom, offset3) {
    if (dom != this.textDOM)
      return this.posAtStart + (offset3 ? this.size : 0);
    return this.posAtStart + offset3;
  }
  domFromPos(pos) {
    return { node: this.textDOM, offset: pos };
  }
  ignoreMutation(mut) {
    return mut.type === "characterData" && mut.target.nodeValue == mut.oldValue;
  }
};
var MarkViewDesc = class _MarkViewDesc extends ViewDesc {
  constructor(parent, mark, dom, contentDOM, spec) {
    super(parent, [], dom, contentDOM);
    this.mark = mark;
    this.spec = spec;
  }
  static create(parent, mark, inline3, view) {
    let custom = view.nodeViews[mark.type.name];
    let spec = custom && custom(mark, view, inline3);
    if (!spec || !spec.dom)
      spec = DOMSerializer.renderSpec(document, mark.type.spec.toDOM(mark, inline3), null, mark.attrs);
    return new _MarkViewDesc(parent, mark, spec.dom, spec.contentDOM || spec.dom, spec);
  }
  parseRule() {
    if (this.dirty & NODE_DIRTY || this.mark.type.spec.reparseInView)
      return null;
    return { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(mark) {
    return this.dirty != NODE_DIRTY && this.mark.eq(mark);
  }
  markDirty(from2, to) {
    super.markDirty(from2, to);
    if (this.dirty != NOT_DIRTY) {
      let parent = this.parent;
      while (!parent.node)
        parent = parent.parent;
      if (parent.dirty < this.dirty)
        parent.dirty = this.dirty;
      this.dirty = NOT_DIRTY;
    }
  }
  slice(from2, to, view) {
    let copy = _MarkViewDesc.create(this.parent, this.mark, true, view);
    let nodes = this.children, size3 = this.size;
    if (to < size3)
      nodes = replaceNodes(nodes, to, size3, view);
    if (from2 > 0)
      nodes = replaceNodes(nodes, 0, from2, view);
    for (let i = 0; i < nodes.length; i++)
      nodes[i].parent = copy;
    copy.children = nodes;
    return copy;
  }
  ignoreMutation(mutation) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
  }
  destroy() {
    if (this.spec.destroy)
      this.spec.destroy();
    super.destroy();
  }
};
var NodeViewDesc = class _NodeViewDesc extends ViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM2) {
    super(parent, [], dom, contentDOM);
    this.node = node;
    this.outerDeco = outerDeco;
    this.innerDeco = innerDeco;
    this.nodeDOM = nodeDOM2;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(parent, node, outerDeco, innerDeco, view, pos) {
    let custom = view.nodeViews[node.type.name], descObj;
    let spec = custom && custom(node, view, () => {
      if (!descObj)
        return pos;
      if (descObj.parent)
        return descObj.parent.posBeforeChild(descObj);
    }, outerDeco, innerDeco);
    let dom = spec && spec.dom, contentDOM = spec && spec.contentDOM;
    if (node.isText) {
      if (!dom)
        dom = document.createTextNode(node.text);
      else if (!isText(dom))
        throw new RangeError("Text must be rendered as a DOM text node");
    } else if (!dom) {
      let spec2 = DOMSerializer.renderSpec(document, node.type.spec.toDOM(node), null, node.attrs);
      ({ dom, contentDOM } = spec2);
    }
    if (!contentDOM && !node.isText && dom.nodeName != "BR") {
      if (!dom.hasAttribute("contenteditable"))
        dom.contentEditable = "false";
      if (node.type.spec.draggable)
        dom.draggable = true;
    }
    let nodeDOM2 = dom;
    dom = applyOuterDeco(dom, outerDeco, node);
    if (spec)
      return descObj = new CustomNodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM2, spec);
    else if (node.isText)
      return new TextViewDesc(parent, node, outerDeco, innerDeco, dom, nodeDOM2);
    else
      return new _NodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM2);
  }
  parseRule(addedNodes) {
    if (this.node.type.spec.reparseInView)
      return null;
    let rule = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre")
      rule.preserveWhitespace = "full";
    if (!this.contentDOM) {
      rule.getContent = () => this.node.content;
    } else if (!this.contentLost) {
      rule.contentElement = this.contentDOM;
    } else {
      for (let i = this.children.length - 1; i >= 0; i--) {
        let child = this.children[i];
        if (this.dom.contains(child.dom.parentNode)) {
          rule.contentElement = child.dom.parentNode;
          break;
        }
      }
      if (!rule.contentElement) {
        let found = addedNodes && addedNodes.find((n) => isElt(n) && addedNodes.indexOf(n.parentNode) < 0 && this.dom.contains(n));
        if (found)
          rule.contentElement = found;
        else
          rule.getContent = () => Fragment.empty;
      }
    }
    return rule;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return this.dirty == NOT_DIRTY && node.eq(this.node) && sameOuterDeco(outerDeco, this.outerDeco) && innerDeco.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(view, pos) {
    let inline3 = this.node.inlineContent, off = pos;
    let composition = view.composing ? this.localCompositionInfo(view, pos) : null;
    let localComposition = composition && composition.pos > -1 ? composition : null;
    let compositionInChild = composition && composition.pos < 0;
    let updater = new ViewTreeUpdater(this, localComposition && localComposition.node, view);
    let addBuffers = this.node.inlineContent, atBufferPos = addBuffers && this.node.isBlock;
    iterDeco(this.node, this.innerDeco, (widget, i, insideNode) => {
      if (widget.spec.marks)
        updater.syncToMarks(widget.spec.marks, inline3, view, i);
      else if (widget.type.side >= 0 && !insideNode)
        updater.syncToMarks(i == this.node.childCount ? Mark.none : this.node.child(i).marks, inline3, view, i);
      updater.placeWidget(widget, view, off);
    }, (child, outerDeco, innerDeco, i) => {
      updater.syncToMarks(child.marks, inline3, view, i);
      if (atBufferPos && child.isAtom && !child.isText)
        updater.addHackNode("IMG", updater.top);
      let compIndex;
      if (updater.findNodeMatch(child, outerDeco, innerDeco, i)) ;
      else if (compositionInChild && view.state.selection.from > off && view.state.selection.to < off + child.nodeSize && (compIndex = updater.findIndexWithChild(composition.node)) > -1 && updater.updateNodeAt(child, outerDeco, innerDeco, compIndex, view)) ;
      else if (updater.updateNextNode(child, outerDeco, innerDeco, view, i, off)) ;
      else {
        updater.addNode(child, outerDeco, innerDeco, view, off);
      }
      off += child.nodeSize;
      if (addBuffers)
        atBufferPos = child.isAtom && !child.isText;
    });
    updater.syncToMarks([], inline3, view, 0);
    if (this.node.isTextblock)
      updater.addTextblockHacks();
    updater.destroyRest();
    if (updater.changed || this.dirty == CONTENT_DIRTY) {
      if (localComposition)
        this.protectLocalComposition(view, localComposition);
      renderDescs(this.contentDOM, this.children, view);
      if (ios)
        iosHacks(this.dom);
    }
  }
  localCompositionInfo(view, pos) {
    let { from: from2, to } = view.state.selection;
    if (!(view.state.selection instanceof TextSelection) || from2 < pos || to > pos + this.node.content.size)
      return null;
    let textNode = view.input.compositionNode;
    if (!textNode || !this.dom.contains(textNode.parentNode))
      return null;
    if (this.node.inlineContent) {
      let text = textNode.nodeValue;
      let textPos = findTextInFragment(this.node.content, text, from2 - pos, to - pos);
      return textPos < 0 ? null : { node: textNode, pos: textPos, text };
    } else {
      return { node: textNode, pos: -1, text: "" };
    }
  }
  protectLocalComposition(view, { node, pos, text }) {
    if (this.getDesc(node))
      return;
    let topNode = node;
    for (; ; topNode = topNode.parentNode) {
      if (topNode.parentNode == this.contentDOM)
        break;
      while (topNode.previousSibling)
        topNode.parentNode.removeChild(topNode.previousSibling);
      while (topNode.nextSibling)
        topNode.parentNode.removeChild(topNode.nextSibling);
      if (topNode.pmViewDesc)
        topNode.pmViewDesc = void 0;
    }
    let desc = new CompositionViewDesc(this, topNode, node, text);
    view.input.compositionNodes.push(desc);
    this.children = replaceNodes(this.children, pos, pos + text.length, view, desc);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY || !node.sameMarkup(this.node))
      return false;
    this.updateInner(node, outerDeco, innerDeco, view);
    return true;
  }
  updateInner(node, outerDeco, innerDeco, view) {
    this.updateOuterDeco(outerDeco);
    this.node = node;
    this.innerDeco = innerDeco;
    if (this.contentDOM)
      this.updateChildren(view, this.posAtStart);
    this.dirty = NOT_DIRTY;
  }
  updateOuterDeco(outerDeco) {
    if (sameOuterDeco(outerDeco, this.outerDeco))
      return;
    let needsWrap = !isElt(this.nodeDOM);
    let oldDOM = this.dom;
    this.dom = patchOuterDeco(this.dom, this.nodeDOM, computeOuterDeco(this.outerDeco, this.node, needsWrap), computeOuterDeco(outerDeco, this.node, needsWrap));
    if (this.dom != oldDOM) {
      oldDOM.pmViewDesc = void 0;
      this.dom.pmViewDesc = this;
    }
    this.outerDeco = outerDeco;
  }
  // Mark this node as being the selected node.
  selectNode() {
    if (isElt(this.nodeDOM)) {
      this.nodeDOM.classList.add("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.nodeDOM.draggable = true;
    }
  }
  // Remove selected node marking from this node.
  deselectNode() {
    if (isElt(this.nodeDOM)) {
      this.nodeDOM.classList.remove("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.nodeDOM.removeAttribute("draggable");
    }
  }
  get domAtom() {
    return this.node.isAtom;
  }
};
function docViewDesc(doc2, outerDeco, innerDeco, dom, view) {
  applyOuterDeco(dom, outerDeco, doc2);
  let docView = new NodeViewDesc(void 0, doc2, outerDeco, innerDeco, dom, dom, dom);
  if (docView.contentDOM)
    docView.updateChildren(view, 0);
  return docView;
}
var TextViewDesc = class _TextViewDesc extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, nodeDOM2) {
    super(parent, node, outerDeco, innerDeco, dom, null, nodeDOM2);
  }
  parseRule() {
    let skip = this.nodeDOM.parentNode;
    while (skip && skip != this.dom && !skip.pmIsDeco)
      skip = skip.parentNode;
    return { skip: skip || true };
  }
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY || this.dirty != NOT_DIRTY && !this.inParent() || !node.sameMarkup(this.node))
      return false;
    this.updateOuterDeco(outerDeco);
    if ((this.dirty != NOT_DIRTY || node.text != this.node.text) && node.text != this.nodeDOM.nodeValue) {
      this.nodeDOM.nodeValue = node.text;
      if (view.trackWrites == this.nodeDOM)
        view.trackWrites = null;
    }
    this.node = node;
    this.dirty = NOT_DIRTY;
    return true;
  }
  inParent() {
    let parentDOM = this.parent.contentDOM;
    for (let n = this.nodeDOM; n; n = n.parentNode)
      if (n == parentDOM)
        return true;
    return false;
  }
  domFromPos(pos) {
    return { node: this.nodeDOM, offset: pos };
  }
  localPosFromDOM(dom, offset3, bias) {
    if (dom == this.nodeDOM)
      return this.posAtStart + Math.min(offset3, this.node.text.length);
    return super.localPosFromDOM(dom, offset3, bias);
  }
  ignoreMutation(mutation) {
    return mutation.type != "characterData" && mutation.type != "selection";
  }
  slice(from2, to, _view) {
    let node = this.node.cut(from2, to), dom = document.createTextNode(node.text);
    return new _TextViewDesc(this.parent, node, this.outerDeco, this.innerDeco, dom, dom);
  }
  markDirty(from2, to) {
    super.markDirty(from2, to);
    if (this.dom != this.nodeDOM && (from2 == 0 || to == this.nodeDOM.nodeValue.length))
      this.dirty = NODE_DIRTY;
  }
  get domAtom() {
    return false;
  }
  isText(text) {
    return this.node.text == text;
  }
};
var BufferHackViewDesc = class extends ViewDesc {
  parseRule() {
    return { ignore: true };
  }
  matchesHack(nodeName) {
    return this.dirty == NOT_DIRTY && this.dom.nodeName == nodeName;
  }
  get domAtom() {
    return true;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
};
var CustomNodeViewDesc = class extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM2, spec) {
    super(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM2);
    this.spec = spec;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY)
      return false;
    if (this.spec.update && (this.node.type == node.type || this.spec.multiType)) {
      let result = this.spec.update(node, outerDeco, innerDeco);
      if (result)
        this.updateInner(node, outerDeco, innerDeco, view);
      return result;
    } else if (!this.contentDOM && !node.isLeaf) {
      return false;
    } else {
      return super.update(node, outerDeco, innerDeco, view);
    }
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(anchor, head, view, force) {
    this.spec.setSelection ? this.spec.setSelection(anchor, head, view.root) : super.setSelection(anchor, head, view, force);
  }
  destroy() {
    if (this.spec.destroy)
      this.spec.destroy();
    super.destroy();
  }
  stopEvent(event) {
    return this.spec.stopEvent ? this.spec.stopEvent(event) : false;
  }
  ignoreMutation(mutation) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
  }
};
function renderDescs(parentDOM, descs, view) {
  let dom = parentDOM.firstChild, written = false;
  for (let i = 0; i < descs.length; i++) {
    let desc = descs[i], childDOM = desc.dom;
    if (childDOM.parentNode == parentDOM) {
      while (childDOM != dom) {
        dom = rm(dom);
        written = true;
      }
      dom = dom.nextSibling;
    } else {
      written = true;
      parentDOM.insertBefore(childDOM, dom);
    }
    if (desc instanceof MarkViewDesc) {
      let pos = dom ? dom.previousSibling : parentDOM.lastChild;
      renderDescs(desc.contentDOM, desc.children, view);
      dom = pos ? pos.nextSibling : parentDOM.firstChild;
    }
  }
  while (dom) {
    dom = rm(dom);
    written = true;
  }
  if (written && view.trackWrites == parentDOM)
    view.trackWrites = null;
}
var OuterDecoLevel = function(nodeName) {
  if (nodeName)
    this.nodeName = nodeName;
};
OuterDecoLevel.prototype = /* @__PURE__ */ Object.create(null);
var noDeco = [new OuterDecoLevel()];
function computeOuterDeco(outerDeco, node, needsWrap) {
  if (outerDeco.length == 0)
    return noDeco;
  let top = needsWrap ? noDeco[0] : new OuterDecoLevel(), result = [top];
  for (let i = 0; i < outerDeco.length; i++) {
    let attrs = outerDeco[i].type.attrs;
    if (!attrs)
      continue;
    if (attrs.nodeName)
      result.push(top = new OuterDecoLevel(attrs.nodeName));
    for (let name in attrs) {
      let val = attrs[name];
      if (val == null)
        continue;
      if (needsWrap && result.length == 1)
        result.push(top = new OuterDecoLevel(node.isInline ? "span" : "div"));
      if (name == "class")
        top.class = (top.class ? top.class + " " : "") + val;
      else if (name == "style")
        top.style = (top.style ? top.style + ";" : "") + val;
      else if (name != "nodeName")
        top[name] = val;
    }
  }
  return result;
}
function patchOuterDeco(outerDOM, nodeDOM2, prevComputed, curComputed) {
  if (prevComputed == noDeco && curComputed == noDeco)
    return nodeDOM2;
  let curDOM = nodeDOM2;
  for (let i = 0; i < curComputed.length; i++) {
    let deco = curComputed[i], prev = prevComputed[i];
    if (i) {
      let parent;
      if (prev && prev.nodeName == deco.nodeName && curDOM != outerDOM && (parent = curDOM.parentNode) && parent.nodeName.toLowerCase() == deco.nodeName) {
        curDOM = parent;
      } else {
        parent = document.createElement(deco.nodeName);
        parent.pmIsDeco = true;
        parent.appendChild(curDOM);
        prev = noDeco[0];
        curDOM = parent;
      }
    }
    patchAttributes(curDOM, prev || noDeco[0], deco);
  }
  return curDOM;
}
function patchAttributes(dom, prev, cur) {
  for (let name in prev)
    if (name != "class" && name != "style" && name != "nodeName" && !(name in cur))
      dom.removeAttribute(name);
  for (let name in cur)
    if (name != "class" && name != "style" && name != "nodeName" && cur[name] != prev[name])
      dom.setAttribute(name, cur[name]);
  if (prev.class != cur.class) {
    let prevList = prev.class ? prev.class.split(" ").filter(Boolean) : [];
    let curList = cur.class ? cur.class.split(" ").filter(Boolean) : [];
    for (let i = 0; i < prevList.length; i++)
      if (curList.indexOf(prevList[i]) == -1)
        dom.classList.remove(prevList[i]);
    for (let i = 0; i < curList.length; i++)
      if (prevList.indexOf(curList[i]) == -1)
        dom.classList.add(curList[i]);
    if (dom.classList.length == 0)
      dom.removeAttribute("class");
  }
  if (prev.style != cur.style) {
    if (prev.style) {
      let prop = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, m;
      while (m = prop.exec(prev.style))
        dom.style.removeProperty(m[1]);
    }
    if (cur.style)
      dom.style.cssText += cur.style;
  }
}
function applyOuterDeco(dom, deco, node) {
  return patchOuterDeco(dom, dom, noDeco, computeOuterDeco(deco, node, !isElt(dom)));
}
function sameOuterDeco(a, b) {
  if (a.length != b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (!a[i].type.eq(b[i].type))
      return false;
  return true;
}
function rm(dom) {
  let next = dom.nextSibling;
  dom.parentNode.removeChild(dom);
  return next;
}
var ViewTreeUpdater = class {
  constructor(top, lock, view) {
    this.lock = lock;
    this.view = view;
    this.index = 0;
    this.stack = [];
    this.changed = false;
    this.top = top;
    this.preMatch = preMatch(top.node.content, top);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(start, end) {
    if (start == end)
      return;
    for (let i = start; i < end; i++)
      this.top.children[i].destroy();
    this.top.children.splice(start, end - start);
    this.changed = true;
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(marks, inline3, view, parentIndex) {
    let keep = 0, depth = this.stack.length >> 1;
    let maxKeep = Math.min(depth, marks.length);
    while (keep < maxKeep && (keep == depth - 1 ? this.top : this.stack[keep + 1 << 1]).matchesMark(marks[keep]) && marks[keep].type.spec.spanning !== false)
      keep++;
    while (keep < depth) {
      this.destroyRest();
      this.top.dirty = NOT_DIRTY;
      this.index = this.stack.pop();
      this.top = this.stack.pop();
      depth--;
    }
    while (depth < marks.length) {
      this.stack.push(this.top, this.index + 1);
      let found = -1, scanTo = this.top.children.length;
      if (parentIndex < this.preMatch.index)
        scanTo = Math.min(this.index + 3, scanTo);
      for (let i = this.index; i < scanTo; i++) {
        let next = this.top.children[i];
        if (next.matchesMark(marks[depth]) && !this.isLocked(next.dom)) {
          found = i;
          break;
        }
      }
      if (found < 0 && this.index < this.top.children.length) {
        let cur = this.top.children[this.index];
        if (cur instanceof MarkViewDesc && cur.dirty != NODE_DIRTY && cur.mark.type == marks[depth].type && cur.spec.update && !this.isLocked(cur.dom) && cur.spec.update(marks[depth])) {
          cur.mark = marks[depth];
          found = this.index;
          this.changed = true;
        }
      }
      if (found > -1) {
        if (found > this.index) {
          this.changed = true;
          this.destroyBetween(this.index, found);
        }
        this.top = this.top.children[this.index];
      } else {
        let markDesc = MarkViewDesc.create(this.top, marks[depth], inline3, view);
        this.top.children.splice(this.index, 0, markDesc);
        this.top = markDesc;
        this.changed = true;
      }
      this.index = 0;
      depth++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(node, outerDeco, innerDeco, index) {
    let found = -1, targetDesc;
    if (index >= this.preMatch.index && (targetDesc = this.preMatch.matches[index - this.preMatch.index]).parent == this.top && targetDesc.matchesNode(node, outerDeco, innerDeco)) {
      found = this.top.children.indexOf(targetDesc, this.index);
    } else {
      for (let i = this.index, e = Math.min(this.top.children.length, i + 5); i < e; i++) {
        let child = this.top.children[i];
        if (child.matchesNode(node, outerDeco, innerDeco) && !this.preMatch.matched.has(child)) {
          found = i;
          break;
        }
      }
    }
    if (found < 0)
      return false;
    this.destroyBetween(this.index, found);
    this.index++;
    return true;
  }
  updateNodeAt(node, outerDeco, innerDeco, index, view) {
    let child = this.top.children[index];
    if (child.dirty == NODE_DIRTY && child.dom == child.contentDOM)
      child.dirty = CONTENT_DIRTY;
    if (!child.update(node, outerDeco, innerDeco, view))
      return false;
    this.destroyBetween(this.index, index);
    this.index++;
    return true;
  }
  findIndexWithChild(domNode) {
    for (; ; ) {
      let parent = domNode.parentNode;
      if (!parent)
        return -1;
      if (parent == this.top.contentDOM) {
        let desc = domNode.pmViewDesc;
        if (desc)
          for (let i = this.index; i < this.top.children.length; i++) {
            if (this.top.children[i] == desc)
              return i;
          }
        return -1;
      }
      domNode = parent;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(node, outerDeco, innerDeco, view, index, pos) {
    for (let i = this.index; i < this.top.children.length; i++) {
      let next = this.top.children[i];
      if (next instanceof NodeViewDesc) {
        let preMatch2 = this.preMatch.matched.get(next);
        if (preMatch2 != null && preMatch2 != index)
          return false;
        let nextDOM = next.dom, updated;
        let locked = this.isLocked(nextDOM) && !(node.isText && next.node && next.node.isText && next.nodeDOM.nodeValue == node.text && next.dirty != NODE_DIRTY && sameOuterDeco(outerDeco, next.outerDeco));
        if (!locked && next.update(node, outerDeco, innerDeco, view)) {
          this.destroyBetween(this.index, i);
          if (next.dom != nextDOM)
            this.changed = true;
          this.index++;
          return true;
        } else if (!locked && (updated = this.recreateWrapper(next, node, outerDeco, innerDeco, view, pos))) {
          this.destroyBetween(this.index, i);
          this.top.children[this.index] = updated;
          if (updated.contentDOM) {
            updated.dirty = CONTENT_DIRTY;
            updated.updateChildren(view, pos + 1);
            updated.dirty = NOT_DIRTY;
          }
          this.changed = true;
          this.index++;
          return true;
        }
        break;
      }
    }
    return false;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(next, node, outerDeco, innerDeco, view, pos) {
    if (next.dirty || node.isAtom || !next.children.length || !next.node.content.eq(node.content) || !sameOuterDeco(outerDeco, next.outerDeco) || !innerDeco.eq(next.innerDeco))
      return null;
    let wrapper = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
    if (wrapper.contentDOM) {
      wrapper.children = next.children;
      next.children = [];
      for (let ch of wrapper.children)
        ch.parent = wrapper;
    }
    next.destroy();
    return wrapper;
  }
  // Insert the node as a newly created node desc.
  addNode(node, outerDeco, innerDeco, view, pos) {
    let desc = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
    if (desc.contentDOM)
      desc.updateChildren(view, pos + 1);
    this.top.children.splice(this.index++, 0, desc);
    this.changed = true;
  }
  placeWidget(widget, view, pos) {
    let next = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (next && next.matchesWidget(widget) && (widget == next.widget || !next.widget.type.toDOM.parentNode)) {
      this.index++;
    } else {
      let desc = new WidgetViewDesc(this.top, widget, view, pos);
      this.top.children.splice(this.index++, 0, desc);
      this.changed = true;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let lastChild = this.top.children[this.index - 1], parent = this.top;
    while (lastChild instanceof MarkViewDesc) {
      parent = lastChild;
      lastChild = parent.children[parent.children.length - 1];
    }
    if (!lastChild || // Empty textblock
    !(lastChild instanceof TextViewDesc) || /\n$/.test(lastChild.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(lastChild.node.text)) {
      if ((safari || chrome) && lastChild && lastChild.dom.contentEditable == "false")
        this.addHackNode("IMG", parent);
      this.addHackNode("BR", this.top);
    }
  }
  addHackNode(nodeName, parent) {
    if (parent == this.top && this.index < parent.children.length && parent.children[this.index].matchesHack(nodeName)) {
      this.index++;
    } else {
      let dom = document.createElement(nodeName);
      if (nodeName == "IMG") {
        dom.className = "ProseMirror-separator";
        dom.alt = "";
      }
      if (nodeName == "BR")
        dom.className = "ProseMirror-trailingBreak";
      let hack = new BufferHackViewDesc(this.top, [], dom, null);
      if (parent != this.top)
        parent.children.push(hack);
      else
        parent.children.splice(this.index++, 0, hack);
      this.changed = true;
    }
  }
  isLocked(node) {
    return this.lock && (node == this.lock || isElt(node) && node.contains(this.lock.parentNode));
  }
};
function preMatch(frag, parentDesc) {
  let curDesc = parentDesc, descI = curDesc.children.length;
  let fI = frag.childCount, matched = /* @__PURE__ */ new Map(), matches = [];
  outer: while (fI > 0) {
    let desc;
    for (; ; ) {
      if (descI) {
        let next = curDesc.children[descI - 1];
        if (next instanceof MarkViewDesc) {
          curDesc = next;
          descI = next.children.length;
        } else {
          desc = next;
          descI--;
          break;
        }
      } else if (curDesc == parentDesc) {
        break outer;
      } else {
        descI = curDesc.parent.children.indexOf(curDesc);
        curDesc = curDesc.parent;
      }
    }
    let node = desc.node;
    if (!node)
      continue;
    if (node != frag.child(fI - 1))
      break;
    --fI;
    matched.set(desc, fI);
    matches.push(desc);
  }
  return { index: fI, matched, matches: matches.reverse() };
}
function compareSide(a, b) {
  return a.type.side - b.type.side;
}
function iterDeco(parent, deco, onWidget, onNode) {
  let locals = deco.locals(parent), offset3 = 0;
  if (locals.length == 0) {
    for (let i = 0; i < parent.childCount; i++) {
      let child = parent.child(i);
      onNode(child, locals, deco.forChild(offset3, child), i);
      offset3 += child.nodeSize;
    }
    return;
  }
  let decoIndex = 0, active = [], restNode = null;
  for (let parentIndex = 0; ; ) {
    let widget, widgets;
    while (decoIndex < locals.length && locals[decoIndex].to == offset3) {
      let next = locals[decoIndex++];
      if (next.widget) {
        if (!widget)
          widget = next;
        else
          (widgets || (widgets = [widget])).push(next);
      }
    }
    if (widget) {
      if (widgets) {
        widgets.sort(compareSide);
        for (let i = 0; i < widgets.length; i++)
          onWidget(widgets[i], parentIndex, !!restNode);
      } else {
        onWidget(widget, parentIndex, !!restNode);
      }
    }
    let child, index;
    if (restNode) {
      index = -1;
      child = restNode;
      restNode = null;
    } else if (parentIndex < parent.childCount) {
      index = parentIndex;
      child = parent.child(parentIndex++);
    } else {
      break;
    }
    for (let i = 0; i < active.length; i++)
      if (active[i].to <= offset3)
        active.splice(i--, 1);
    while (decoIndex < locals.length && locals[decoIndex].from <= offset3 && locals[decoIndex].to > offset3)
      active.push(locals[decoIndex++]);
    let end = offset3 + child.nodeSize;
    if (child.isText) {
      let cutAt = end;
      if (decoIndex < locals.length && locals[decoIndex].from < cutAt)
        cutAt = locals[decoIndex].from;
      for (let i = 0; i < active.length; i++)
        if (active[i].to < cutAt)
          cutAt = active[i].to;
      if (cutAt < end) {
        restNode = child.cut(cutAt - offset3);
        child = child.cut(0, cutAt - offset3);
        end = cutAt;
        index = -1;
      }
    } else {
      while (decoIndex < locals.length && locals[decoIndex].to < end)
        decoIndex++;
    }
    let outerDeco = child.isInline && !child.isLeaf ? active.filter((d) => !d.inline) : active.slice();
    onNode(child, outerDeco, deco.forChild(offset3, child), index);
    offset3 = end;
  }
}
function iosHacks(dom) {
  if (dom.nodeName == "UL" || dom.nodeName == "OL") {
    let oldCSS = dom.style.cssText;
    dom.style.cssText = oldCSS + "; list-style: square !important";
    window.getComputedStyle(dom).listStyle;
    dom.style.cssText = oldCSS;
  }
}
function findTextInFragment(frag, text, from2, to) {
  for (let i = 0, pos = 0; i < frag.childCount && pos <= to; ) {
    let child = frag.child(i++), childStart = pos;
    pos += child.nodeSize;
    if (!child.isText)
      continue;
    let str = child.text;
    while (i < frag.childCount) {
      let next = frag.child(i++);
      pos += next.nodeSize;
      if (!next.isText)
        break;
      str += next.text;
    }
    if (pos >= from2) {
      if (pos >= to && str.slice(to - text.length - childStart, to - childStart) == text)
        return to - text.length;
      let found = childStart < to ? str.lastIndexOf(text, to - childStart - 1) : -1;
      if (found >= 0 && found + text.length + childStart >= from2)
        return childStart + found;
      if (from2 == to && str.length >= to + text.length - childStart && str.slice(to - childStart, to - childStart + text.length) == text)
        return to;
    }
  }
  return -1;
}
function replaceNodes(nodes, from2, to, view, replacement) {
  let result = [];
  for (let i = 0, off = 0; i < nodes.length; i++) {
    let child = nodes[i], start = off, end = off += child.size;
    if (start >= to || end <= from2) {
      result.push(child);
    } else {
      if (start < from2)
        result.push(child.slice(0, from2 - start, view));
      if (replacement) {
        result.push(replacement);
        replacement = void 0;
      }
      if (end > to)
        result.push(child.slice(to - start, child.size, view));
    }
  }
  return result;
}
function selectionFromDOM(view, origin = null) {
  let domSel = view.domSelectionRange(), doc2 = view.state.doc;
  if (!domSel.focusNode)
    return null;
  let nearestDesc = view.docView.nearestDesc(domSel.focusNode), inWidget = nearestDesc && nearestDesc.size == 0;
  let head = view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset, 1);
  if (head < 0)
    return null;
  let $head = doc2.resolve(head), anchor, selection;
  if (selectionCollapsed(domSel)) {
    anchor = head;
    while (nearestDesc && !nearestDesc.node)
      nearestDesc = nearestDesc.parent;
    if (nearestDesc && nearestDesc.node.isAtom && NodeSelection.isSelectable(nearestDesc.node) && nearestDesc.parent && !(nearestDesc.node.isInline && isOnEdge(domSel.focusNode, domSel.focusOffset, nearestDesc.dom))) {
      let pos = nearestDesc.posBefore;
      selection = new NodeSelection(head == pos ? $head : doc2.resolve(pos));
    } else if (gecko && origin == "key" && head > view.state.selection.to && isElt(domSel.focusNode) && domSel.focusOffset == domSel.focusNode.childNodes.length && nearestDesc && nearestDesc.posAtStart > view.state.selection.to) {
      for (let scan = domSel.focusNode; ; scan = scan.parentNode) {
        if (getComputedStyle(scan).overflow != "visible") {
          selection = Selection.findFrom(doc2.resolve(nearestDesc.posAtStart), 1);
          break;
        }
        if (scan == nearestDesc.dom || scan.nextSibling || !scan.parentNode || !isElt(scan.parentNode))
          break;
      }
    }
  } else {
    if (domSel instanceof view.dom.ownerDocument.defaultView.Selection && domSel.rangeCount > 1) {
      let min2 = head, max2 = head;
      for (let i = 0; i < domSel.rangeCount; i++) {
        let range = domSel.getRangeAt(i);
        min2 = Math.min(min2, view.docView.posFromDOM(range.startContainer, range.startOffset, 1));
        max2 = Math.max(max2, view.docView.posFromDOM(range.endContainer, range.endOffset, -1));
      }
      if (min2 < 0)
        return null;
      [anchor, head] = max2 == view.state.selection.anchor ? [max2, min2] : [min2, max2];
      $head = doc2.resolve(head);
    } else {
      anchor = view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset, 1);
    }
    if (anchor < 0)
      return null;
  }
  let $anchor = doc2.resolve(anchor);
  if (!selection) {
    let bias = origin == "pointer" || view.state.selection.head < $head.pos && !inWidget ? 1 : -1;
    selection = selectionBetween(view, $anchor, $head, bias);
  }
  return selection;
}
function editorOwnsSelection(view) {
  return view.editable ? view.hasFocus() : hasSelection(view) && document.activeElement && document.activeElement.contains(view.dom);
}
function selectionToDOM(view, force = false) {
  let sel = view.state.selection;
  syncNodeSelection(view, sel);
  if (!editorOwnsSelection(view))
    return;
  let mouseDown = view.input.mouseDown;
  if (!force && chrome && mouseDown) {
    let domSel = view.domSelectionRange(), curSel = view.domObserver.currentSelection;
    if (domSel.anchorNode && curSel.anchorNode && isEquivalentPosition(domSel.anchorNode, domSel.anchorOffset, curSel.anchorNode, curSel.anchorOffset) && mouseDown.delaySelUpdate()) {
      view.domObserver.setCurSelection();
      return;
    }
  }
  view.domObserver.disconnectSelection();
  if (view.cursorWrapper) {
    selectCursorWrapper(view);
  } else {
    let { anchor, head } = sel, resetEditableFrom, resetEditableTo;
    if (brokenSelectBetweenUneditable && !(sel instanceof TextSelection)) {
      if (!sel.$from.parent.inlineContent)
        resetEditableFrom = temporarilyEditableNear(view, sel.from);
      if (!sel.empty && !sel.$from.parent.inlineContent)
        resetEditableTo = temporarilyEditableNear(view, sel.to);
    }
    view.docView.setSelection(anchor, head, view, force);
    if (brokenSelectBetweenUneditable) {
      if (resetEditableFrom)
        resetEditable(resetEditableFrom);
      if (resetEditableTo)
        resetEditable(resetEditableTo);
    }
    if (sel.visible) {
      view.dom.classList.remove("ProseMirror-hideselection");
    } else {
      view.dom.classList.add("ProseMirror-hideselection");
      if ("onselectionchange" in document)
        removeClassOnSelectionChange(view);
    }
  }
  view.domObserver.setCurSelection();
  view.domObserver.connectSelection();
}
var brokenSelectBetweenUneditable = safari || chrome && chrome_version < 63;
function temporarilyEditableNear(view, pos) {
  let { node, offset: offset3 } = view.docView.domFromPos(pos, 0);
  let after = offset3 < node.childNodes.length ? node.childNodes[offset3] : null;
  let before = offset3 ? node.childNodes[offset3 - 1] : null;
  if (safari && after && after.contentEditable == "false")
    return setEditable(after);
  if ((!after || after.contentEditable == "false") && (!before || before.contentEditable == "false")) {
    if (after)
      return setEditable(after);
    else if (before)
      return setEditable(before);
  }
}
function setEditable(element) {
  element.contentEditable = "true";
  if (safari && element.draggable) {
    element.draggable = false;
    element.wasDraggable = true;
  }
  return element;
}
function resetEditable(element) {
  element.contentEditable = "false";
  if (element.wasDraggable) {
    element.draggable = true;
    element.wasDraggable = null;
  }
}
function removeClassOnSelectionChange(view) {
  let doc2 = view.dom.ownerDocument;
  doc2.removeEventListener("selectionchange", view.input.hideSelectionGuard);
  let domSel = view.domSelectionRange();
  let node = domSel.anchorNode, offset3 = domSel.anchorOffset;
  doc2.addEventListener("selectionchange", view.input.hideSelectionGuard = () => {
    if (domSel.anchorNode != node || domSel.anchorOffset != offset3) {
      doc2.removeEventListener("selectionchange", view.input.hideSelectionGuard);
      setTimeout(() => {
        if (!editorOwnsSelection(view) || view.state.selection.visible)
          view.dom.classList.remove("ProseMirror-hideselection");
      }, 20);
    }
  });
}
function selectCursorWrapper(view) {
  let domSel = view.domSelection();
  if (!domSel)
    return;
  let node = view.cursorWrapper.dom, img = node.nodeName == "IMG";
  if (img)
    domSel.collapse(node.parentNode, domIndex(node) + 1);
  else
    domSel.collapse(node, 0);
  if (!img && !view.state.selection.visible && ie && ie_version <= 11) {
    node.disabled = true;
    node.disabled = false;
  }
}
function syncNodeSelection(view, sel) {
  if (sel instanceof NodeSelection) {
    let desc = view.docView.descAt(sel.from);
    if (desc != view.lastSelectedViewDesc) {
      clearNodeSelection(view);
      if (desc)
        desc.selectNode();
      view.lastSelectedViewDesc = desc;
    }
  } else {
    clearNodeSelection(view);
  }
}
function clearNodeSelection(view) {
  if (view.lastSelectedViewDesc) {
    if (view.lastSelectedViewDesc.parent)
      view.lastSelectedViewDesc.deselectNode();
    view.lastSelectedViewDesc = void 0;
  }
}
function selectionBetween(view, $anchor, $head, bias) {
  return view.someProp("createSelectionBetween", (f) => f(view, $anchor, $head)) || TextSelection.between($anchor, $head, bias);
}
function hasFocusAndSelection(view) {
  if (view.editable && !view.hasFocus())
    return false;
  return hasSelection(view);
}
function hasSelection(view) {
  let sel = view.domSelectionRange();
  if (!sel.anchorNode)
    return false;
  try {
    return contains(view.dom, sel.anchorNode) && (view.editable || contains(view.dom, sel.focusNode));
  } catch (_) {
    return false;
  }
}
function anchorInRightPlace(view) {
  let anchorDOM = view.docView.domFromPos(view.state.selection.anchor, 0);
  let domSel = view.domSelectionRange();
  return isEquivalentPosition(anchorDOM.node, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset);
}
function moveSelectionBlock(state, dir) {
  let { $anchor, $head } = state.selection;
  let $side = dir > 0 ? $anchor.max($head) : $anchor.min($head);
  let $start = !$side.parent.inlineContent ? $side : $side.depth ? state.doc.resolve(dir > 0 ? $side.after() : $side.before()) : null;
  return $start && Selection.findFrom($start, dir);
}
function apply(view, sel) {
  view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
  return true;
}
function selectHorizontally(view, dir, mods) {
  let sel = view.state.selection;
  if (sel instanceof TextSelection) {
    if (mods.indexOf("s") > -1) {
      let { $head } = sel, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter;
      if (!node || node.isText || !node.isLeaf)
        return false;
      let $newHead = view.state.doc.resolve($head.pos + node.nodeSize * (dir < 0 ? -1 : 1));
      return apply(view, new TextSelection(sel.$anchor, $newHead));
    } else if (!sel.empty) {
      return false;
    } else if (view.endOfTextblock(dir > 0 ? "forward" : "backward")) {
      let next = moveSelectionBlock(view.state, dir);
      if (next && next instanceof NodeSelection)
        return apply(view, next);
      return false;
    } else if (!(mac2 && mods.indexOf("m") > -1)) {
      let $head = sel.$head, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter, desc;
      if (!node || node.isText)
        return false;
      let nodePos = dir < 0 ? $head.pos - node.nodeSize : $head.pos;
      if (!(node.isAtom || (desc = view.docView.descAt(nodePos)) && !desc.contentDOM))
        return false;
      if (NodeSelection.isSelectable(node)) {
        return apply(view, new NodeSelection(dir < 0 ? view.state.doc.resolve($head.pos - node.nodeSize) : $head));
      } else {
        return apply(view, new TextSelection(view.state.doc.resolve(dir < 0 ? nodePos : nodePos + node.nodeSize)));
      }
    }
  } else if (sel instanceof NodeSelection && sel.node.isInline) {
    return apply(view, new TextSelection(dir > 0 ? sel.$to : sel.$from));
  } else {
    let next = moveSelectionBlock(view.state, dir);
    if (next)
      return apply(view, next);
    return false;
  }
}
function isIgnorable(dom, dir) {
  let desc = dom.pmViewDesc;
  return desc ? desc.size == 0 && (dir < 0 || dom.nextSibling || dom.nodeName != "BR") : isElt(dom) && dom.contentEditable == "false";
}
function skipIgnoredNodes(view, dir) {
  return dir < 0 ? skipIgnoredNodesBefore(view) : skipIgnoredNodesAfter(view);
}
function skipIgnoredNodesBefore(view) {
  let sel = view.domSelectionRange();
  let node = sel.focusNode, offset3 = sel.focusOffset;
  if (!node)
    return;
  let moveNode, moveOffset, force = false;
  if (gecko && isElt(node) && offset3 < nodeSize(node) && isIgnorable(node.childNodes[offset3], -1))
    force = true;
  for (; ; ) {
    if (offset3 > 0) {
      if (!isElt(node))
        break;
      let before = node.childNodes[offset3 - 1];
      if (isIgnorable(before, -1)) {
        moveNode = node;
        moveOffset = --offset3;
      } else if (isText(before)) {
        node = before;
        offset3 = node.nodeValue.length;
      } else {
        break;
      }
    } else if (isBlockNode(node)) {
      break;
    } else {
      let prev = node.previousSibling;
      while (prev && isIgnorable(prev, -1)) {
        moveNode = node.parentNode;
        moveOffset = domIndex(prev);
        prev = prev.previousSibling;
      }
      if (!prev) {
        node = node.parentNode;
        if (node == view.dom)
          break;
        offset3 = 0;
      } else {
        node = prev;
        offset3 = nodeSize(node);
      }
    }
  }
  if (force)
    setSelFocus(view, node, offset3);
  else if (moveNode)
    setSelFocus(view, moveNode, moveOffset);
}
function skipIgnoredNodesAfter(view) {
  let sel = view.domSelectionRange();
  let node = sel.focusNode, offset3 = sel.focusOffset;
  if (!node)
    return;
  let len = nodeSize(node);
  let moveNode, moveOffset;
  for (; ; ) {
    if (offset3 < len) {
      if (!isElt(node))
        break;
      let after = node.childNodes[offset3];
      if (isIgnorable(after, 1)) {
        moveNode = node;
        moveOffset = ++offset3;
      } else {
        break;
      }
    } else if (isBlockNode(node)) {
      break;
    } else {
      let next = node.nextSibling;
      while (next && isIgnorable(next, 1)) {
        moveNode = next.parentNode;
        moveOffset = domIndex(next) + 1;
        next = next.nextSibling;
      }
      if (!next) {
        node = node.parentNode;
        if (node == view.dom)
          break;
        offset3 = len = 0;
      } else {
        node = next;
        offset3 = 0;
        len = nodeSize(node);
      }
    }
  }
  if (moveNode)
    setSelFocus(view, moveNode, moveOffset);
}
function isBlockNode(dom) {
  let desc = dom.pmViewDesc;
  return desc && desc.node && desc.node.isBlock;
}
function textNodeAfter(node, offset3) {
  while (node && offset3 == node.childNodes.length && !hasBlockDesc(node)) {
    offset3 = domIndex(node) + 1;
    node = node.parentNode;
  }
  while (node && offset3 < node.childNodes.length) {
    let next = node.childNodes[offset3];
    if (isText(next))
      return next;
    if (isElt(next) && next.contentEditable == "false")
      break;
    node = next;
    offset3 = 0;
  }
}
function textNodeBefore(node, offset3) {
  while (node && !offset3 && !hasBlockDesc(node)) {
    offset3 = domIndex(node);
    node = node.parentNode;
  }
  while (node && offset3) {
    let next = node.childNodes[offset3 - 1];
    if (isText(next))
      return next;
    if (isElt(next) && next.contentEditable == "false")
      break;
    node = next;
    offset3 = node.childNodes.length;
  }
}
function setSelFocus(view, node, offset3) {
  if (!isText(node)) {
    let before, after;
    if (after = textNodeAfter(node, offset3)) {
      node = after;
      offset3 = 0;
    } else if (before = textNodeBefore(node, offset3)) {
      node = before;
      offset3 = before.nodeValue.length;
    }
  }
  let sel = view.domSelection();
  if (!sel)
    return;
  if (selectionCollapsed(sel)) {
    let range = document.createRange();
    range.setEnd(node, offset3);
    range.setStart(node, offset3);
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (sel.extend) {
    sel.extend(node, offset3);
  }
  view.domObserver.setCurSelection();
  let { state } = view;
  setTimeout(() => {
    if (view.state == state)
      selectionToDOM(view);
  }, 50);
}
function findDirection(view, pos) {
  let $pos = view.state.doc.resolve(pos);
  if (!(chrome || windows) && $pos.parent.inlineContent) {
    let coords = view.coordsAtPos(pos);
    if (pos > $pos.start()) {
      let before = view.coordsAtPos(pos - 1);
      let mid = (before.top + before.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(before.left - coords.left) > 1)
        return before.left < coords.left ? "ltr" : "rtl";
    }
    if (pos < $pos.end()) {
      let after = view.coordsAtPos(pos + 1);
      let mid = (after.top + after.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(after.left - coords.left) > 1)
        return after.left > coords.left ? "ltr" : "rtl";
    }
  }
  let computed = getComputedStyle(view.dom).direction;
  return computed == "rtl" ? "rtl" : "ltr";
}
function selectVertically(view, dir, mods) {
  let sel = view.state.selection;
  if (sel instanceof TextSelection && !sel.empty || mods.indexOf("s") > -1)
    return false;
  if (mac2 && mods.indexOf("m") > -1)
    return false;
  let { $from, $to } = sel;
  if (!$from.parent.inlineContent || view.endOfTextblock(dir < 0 ? "up" : "down")) {
    let next = moveSelectionBlock(view.state, dir);
    if (next && next instanceof NodeSelection)
      return apply(view, next);
  }
  if (!$from.parent.inlineContent) {
    let side = dir < 0 ? $from : $to;
    let beyond = sel instanceof AllSelection ? Selection.near(side, dir) : Selection.findFrom(side, dir);
    return beyond ? apply(view, beyond) : false;
  }
  return false;
}
function stopNativeHorizontalDelete(view, dir) {
  if (!(view.state.selection instanceof TextSelection))
    return true;
  let { $head, $anchor, empty: empty2 } = view.state.selection;
  if (!$head.sameParent($anchor))
    return true;
  if (!empty2)
    return false;
  if (view.endOfTextblock(dir > 0 ? "forward" : "backward"))
    return true;
  let nextNode = !$head.textOffset && (dir < 0 ? $head.nodeBefore : $head.nodeAfter);
  if (nextNode && !nextNode.isText) {
    let tr = view.state.tr;
    if (dir < 0)
      tr.delete($head.pos - nextNode.nodeSize, $head.pos);
    else
      tr.delete($head.pos, $head.pos + nextNode.nodeSize);
    view.dispatch(tr);
    return true;
  }
  return false;
}
function switchEditable(view, node, state) {
  view.domObserver.stop();
  node.contentEditable = state;
  view.domObserver.start();
}
function safariDownArrowBug(view) {
  if (!safari || view.state.selection.$head.parentOffset > 0)
    return false;
  let { focusNode, focusOffset } = view.domSelectionRange();
  if (focusNode && isElt(focusNode) && focusOffset == 0 && focusNode.firstChild && isElt(focusNode.firstChild) && focusNode.firstChild.contentEditable == "false") {
    let child = focusNode.firstChild;
    switchEditable(view, child, "true");
    setTimeout(() => switchEditable(view, child, "false"), 20);
  }
  return false;
}
function getMods(event) {
  let result = "";
  if (event.ctrlKey)
    result += "c";
  if (event.metaKey)
    result += "m";
  if (event.altKey)
    result += "a";
  if (event.shiftKey)
    result += "s";
  return result;
}
function captureKeyDown(view, event) {
  let code = event.keyCode, mods = getMods(event);
  if (code == 8 || mac2 && code == 72 && mods == "c") {
    return stopNativeHorizontalDelete(view, -1) || skipIgnoredNodes(view, -1);
  } else if (code == 46 && !event.shiftKey || mac2 && code == 68 && mods == "c") {
    return stopNativeHorizontalDelete(view, 1) || skipIgnoredNodes(view, 1);
  } else if (code == 13 || code == 27) {
    return true;
  } else if (code == 37 || mac2 && code == 66 && mods == "c") {
    let dir = code == 37 ? findDirection(view, view.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
  } else if (code == 39 || mac2 && code == 70 && mods == "c") {
    let dir = code == 39 ? findDirection(view, view.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
  } else if (code == 38 || mac2 && code == 80 && mods == "c") {
    return selectVertically(view, -1, mods) || skipIgnoredNodes(view, -1);
  } else if (code == 40 || mac2 && code == 78 && mods == "c") {
    return safariDownArrowBug(view) || selectVertically(view, 1, mods) || skipIgnoredNodes(view, 1);
  } else if (mods == (mac2 ? "m" : "c") && (code == 66 || code == 73 || code == 89 || code == 90)) {
    return true;
  }
  return false;
}
function serializeForClipboard(view, slice2) {
  view.someProp("transformCopied", (f) => {
    slice2 = f(slice2, view);
  });
  let context = [], { content, openStart, openEnd } = slice2;
  while (openStart > 1 && openEnd > 1 && content.childCount == 1 && content.firstChild.childCount == 1) {
    openStart--;
    openEnd--;
    let node = content.firstChild;
    context.push(node.type.name, node.attrs != node.type.defaultAttrs ? node.attrs : null);
    content = node.content;
  }
  let serializer = view.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view.state.schema);
  let doc2 = detachedDoc(), wrap = doc2.createElement("div");
  wrap.appendChild(serializer.serializeFragment(content, { document: doc2 }));
  let firstChild = wrap.firstChild, needsWrap, wrappers = 0;
  while (firstChild && isElt(firstChild) && (needsWrap = wrapMap[firstChild.nodeName.toLowerCase()])) {
    for (let i = needsWrap.length - 1; i >= 0; i--) {
      let wrapper = doc2.createElement(needsWrap[i]);
      while (wrap.firstChild)
        wrapper.appendChild(wrap.firstChild);
      wrap.appendChild(wrapper);
      wrappers++;
    }
    firstChild = wrap.firstChild;
  }
  if (firstChild && isElt(firstChild))
    firstChild.setAttribute("data-pm-slice", `${openStart} ${openEnd}${wrappers ? ` -${wrappers}` : ""} ${JSON.stringify(context)}`);
  let text = view.someProp("clipboardTextSerializer", (f) => f(slice2, view)) || slice2.content.textBetween(0, slice2.content.size, "\n\n");
  return { dom: wrap, text, slice: slice2 };
}
function parseFromClipboard(view, text, html, plainText, $context) {
  let inCode = $context.parent.type.spec.code;
  let dom, slice2;
  if (!html && !text)
    return null;
  let asText = !!text && (plainText || inCode || !html);
  if (asText) {
    view.someProp("transformPastedText", (f) => {
      text = f(text, inCode || plainText, view);
    });
    if (inCode) {
      slice2 = new Slice(Fragment.from(view.state.schema.text(text.replace(/\r\n?/g, "\n"))), 0, 0);
      view.someProp("transformPasted", (f) => {
        slice2 = f(slice2, view, true);
      });
      return slice2;
    }
    let parsed = view.someProp("clipboardTextParser", (f) => f(text, $context, plainText, view));
    if (parsed) {
      slice2 = parsed;
    } else {
      let marks = $context.marks();
      let { schema } = view.state, serializer = DOMSerializer.fromSchema(schema);
      dom = document.createElement("div");
      text.split(/(?:\r\n?|\n)+/).forEach((block) => {
        let p = dom.appendChild(document.createElement("p"));
        if (block)
          p.appendChild(serializer.serializeNode(schema.text(block, marks)));
      });
    }
  } else {
    view.someProp("transformPastedHTML", (f) => {
      html = f(html, view);
    });
    dom = readHTML(html);
    if (webkit)
      restoreReplacedSpaces(dom);
  }
  let contextNode = dom && dom.querySelector("[data-pm-slice]");
  let sliceData = contextNode && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(contextNode.getAttribute("data-pm-slice") || "");
  if (sliceData && sliceData[3])
    for (let i = +sliceData[3]; i > 0; i--) {
      let child = dom.firstChild;
      while (child && !isElt(child))
        child = child.nextSibling;
      if (!child)
        break;
      dom = child;
    }
  if (!slice2) {
    let parser = view.someProp("clipboardParser") || view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
    slice2 = parser.parseSlice(dom, {
      preserveWhitespace: !!(asText || sliceData),
      context: $context,
      ruleFromNode(dom2) {
        if (dom2.nodeName == "BR" && !dom2.nextSibling && dom2.parentNode && !inlineParents.test(dom2.parentNode.nodeName))
          return { ignore: true };
        return null;
      }
    });
  }
  if (sliceData) {
    slice2 = addContext(closeSlice(slice2, +sliceData[1], +sliceData[2]), sliceData[4]);
  } else {
    slice2 = Slice.maxOpen(normalizeSiblings(slice2.content, $context), true);
    if (slice2.openStart || slice2.openEnd) {
      let openStart = 0, openEnd = 0;
      for (let node = slice2.content.firstChild; openStart < slice2.openStart && !node.type.spec.isolating; openStart++, node = node.firstChild) {
      }
      for (let node = slice2.content.lastChild; openEnd < slice2.openEnd && !node.type.spec.isolating; openEnd++, node = node.lastChild) {
      }
      slice2 = closeSlice(slice2, openStart, openEnd);
    }
  }
  view.someProp("transformPasted", (f) => {
    slice2 = f(slice2, view, asText);
  });
  return slice2;
}
var inlineParents = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function normalizeSiblings(fragment, $context) {
  if (fragment.childCount < 2)
    return fragment;
  for (let d = $context.depth; d >= 0; d--) {
    let parent = $context.node(d);
    let match = parent.contentMatchAt($context.index(d));
    let lastWrap, result = [];
    fragment.forEach((node) => {
      if (!result)
        return;
      let wrap = match.findWrapping(node.type), inLast;
      if (!wrap)
        return result = null;
      if (inLast = result.length && lastWrap.length && addToSibling(wrap, lastWrap, node, result[result.length - 1], 0)) {
        result[result.length - 1] = inLast;
      } else {
        if (result.length)
          result[result.length - 1] = closeRight(result[result.length - 1], lastWrap.length);
        let wrapped = withWrappers(node, wrap);
        result.push(wrapped);
        match = match.matchType(wrapped.type);
        lastWrap = wrap;
      }
    });
    if (result)
      return Fragment.from(result);
  }
  return fragment;
}
function withWrappers(node, wrap, from2 = 0) {
  for (let i = wrap.length - 1; i >= from2; i--)
    node = wrap[i].create(null, Fragment.from(node));
  return node;
}
function addToSibling(wrap, lastWrap, node, sibling, depth) {
  if (depth < wrap.length && depth < lastWrap.length && wrap[depth] == lastWrap[depth]) {
    let inner = addToSibling(wrap, lastWrap, node, sibling.lastChild, depth + 1);
    if (inner)
      return sibling.copy(sibling.content.replaceChild(sibling.childCount - 1, inner));
    let match = sibling.contentMatchAt(sibling.childCount);
    if (match.matchType(depth == wrap.length - 1 ? node.type : wrap[depth + 1]))
      return sibling.copy(sibling.content.append(Fragment.from(withWrappers(node, wrap, depth + 1))));
  }
}
function closeRight(node, depth) {
  if (depth == 0)
    return node;
  let fragment = node.content.replaceChild(node.childCount - 1, closeRight(node.lastChild, depth - 1));
  let fill = node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true);
  return node.copy(fragment.append(fill));
}
function closeRange(fragment, side, from2, to, depth, openEnd) {
  let node = side < 0 ? fragment.firstChild : fragment.lastChild, inner = node.content;
  if (fragment.childCount > 1)
    openEnd = 0;
  if (depth < to - 1)
    inner = closeRange(inner, side, from2, to, depth + 1, openEnd);
  if (depth >= from2)
    inner = side < 0 ? node.contentMatchAt(0).fillBefore(inner, openEnd <= depth).append(inner) : inner.append(node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true));
  return fragment.replaceChild(side < 0 ? 0 : fragment.childCount - 1, node.copy(inner));
}
function closeSlice(slice2, openStart, openEnd) {
  if (openStart < slice2.openStart)
    slice2 = new Slice(closeRange(slice2.content, -1, openStart, slice2.openStart, 0, slice2.openEnd), openStart, slice2.openEnd);
  if (openEnd < slice2.openEnd)
    slice2 = new Slice(closeRange(slice2.content, 1, openEnd, slice2.openEnd, 0, 0), slice2.openStart, openEnd);
  return slice2;
}
var wrapMap = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
function detachedDoc() {
  return document.implementation.createHTMLDocument("title");
}
var _policy = null;
function maybeWrapTrusted(html) {
  let trustedTypes = window.trustedTypes;
  if (!trustedTypes)
    return html;
  if (!_policy) {
    if (_policy = trustedTypes.defaultPolicy)
      try {
        return _policy.createHTML(html);
      } catch (_a) {
      }
    _policy = trustedTypes.createPolicy("ProseMirrorClipboard", { createHTML: (s) => s });
  }
  return _policy.createHTML(html);
}
function readHTML(html) {
  let metas = /^(\s*<meta [^>]*>)*/.exec(html);
  if (metas)
    html = html.slice(metas[0].length);
  let doc2 = detachedDoc(), elt = doc2.body;
  let firstTag = /<([a-z][^>\s]+)/i.exec(html), wrap;
  if (wrap = firstTag && wrapMap[firstTag[1].toLowerCase()])
    html = wrap.map((n) => "<" + n + ">").join("") + html + wrap.map((n) => "</" + n + ">").reverse().join("");
  elt.innerHTML = maybeWrapTrusted(html);
  if (wrap)
    for (let i = 0; i < wrap.length; i++)
      elt = elt.querySelector(wrap[i]) || elt;
  for (let i = 0; i < doc2.styleSheets.length; i++) {
    let style2 = doc2.styleSheets[i];
    for (let j = 0; j < style2.rules.length; j++) {
      let rule = style2.rules[j];
      if (rule instanceof CSSStyleRule) {
        let matches = elt.querySelectorAll(rule.selectorText);
        for (let k = 0; k < matches.length; k++)
          matches[k].style.cssText += rule.style.cssText;
      }
    }
  }
  return elt;
}
function restoreReplacedSpaces(dom) {
  let nodes = dom.querySelectorAll(chrome ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.childNodes.length == 1 && node.textContent == "\xA0" && node.parentNode)
      node.parentNode.replaceChild(dom.ownerDocument.createTextNode(" "), node);
  }
}
function addContext(slice2, context) {
  if (!slice2.size)
    return slice2;
  let schema = slice2.content.firstChild.type.schema, array;
  try {
    array = JSON.parse(context);
  } catch (e) {
    return slice2;
  }
  let { content, openStart, openEnd } = slice2;
  for (let i = array.length - 2; i >= 0; i -= 2) {
    let type = schema.nodes[array[i]];
    if (!type || type.hasRequiredAttrs())
      break;
    try {
      content = Fragment.from(type.create(array[i + 1], content));
    } catch (e) {
      break;
    }
    openStart++;
    openEnd++;
  }
  return new Slice(content, openStart, openEnd);
}
var handlers = {};
var editHandlers = {};
var passiveHandlers = { touchstart: true, touchmove: true };
var InputState = class {
  constructor() {
    this.shiftKey = false;
    this.mouseDown = null;
    this.lastKeyCode = null;
    this.lastKeyCodeTime = 0;
    this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 };
    this.lastSelectionOrigin = null;
    this.lastSelectionTime = 0;
    this.lastIOSEnter = 0;
    this.lastIOSEnterFallbackTimeout = -1;
    this.lastFocus = 0;
    this.lastTouch = 0;
    this.lastChromeDelete = 0;
    this.composing = false;
    this.compositionNode = null;
    this.composingTimeout = -1;
    this.compositionNodes = [];
    this.compositionEndedAt = -2e8;
    this.compositionID = 1;
    this.badSafariComposition = false;
    this.compositionPendingChanges = 0;
    this.domChangeCount = 0;
    this.eventHandlers = /* @__PURE__ */ Object.create(null);
    this.hideSelectionGuard = null;
  }
};
function initInput(view) {
  for (let event in handlers) {
    let handler = handlers[event];
    view.dom.addEventListener(event, view.input.eventHandlers[event] = (event2) => {
      if (eventBelongsToView(view, event2) && !runCustomHandler(view, event2) && (view.editable || !(event2.type in editHandlers)))
        handler(view, event2);
    }, passiveHandlers[event] ? { passive: true } : void 0);
  }
  if (safari)
    view.dom.addEventListener("input", () => null);
  ensureListeners(view);
}
function setSelectionOrigin(view, origin) {
  view.input.lastSelectionOrigin = origin;
  view.input.lastSelectionTime = Date.now();
}
function destroyInput(view) {
  if (view.input.mouseDown)
    view.input.mouseDown.done();
  view.domObserver.stop();
  for (let type in view.input.eventHandlers)
    view.dom.removeEventListener(type, view.input.eventHandlers[type]);
  clearTimeout(view.input.composingTimeout);
  clearTimeout(view.input.lastIOSEnterFallbackTimeout);
}
function ensureListeners(view) {
  view.someProp("handleDOMEvents", (currentHandlers) => {
    for (let type in currentHandlers)
      if (!view.input.eventHandlers[type])
        view.dom.addEventListener(type, view.input.eventHandlers[type] = (event) => runCustomHandler(view, event));
  });
}
function runCustomHandler(view, event) {
  return view.someProp("handleDOMEvents", (handlers2) => {
    let handler = handlers2[event.type];
    return handler ? handler(view, event) || event.defaultPrevented : false;
  });
}
function eventBelongsToView(view, event) {
  if (!event.bubbles)
    return true;
  if (event.defaultPrevented)
    return false;
  for (let node = event.target; node != view.dom; node = node.parentNode)
    if (!node || node.nodeType == 11 || node.pmViewDesc && node.pmViewDesc.stopEvent(event))
      return false;
  return true;
}
function dispatchEvent(view, event) {
  if (!runCustomHandler(view, event) && handlers[event.type] && (view.editable || !(event.type in editHandlers)))
    handlers[event.type](view, event);
}
editHandlers.keydown = (view, _event) => {
  let event = _event;
  view.input.shiftKey = event.keyCode == 16 || event.shiftKey;
  if (inOrNearComposition(view))
    return;
  view.input.lastKeyCode = event.keyCode;
  view.input.lastKeyCodeTime = Date.now();
  if (android && chrome && event.keyCode == 13)
    return;
  if (event.keyCode != 229)
    view.domObserver.forceFlush();
  if (ios && event.keyCode == 13 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    let now = Date.now();
    view.input.lastIOSEnter = now;
    view.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
      if (view.input.lastIOSEnter == now) {
        view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")));
        view.input.lastIOSEnter = 0;
      }
    }, 200);
  } else if (view.someProp("handleKeyDown", (f) => f(view, event)) || captureKeyDown(view, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view, "key");
  }
};
editHandlers.keyup = (view, event) => {
  if (event.keyCode == 16)
    view.input.shiftKey = false;
};
editHandlers.keypress = (view, _event) => {
  let event = _event;
  if (inOrNearComposition(view) || !event.charCode || event.ctrlKey && !event.altKey || mac2 && event.metaKey)
    return;
  if (view.someProp("handleKeyPress", (f) => f(view, event))) {
    event.preventDefault();
    return;
  }
  let sel = view.state.selection;
  if (!(sel instanceof TextSelection) || !sel.$from.sameParent(sel.$to)) {
    let text = String.fromCharCode(event.charCode);
    let deflt = () => view.state.tr.insertText(text).scrollIntoView();
    if (!/[\r\n]/.test(text) && !view.someProp("handleTextInput", (f) => f(view, sel.$from.pos, sel.$to.pos, text, deflt)))
      view.dispatch(deflt());
    event.preventDefault();
  }
};
function eventCoords(event) {
  return { left: event.clientX, top: event.clientY };
}
function isNear(event, click) {
  let dx = click.x - event.clientX, dy = click.y - event.clientY;
  return dx * dx + dy * dy < 100;
}
function runHandlerOnContext(view, propName, pos, inside, event) {
  if (inside == -1)
    return false;
  let $pos = view.state.doc.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    if (view.someProp(propName, (f) => i > $pos.depth ? f(view, pos, $pos.nodeAfter, $pos.before(i), event, true) : f(view, pos, $pos.node(i), $pos.before(i), event, false)))
      return true;
  }
  return false;
}
function updateSelection(view, selection, origin) {
  if (!view.focused)
    view.focus();
  if (view.state.selection.eq(selection))
    return;
  let tr = view.state.tr.setSelection(selection);
  tr.setMeta("pointer", true);
  view.dispatch(tr);
}
function selectClickedLeaf(view, inside) {
  if (inside == -1)
    return false;
  let $pos = view.state.doc.resolve(inside), node = $pos.nodeAfter;
  if (node && node.isAtom && NodeSelection.isSelectable(node)) {
    updateSelection(view, new NodeSelection($pos));
    return true;
  }
  return false;
}
function selectClickedNode(view, inside) {
  if (inside == -1)
    return false;
  let sel = view.state.selection, selectedNode, selectAt;
  if (sel instanceof NodeSelection)
    selectedNode = sel.node;
  let $pos = view.state.doc.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    let node = i > $pos.depth ? $pos.nodeAfter : $pos.node(i);
    if (NodeSelection.isSelectable(node)) {
      if (selectedNode && sel.$from.depth > 0 && i >= sel.$from.depth && $pos.before(sel.$from.depth + 1) == sel.$from.pos)
        selectAt = $pos.before(sel.$from.depth);
      else
        selectAt = $pos.before(i);
      break;
    }
  }
  if (selectAt != null) {
    updateSelection(view, NodeSelection.create(view.state.doc, selectAt));
    return true;
  } else {
    return false;
  }
}
function handleSingleClick(view, pos, inside, event, selectNode) {
  return runHandlerOnContext(view, "handleClickOn", pos, inside, event) || view.someProp("handleClick", (f) => f(view, pos, event)) || (selectNode ? selectClickedNode(view, inside) : selectClickedLeaf(view, inside));
}
function handleDoubleClick(view, pos, inside, event) {
  return runHandlerOnContext(view, "handleDoubleClickOn", pos, inside, event) || view.someProp("handleDoubleClick", (f) => f(view, pos, event));
}
function handleTripleClick(view, pos, inside, event) {
  return runHandlerOnContext(view, "handleTripleClickOn", pos, inside, event) || view.someProp("handleTripleClick", (f) => f(view, pos, event)) || defaultTripleClick(view, inside, event);
}
function defaultTripleClick(view, inside, event) {
  if (event.button != 0)
    return false;
  let selection = selectionForTripleClick(view, inside, true), doc2 = view.state.doc;
  if (!selection)
    return false;
  updateSelection(view, selection);
  if (selection instanceof TextSelection && doc2.eq(view.state.doc))
    view.input.mouseDown = new TripleClickDrag(view, selection);
  return true;
}
function selectionForTripleClick(view, inside, selectNodes) {
  let doc2 = view.state.doc;
  if (inside == -1)
    return doc2.inlineContent ? TextSelection.create(doc2, 0, doc2.content.size) : null;
  let $pos = doc2.resolve(inside);
  for (let i = $pos.depth + 1; i > 0; i--) {
    let node = i > $pos.depth ? $pos.nodeAfter : $pos.node(i);
    let nodePos = $pos.before(i);
    if (node.inlineContent)
      return TextSelection.create(doc2, nodePos + 1, nodePos + 1 + node.content.size);
    else if (selectNodes && NodeSelection.isSelectable(node))
      return NodeSelection.create(doc2, nodePos);
  }
  return null;
}
function forceDOMFlush(view) {
  return endComposition(view);
}
var selectNodeModifier = mac2 ? "metaKey" : "ctrlKey";
handlers.mousedown = (view, _event) => {
  let event = _event;
  view.input.shiftKey = event.shiftKey;
  let flushed = forceDOMFlush(view);
  let now = Date.now(), type = "singleClick";
  if (now - view.input.lastClick.time < 500 && isNear(event, view.input.lastClick) && !event[selectNodeModifier] && view.input.lastClick.button == event.button) {
    if (view.input.lastClick.type == "singleClick")
      type = "doubleClick";
    else if (view.input.lastClick.type == "doubleClick")
      type = "tripleClick";
  }
  view.input.lastClick = { time: now, x: event.clientX, y: event.clientY, type, button: event.button };
  if (view.input.mouseDown)
    view.input.mouseDown.done();
  let pos = view.posAtCoords(eventCoords(event));
  if (!pos)
    return;
  if (type == "singleClick") {
    view.input.mouseDown = new LeftMouseDown(view, pos, event, !!flushed);
  } else if ((type == "doubleClick" ? handleDoubleClick : handleTripleClick)(view, pos.pos, pos.inside, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view, "pointer");
  }
};
var MouseDown = class {
  constructor(view) {
    this.view = view;
    this.mightDrag = null;
    view.root.addEventListener("mouseup", this.up = this.up.bind(this));
    view.root.addEventListener("mousemove", this.move = this.move.bind(this));
  }
  up(event) {
    this.done();
  }
  move(event) {
    if (event.buttons == 0)
      this.done();
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up);
    this.view.root.removeEventListener("mousemove", this.move);
    if (this.view.input.mouseDown == this)
      this.view.input.mouseDown = null;
  }
  delaySelUpdate() {
    return false;
  }
};
var LeftMouseDown = class extends MouseDown {
  constructor(view, pos, event, flushed) {
    super(view);
    this.pos = pos;
    this.event = event;
    this.flushed = flushed;
    this.delayedSelectionSync = false;
    this.startDoc = view.state.doc;
    this.selectNode = !!event[selectNodeModifier];
    this.allowDefault = event.shiftKey;
    let targetNode, targetPos;
    if (pos.inside > -1) {
      targetNode = view.state.doc.nodeAt(pos.inside);
      targetPos = pos.inside;
    } else {
      let $pos = view.state.doc.resolve(pos.pos);
      targetNode = $pos.parent;
      targetPos = $pos.depth ? $pos.before() : 0;
    }
    const target = flushed ? null : event.target;
    const targetDesc = target ? view.docView.nearestDesc(target, true) : null;
    this.target = targetDesc && isElt(targetDesc.nodeDOM) ? targetDesc.nodeDOM : null;
    let { selection } = view.state;
    if (event.button == 0 && (targetNode.type.spec.draggable && targetNode.type.spec.selectable !== false || selection instanceof NodeSelection && selection.from <= targetPos && selection.to > targetPos))
      this.mightDrag = {
        node: targetNode,
        pos: targetPos,
        addAttr: !!(this.target && !this.target.draggable),
        setUneditable: !!(this.target && gecko && !this.target.hasAttribute("contentEditable"))
      };
    if (this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable)) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.draggable = true;
      if (this.mightDrag.setUneditable)
        setTimeout(() => {
          if (this.view.input.mouseDown == this)
            this.target.setAttribute("contentEditable", "false");
        }, 20);
      this.view.domObserver.start();
    }
    setSelectionOrigin(view, "pointer");
  }
  done() {
    super.done();
    if (this.mightDrag && this.target) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.removeAttribute("draggable");
      if (this.mightDrag.setUneditable)
        this.target.removeAttribute("contentEditable");
      this.view.domObserver.start();
    }
    if (this.delayedSelectionSync)
      setTimeout(() => {
        if (!this.view.isDestroyed)
          selectionToDOM(this.view);
      });
  }
  up(event) {
    this.done();
    if (!this.view.dom.contains(event.target))
      return;
    let pos = this.pos;
    if (this.view.state.doc != this.startDoc)
      pos = this.view.posAtCoords(eventCoords(event));
    this.updateAllowDefault(event);
    if (this.allowDefault || !pos) {
      setSelectionOrigin(this.view, "pointer");
    } else if (handleSingleClick(this.view, pos.pos, pos.inside, event, this.selectNode)) {
      event.preventDefault();
    } else if (event.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    safari && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    chrome && !this.view.state.selection.visible && Math.min(Math.abs(pos.pos - this.view.state.selection.from), Math.abs(pos.pos - this.view.state.selection.to)) <= 2)) {
      updateSelection(this.view, Selection.near(this.view.state.doc.resolve(pos.pos)));
      event.preventDefault();
    } else {
      setSelectionOrigin(this.view, "pointer");
    }
  }
  move(event) {
    this.updateAllowDefault(event);
    setSelectionOrigin(this.view, "pointer");
    super.move(event);
  }
  updateAllowDefault(event) {
    if (!this.allowDefault && (Math.abs(this.event.x - event.clientX) > 4 || Math.abs(this.event.y - event.clientY) > 4))
      this.allowDefault = true;
  }
  delaySelUpdate() {
    if (!this.allowDefault)
      return false;
    this.delayedSelectionSync = true;
    return true;
  }
};
var TripleClickDrag = class extends MouseDown {
  constructor(view, startSelection) {
    super(view);
    this.startSelection = startSelection;
    this.startDoc = view.state.doc;
  }
  move(event) {
    if (event.buttons == 0 || this.view.isDestroyed || !this.view.state.doc.eq(this.startDoc)) {
      this.done();
      return;
    }
    event.preventDefault();
    setSelectionOrigin(this.view, "pointer");
    let pos = this.view.posAtCoords(eventCoords(event));
    let target = pos && selectionForTripleClick(this.view, pos.inside, false);
    if (!target)
      return;
    let { doc: doc2 } = this.view.state, start = this.startSelection;
    let [anchor, head] = target.from < start.from ? [start.to, target.from] : [start.from, target.to];
    updateSelection(this.view, TextSelection.create(doc2, anchor, head));
  }
};
handlers.touchstart = (view) => {
  view.input.lastTouch = Date.now();
  forceDOMFlush(view);
  setSelectionOrigin(view, "pointer");
};
handlers.touchmove = (view) => {
  view.input.lastTouch = Date.now();
  setSelectionOrigin(view, "pointer");
};
handlers.contextmenu = (view) => forceDOMFlush(view);
function inOrNearComposition(view, event) {
  if (view.composing)
    return true;
  if (safari && Math.abs(Date.now() - view.input.compositionEndedAt) < 500) {
    view.input.compositionEndedAt = -2e8;
    return true;
  }
  return false;
}
var timeoutComposition = android ? 5e3 : -1;
editHandlers.compositionstart = editHandlers.compositionupdate = (view) => {
  if (!view.composing) {
    view.domObserver.flush();
    let { state } = view, $pos = state.selection.$to;
    if (state.selection instanceof TextSelection && state.selection.empty && (state.storedMarks || !$pos.textOffset && $pos.parentOffset && $pos.nodeBefore.marks.some((m) => m.type.spec.inclusive === false) || chrome && windows && selectionBeforeUneditable(view))) {
      view.markCursor = view.state.storedMarks || $pos.marks();
      endComposition(view, true);
      view.markCursor = null;
    } else {
      endComposition(view, !state.selection.empty);
      if (gecko && state.selection.empty && $pos.parentOffset && !$pos.textOffset && $pos.nodeBefore.marks.length) {
        let sel = view.domSelectionRange();
        for (let node = sel.focusNode, offset3 = sel.focusOffset; node && isElt(node) && offset3 != 0; ) {
          let before = offset3 < 0 ? node.lastChild : node.childNodes[offset3 - 1];
          if (!before)
            break;
          if (isText(before)) {
            let sel2 = view.domSelection();
            if (sel2)
              sel2.collapse(before, before.nodeValue.length);
            break;
          } else {
            node = before;
            offset3 = -1;
          }
        }
      }
    }
    view.input.composing = true;
  }
  scheduleComposeEnd(view, timeoutComposition);
};
function selectionBeforeUneditable(view) {
  let { focusNode, focusOffset } = view.domSelectionRange();
  if (!focusNode || !isElt(focusNode) || focusOffset >= focusNode.childNodes.length)
    return false;
  let next = focusNode.childNodes[focusOffset];
  return isElt(next) && next.contentEditable == "false";
}
editHandlers.compositionend = (view, event) => {
  if (view.composing) {
    view.input.composing = false;
    view.input.compositionEndedAt = Date.now();
    view.input.compositionPendingChanges = view.domObserver.pendingRecords().length ? view.input.compositionID : 0;
    view.input.compositionNode = null;
    if (view.input.badSafariComposition)
      view.domObserver.forceFlush();
    else if (view.input.compositionPendingChanges)
      Promise.resolve().then(() => view.domObserver.flush());
    view.input.compositionID++;
    scheduleComposeEnd(view, 20);
  }
};
function scheduleComposeEnd(view, delay) {
  clearTimeout(view.input.composingTimeout);
  if (delay > -1)
    view.input.composingTimeout = setTimeout(() => endComposition(view), delay);
}
function clearComposition(view) {
  if (view.composing) {
    view.input.composing = false;
    view.input.compositionEndedAt = Date.now();
  }
  while (view.input.compositionNodes.length > 0)
    view.input.compositionNodes.pop().markParentsDirty();
}
function findCompositionNode(view) {
  let sel = view.domSelectionRange();
  if (!sel.focusNode)
    return null;
  let textBefore = textNodeBefore$1(sel.focusNode, sel.focusOffset);
  let textAfter = textNodeAfter$1(sel.focusNode, sel.focusOffset);
  if (textBefore && textAfter && textBefore != textAfter) {
    let descAfter = textAfter.pmViewDesc, lastChanged = view.domObserver.lastChangedTextNode;
    if (textBefore == lastChanged || textAfter == lastChanged)
      return lastChanged;
    if (!descAfter || !descAfter.isText(textAfter.nodeValue)) {
      return textAfter;
    } else if (view.input.compositionNode == textAfter) {
      let descBefore = textBefore.pmViewDesc;
      if (!(!descBefore || !descBefore.isText(textBefore.nodeValue)))
        return textAfter;
    }
  }
  return textBefore || textAfter;
}
function endComposition(view, restarting = false) {
  if (android && view.domObserver.flushingSoon >= 0)
    return;
  view.domObserver.forceFlush();
  clearComposition(view);
  if (restarting || view.docView && view.docView.dirty) {
    let sel = selectionFromDOM(view), cur = view.state.selection;
    if (sel && !sel.eq(cur))
      view.dispatch(view.state.tr.setSelection(sel));
    else if ((view.markCursor || restarting) && !cur.$from.node(cur.$from.sharedDepth(cur.to)).inlineContent)
      view.dispatch(view.state.tr.deleteSelection());
    else
      view.updateState(view.state);
    return true;
  }
  return false;
}
function captureCopy(view, dom) {
  if (!view.dom.parentNode)
    return;
  let wrap = view.dom.parentNode.appendChild(document.createElement("div"));
  wrap.appendChild(dom);
  wrap.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let sel = getSelection(), range = document.createRange();
  range.selectNodeContents(dom);
  view.dom.blur();
  sel.removeAllRanges();
  sel.addRange(range);
  setTimeout(() => {
    if (wrap.parentNode)
      wrap.parentNode.removeChild(wrap);
    view.focus();
  }, 50);
}
var brokenClipboardAPI = ie && ie_version < 15 || ios && webkit_version < 604;
handlers.copy = editHandlers.cut = (view, _event) => {
  let event = _event;
  let sel = view.state.selection, cut2 = event.type == "cut";
  if (sel.empty)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let slice2 = sel.content(), { dom, text } = serializeForClipboard(view, slice2);
  if (data) {
    event.preventDefault();
    data.clearData();
    data.setData("text/html", dom.innerHTML);
    data.setData("text/plain", text);
  } else {
    captureCopy(view, dom);
  }
  if (cut2)
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function sliceSingleNode(slice2) {
  return slice2.openStart == 0 && slice2.openEnd == 0 && slice2.content.childCount == 1 ? slice2.content.firstChild : null;
}
function capturePaste(view, event) {
  if (!view.dom.parentNode)
    return;
  let plainText = view.input.shiftKey || view.state.selection.$from.parent.type.spec.code;
  let target = view.dom.parentNode.appendChild(document.createElement(plainText ? "textarea" : "div"));
  if (!plainText)
    target.contentEditable = "true";
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.focus();
  let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
  setTimeout(() => {
    view.focus();
    if (target.parentNode)
      target.parentNode.removeChild(target);
    if (plainText)
      doPaste(view, target.value, null, plain, event);
    else
      doPaste(view, target.textContent, target.innerHTML, plain, event);
  }, 50);
}
function doPaste(view, text, html, preferPlain, event) {
  let slice2 = parseFromClipboard(view, text, html, preferPlain, view.state.selection.$from);
  if (view.someProp("handlePaste", (f) => f(view, event, slice2 || Slice.empty)))
    return true;
  if (!slice2)
    return false;
  let singleNode = sliceSingleNode(slice2);
  let tr = singleNode ? view.state.tr.replaceSelectionWith(singleNode, preferPlain) : view.state.tr.replaceSelection(slice2);
  view.dispatch(tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"));
  return true;
}
function getText(clipboardData) {
  let text = clipboardData.getData("text/plain") || clipboardData.getData("Text");
  if (text)
    return text;
  let uris = clipboardData.getData("text/uri-list");
  return uris ? uris.replace(/\r?\n/g, " ") : "";
}
editHandlers.paste = (view, _event) => {
  let event = _event;
  if (view.composing && !android)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
  if (data && doPaste(view, getText(data), data.getData("text/html"), plain, event))
    event.preventDefault();
  else
    capturePaste(view, event);
};
var Dragging = class {
  constructor(slice2, move, node) {
    this.slice = slice2;
    this.move = move;
    this.node = node;
  }
};
var dragCopyModifier = mac2 ? "altKey" : "ctrlKey";
function dragMoves(view, event) {
  let copy;
  view.someProp("dragCopies", (test) => {
    copy = copy || test(event);
  });
  return copy != null ? !copy : !event[dragCopyModifier];
}
handlers.dragstart = (view, _event) => {
  let event = _event;
  let mouseDown = view.input.mouseDown;
  if (mouseDown)
    mouseDown.done();
  if (!event.dataTransfer)
    return;
  let sel = view.state.selection;
  let pos = sel.empty ? null : view.posAtCoords(eventCoords(event));
  let node;
  if (pos && pos.pos >= sel.from && pos.pos <= (sel instanceof NodeSelection ? sel.to - 1 : sel.to)) ;
  else if (mouseDown && mouseDown.mightDrag) {
    node = NodeSelection.create(view.state.doc, mouseDown.mightDrag.pos);
  } else if (event.target && isElt(event.target)) {
    let desc = view.docView.nearestDesc(event.target, true);
    if (desc && desc.node.type.spec.draggable && desc != view.docView)
      node = NodeSelection.create(view.state.doc, desc.posBefore);
  }
  let draggedSlice = (node || view.state.selection).content();
  let { dom, text, slice: slice2 } = serializeForClipboard(view, draggedSlice);
  if (!event.dataTransfer.files.length || !chrome || chrome_version > 120)
    event.dataTransfer.clearData();
  event.dataTransfer.setData(brokenClipboardAPI ? "Text" : "text/html", dom.innerHTML);
  event.dataTransfer.effectAllowed = "copyMove";
  if (!brokenClipboardAPI)
    event.dataTransfer.setData("text/plain", text);
  view.dragging = new Dragging(slice2, dragMoves(view, event), node);
};
handlers.dragend = (view) => {
  let dragging = view.dragging;
  window.setTimeout(() => {
    if (view.dragging == dragging)
      view.dragging = null;
  }, 50);
};
editHandlers.dragover = editHandlers.dragenter = (_, e) => e.preventDefault();
editHandlers.drop = (view, event) => {
  try {
    handleDrop(view, event, view.dragging);
  } finally {
    view.dragging = null;
  }
};
function handleDrop(view, event, dragging) {
  if (!event.dataTransfer)
    return;
  let eventPos = view.posAtCoords(eventCoords(event));
  if (!eventPos)
    return;
  let $mouse = view.state.doc.resolve(eventPos.pos);
  let slice2 = dragging && dragging.slice;
  if (slice2) {
    view.someProp("transformPasted", (f) => {
      slice2 = f(slice2, view, false);
    });
  } else {
    slice2 = parseFromClipboard(view, getText(event.dataTransfer), brokenClipboardAPI ? null : event.dataTransfer.getData("text/html"), false, $mouse);
  }
  let move = !!(dragging && dragMoves(view, event));
  if (view.someProp("handleDrop", (f) => f(view, event, slice2 || Slice.empty, move))) {
    event.preventDefault();
    return;
  }
  if (!slice2)
    return;
  event.preventDefault();
  let insertPos = slice2 ? dropPoint(view.state.doc, $mouse.pos, slice2) : $mouse.pos;
  if (insertPos == null)
    insertPos = $mouse.pos;
  let tr = view.state.tr;
  if (move) {
    let { node } = dragging;
    if (node)
      node.replace(tr);
    else
      tr.deleteSelection();
  }
  let pos = tr.mapping.map(insertPos);
  let isNode2 = slice2.openStart == 0 && slice2.openEnd == 0 && slice2.content.childCount == 1;
  let beforeInsert = tr.doc;
  if (isNode2)
    tr.replaceRangeWith(pos, pos, slice2.content.firstChild);
  else
    tr.replaceRange(pos, pos, slice2);
  if (tr.doc.eq(beforeInsert))
    return;
  let $pos = tr.doc.resolve(pos);
  if (isNode2 && NodeSelection.isSelectable(slice2.content.firstChild) && $pos.nodeAfter && $pos.nodeAfter.sameMarkup(slice2.content.firstChild)) {
    tr.setSelection(new NodeSelection($pos));
  } else {
    let end = tr.mapping.map(insertPos);
    tr.mapping.maps[tr.mapping.maps.length - 1].forEach((_from, _to, _newFrom, newTo) => end = newTo);
    tr.setSelection(selectionBetween(view, $pos, tr.doc.resolve(end)));
  }
  view.focus();
  view.dispatch(tr.setMeta("uiEvent", "drop"));
}
handlers.focus = (view) => {
  view.input.lastFocus = Date.now();
  if (!view.focused) {
    view.domObserver.stop();
    view.dom.classList.add("ProseMirror-focused");
    view.domObserver.start();
    view.focused = true;
    setTimeout(() => {
      if (view.docView && view.hasFocus() && !view.domObserver.currentSelection.eq(view.domSelectionRange()))
        selectionToDOM(view);
    }, 20);
  }
};
handlers.blur = (view, _event) => {
  let event = _event;
  if (view.focused) {
    view.domObserver.stop();
    view.dom.classList.remove("ProseMirror-focused");
    view.domObserver.start();
    if (event.relatedTarget && view.dom.contains(event.relatedTarget))
      view.domObserver.currentSelection.clear();
    view.focused = false;
  }
};
handlers.beforeinput = (view, _event) => {
  let event = _event;
  if (android && event.inputType == "deleteContentBackward") {
    view.domObserver.flushSoon();
    let { domChangeCount } = view.input;
    setTimeout(() => {
      if (view.input.domChangeCount != domChangeCount)
        return;
      view.dom.blur();
      view.focus();
      if (view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace"))))
        return;
      let { $cursor } = view.state.selection;
      if ($cursor && $cursor.pos > 0)
        view.dispatch(view.state.tr.delete($cursor.pos - 1, $cursor.pos).scrollIntoView());
    }, 50);
  }
};
for (let prop in editHandlers)
  handlers[prop] = editHandlers[prop];
function compareObjs(a, b) {
  if (a == b)
    return true;
  for (let p in a)
    if (a[p] !== b[p])
      return false;
  for (let p in b)
    if (!(p in a))
      return false;
  return true;
}
var WidgetType = class _WidgetType {
  constructor(toDOM, spec) {
    this.toDOM = toDOM;
    this.spec = spec || noSpec;
    this.side = this.spec.side || 0;
  }
  map(mapping, span, offset3, oldOffset) {
    let { pos, deleted } = mapping.mapResult(span.from + oldOffset, this.side < 0 ? -1 : 1);
    return deleted ? null : new Decoration(pos - offset3, pos - offset3, this);
  }
  valid() {
    return true;
  }
  eq(other) {
    return this == other || other instanceof _WidgetType && (this.spec.key && this.spec.key == other.spec.key || this.toDOM == other.toDOM && compareObjs(this.spec, other.spec));
  }
  destroy(node) {
    if (this.spec.destroy)
      this.spec.destroy(node);
  }
};
var InlineType = class _InlineType {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset3, oldOffset) {
    let from2 = mapping.map(span.from + oldOffset, this.spec.inclusiveStart ? -1 : 1) - offset3;
    let to = mapping.map(span.to + oldOffset, this.spec.inclusiveEnd ? 1 : -1) - offset3;
    return from2 >= to ? null : new Decoration(from2, to, this);
  }
  valid(_, span) {
    return span.from < span.to;
  }
  eq(other) {
    return this == other || other instanceof _InlineType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  static is(span) {
    return span.type instanceof _InlineType;
  }
  destroy() {
  }
};
var NodeType = class _NodeType {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset3, oldOffset) {
    let from2 = mapping.mapResult(span.from + oldOffset, 1);
    if (from2.deleted)
      return null;
    let to = mapping.mapResult(span.to + oldOffset, -1);
    if (to.deleted || to.pos <= from2.pos)
      return null;
    return new Decoration(from2.pos - offset3, to.pos - offset3, this);
  }
  valid(node, span) {
    let { index, offset: offset3 } = node.content.findIndex(span.from), child;
    return offset3 == span.from && !(child = node.child(index)).isText && offset3 + child.nodeSize == span.to;
  }
  eq(other) {
    return this == other || other instanceof _NodeType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  destroy() {
  }
};
var Decoration = class _Decoration {
  /**
  @internal
  */
  constructor(from2, to, type) {
    this.from = from2;
    this.to = to;
    this.type = type;
  }
  /**
  @internal
  */
  copy(from2, to) {
    return new _Decoration(from2, to, this.type);
  }
  /**
  @internal
  */
  eq(other, offset3 = 0) {
    return this.type.eq(other.type) && this.from + offset3 == other.from && this.to + offset3 == other.to;
  }
  /**
  @internal
  */
  map(mapping, offset3, oldOffset) {
    return this.type.map(mapping, this, offset3, oldOffset);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(pos, toDOM, spec) {
    return new _Decoration(pos, pos, new WidgetType(toDOM, spec));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(from2, to, attrs, spec) {
    return new _Decoration(from2, to, new InlineType(attrs, spec));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(from2, to, attrs, spec) {
    return new _Decoration(from2, to, new NodeType(attrs, spec));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof InlineType;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof WidgetType;
  }
};
var none = [];
var noSpec = {};
var DecorationSet = class _DecorationSet {
  /**
  @internal
  */
  constructor(local, children) {
    this.local = local.length ? local : none;
    this.children = children.length ? children : none;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(doc2, decorations) {
    return decorations.length ? buildTree(decorations, doc2, 0, noSpec) : empty;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(start, end, predicate) {
    let result = [];
    this.findInner(start == null ? 0 : start, end == null ? 1e9 : end, result, 0, predicate);
    return result;
  }
  findInner(start, end, result, offset3, predicate) {
    for (let i = 0; i < this.local.length; i++) {
      let span = this.local[i];
      if (span.from <= end && span.to >= start && (!predicate || predicate(span.spec)))
        result.push(span.copy(span.from + offset3, span.to + offset3));
    }
    for (let i = 0; i < this.children.length; i += 3) {
      if (this.children[i] < end && this.children[i + 1] > start) {
        let childOff = this.children[i] + 1;
        this.children[i + 2].findInner(start - childOff, end - childOff, result, offset3 + childOff, predicate);
      }
    }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(mapping, doc2, options) {
    if (this == empty || mapping.maps.length == 0)
      return this;
    return this.mapInner(mapping, doc2, 0, 0, options || noSpec);
  }
  /**
  @internal
  */
  mapInner(mapping, node, offset3, oldOffset, options) {
    let newLocal;
    for (let i = 0; i < this.local.length; i++) {
      let mapped = this.local[i].map(mapping, offset3, oldOffset);
      if (mapped && mapped.type.valid(node, mapped))
        (newLocal || (newLocal = [])).push(mapped);
      else if (options.onRemove)
        options.onRemove(this.local[i].spec);
    }
    if (this.children.length)
      return mapChildren(this.children, newLocal || [], mapping, node, offset3, oldOffset, options);
    else
      return newLocal ? new _DecorationSet(newLocal.sort(byPos), none) : empty;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(doc2, decorations) {
    if (!decorations.length)
      return this;
    if (this == empty)
      return _DecorationSet.create(doc2, decorations);
    return this.addInner(doc2, decorations, 0);
  }
  addInner(doc2, decorations, offset3) {
    let children, childIndex = 0;
    doc2.forEach((childNode, childOffset) => {
      let baseOffset = childOffset + offset3, found;
      if (!(found = takeSpansForNode(decorations, childNode, baseOffset)))
        return;
      if (!children)
        children = this.children.slice();
      while (childIndex < children.length && children[childIndex] < childOffset)
        childIndex += 3;
      if (children[childIndex] == childOffset)
        children[childIndex + 2] = children[childIndex + 2].addInner(childNode, found, baseOffset + 1);
      else
        children.splice(childIndex, 0, childOffset, childOffset + childNode.nodeSize, buildTree(found, childNode, baseOffset + 1, noSpec));
      childIndex += 3;
    });
    let local = moveSpans(childIndex ? withoutNulls(decorations) : decorations, -offset3);
    for (let i = 0; i < local.length; i++)
      if (!local[i].type.valid(doc2, local[i]))
        local.splice(i--, 1);
    return new _DecorationSet(local.length ? this.local.concat(local).sort(byPos) : this.local, children || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(decorations) {
    if (decorations.length == 0 || this == empty)
      return this;
    return this.removeInner(decorations, 0);
  }
  removeInner(decorations, offset3) {
    let children = this.children, local = this.local;
    for (let i = 0; i < children.length; i += 3) {
      let found;
      let from2 = children[i] + offset3, to = children[i + 1] + offset3;
      for (let j = 0, span; j < decorations.length; j++)
        if (span = decorations[j]) {
          if (span.from > from2 && span.to < to) {
            decorations[j] = null;
            (found || (found = [])).push(span);
          }
        }
      if (!found)
        continue;
      if (children == this.children)
        children = this.children.slice();
      let removed = children[i + 2].removeInner(found, from2 + 1);
      if (removed != empty) {
        children[i + 2] = removed;
      } else {
        children.splice(i, 3);
        i -= 3;
      }
    }
    if (local.length) {
      for (let i = 0, span; i < decorations.length; i++)
        if (span = decorations[i]) {
          for (let j = 0; j < local.length; j++)
            if (local[j].eq(span, offset3)) {
              if (local == this.local)
                local = this.local.slice();
              local.splice(j--, 1);
            }
        }
    }
    if (children == this.children && local == this.local)
      return this;
    return local.length || children.length ? new _DecorationSet(local, children) : empty;
  }
  forChild(offset3, node) {
    if (this == empty)
      return this;
    if (node.isLeaf)
      return _DecorationSet.empty;
    let child, local;
    for (let i = 0; i < this.children.length; i += 3)
      if (this.children[i] >= offset3) {
        if (this.children[i] == offset3)
          child = this.children[i + 2];
        break;
      }
    let start = offset3 + 1, end = start + node.content.size;
    for (let i = 0; i < this.local.length; i++) {
      let dec = this.local[i];
      if (dec.from < end && dec.to > start && dec.type instanceof InlineType) {
        let from2 = Math.max(start, dec.from) - start, to = Math.min(end, dec.to) - start;
        if (from2 < to)
          (local || (local = [])).push(dec.copy(from2, to));
      }
    }
    if (local) {
      let localSet = new _DecorationSet(local.sort(byPos), none);
      return child ? new DecorationGroup([localSet, child]) : localSet;
    }
    return child || empty;
  }
  /**
  @internal
  */
  eq(other) {
    if (this == other)
      return true;
    if (!(other instanceof _DecorationSet) || this.local.length != other.local.length || this.children.length != other.children.length)
      return false;
    for (let i = 0; i < this.local.length; i++)
      if (!this.local[i].eq(other.local[i]))
        return false;
    for (let i = 0; i < this.children.length; i += 3)
      if (this.children[i] != other.children[i] || this.children[i + 1] != other.children[i + 1] || !this.children[i + 2].eq(other.children[i + 2]))
        return false;
    return true;
  }
  /**
  @internal
  */
  locals(node) {
    return removeOverlap(this.localsInner(node));
  }
  /**
  @internal
  */
  localsInner(node) {
    if (this == empty)
      return none;
    if (node.inlineContent || !this.local.some(InlineType.is))
      return this.local;
    let result = [];
    for (let i = 0; i < this.local.length; i++) {
      if (!(this.local[i].type instanceof InlineType))
        result.push(this.local[i]);
    }
    return result;
  }
  forEachSet(f) {
    f(this);
  }
};
DecorationSet.empty = new DecorationSet([], []);
DecorationSet.removeOverlap = removeOverlap;
var empty = DecorationSet.empty;
var DecorationGroup = class _DecorationGroup {
  constructor(members) {
    this.members = members;
  }
  map(mapping, doc2) {
    const mappedDecos = this.members.map((member) => member.map(mapping, doc2, noSpec));
    return _DecorationGroup.from(mappedDecos);
  }
  forChild(offset3, child) {
    if (child.isLeaf)
      return DecorationSet.empty;
    let found = [];
    for (let i = 0; i < this.members.length; i++) {
      let result = this.members[i].forChild(offset3, child);
      if (result == empty)
        continue;
      if (result instanceof _DecorationGroup)
        found = found.concat(result.members);
      else
        found.push(result);
    }
    return _DecorationGroup.from(found);
  }
  eq(other) {
    if (!(other instanceof _DecorationGroup) || other.members.length != this.members.length)
      return false;
    for (let i = 0; i < this.members.length; i++)
      if (!this.members[i].eq(other.members[i]))
        return false;
    return true;
  }
  locals(node) {
    let result, sorted = true;
    for (let i = 0; i < this.members.length; i++) {
      let locals = this.members[i].localsInner(node);
      if (!locals.length)
        continue;
      if (!result) {
        result = locals;
      } else {
        if (sorted) {
          result = result.slice();
          sorted = false;
        }
        for (let j = 0; j < locals.length; j++)
          result.push(locals[j]);
      }
    }
    return result ? removeOverlap(sorted ? result : result.sort(byPos)) : none;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(members) {
    switch (members.length) {
      case 0:
        return empty;
      case 1:
        return members[0];
      default:
        return new _DecorationGroup(members.every((m) => m instanceof DecorationSet) ? members : members.reduce((r, m) => r.concat(m instanceof DecorationSet ? m : m.members), []));
    }
  }
  forEachSet(f) {
    for (let i = 0; i < this.members.length; i++)
      this.members[i].forEachSet(f);
  }
};
function mapChildren(oldChildren, newLocal, mapping, node, offset3, oldOffset, options) {
  let children = oldChildren.slice();
  for (let i = 0, baseOffset = oldOffset; i < mapping.maps.length; i++) {
    let moved = 0;
    mapping.maps[i].forEach((oldStart, oldEnd, newStart, newEnd) => {
      let dSize = newEnd - newStart - (oldEnd - oldStart);
      for (let i2 = 0; i2 < children.length; i2 += 3) {
        let end = children[i2 + 1];
        if (end < 0 || oldStart > end + baseOffset - moved)
          continue;
        let start = children[i2] + baseOffset - moved;
        if (oldEnd >= start) {
          children[i2 + 1] = oldStart <= start ? -2 : -1;
        } else if (oldStart >= baseOffset && dSize) {
          children[i2] += dSize;
          children[i2 + 1] += dSize;
        }
      }
      moved += dSize;
    });
    baseOffset = mapping.maps[i].map(baseOffset, -1);
  }
  let mustRebuild = false;
  for (let i = 0; i < children.length; i += 3)
    if (children[i + 1] < 0) {
      if (children[i + 1] == -2) {
        mustRebuild = true;
        children[i + 1] = -1;
        continue;
      }
      let from2 = mapping.map(oldChildren[i] + oldOffset), fromLocal = from2 - offset3;
      if (fromLocal < 0 || fromLocal >= node.content.size) {
        mustRebuild = true;
        continue;
      }
      let to = mapping.map(oldChildren[i + 1] + oldOffset, -1), toLocal = to - offset3;
      let { index, offset: childOffset } = node.content.findIndex(fromLocal);
      let childNode = node.maybeChild(index);
      if (childNode && childOffset == fromLocal && childOffset + childNode.nodeSize == toLocal) {
        let mapped = children[i + 2].mapInner(mapping, childNode, from2 + 1, oldChildren[i] + oldOffset + 1, options);
        if (mapped != empty) {
          children[i] = fromLocal;
          children[i + 1] = toLocal;
          children[i + 2] = mapped;
        } else {
          children[i + 1] = -2;
          mustRebuild = true;
        }
      } else {
        mustRebuild = true;
      }
    }
  if (mustRebuild) {
    let decorations = mapAndGatherRemainingDecorations(children, oldChildren, newLocal, mapping, offset3, oldOffset, options);
    let built = buildTree(decorations, node, 0, options);
    newLocal = built.local;
    for (let i = 0; i < children.length; i += 3)
      if (children[i + 1] < 0) {
        children.splice(i, 3);
        i -= 3;
      }
    for (let i = 0, j = 0; i < built.children.length; i += 3) {
      let from2 = built.children[i];
      while (j < children.length && children[j] < from2)
        j += 3;
      children.splice(j, 0, built.children[i], built.children[i + 1], built.children[i + 2]);
    }
  }
  return new DecorationSet(newLocal.sort(byPos), children);
}
function moveSpans(spans, offset3) {
  if (!offset3 || !spans.length)
    return spans;
  let result = [];
  for (let i = 0; i < spans.length; i++) {
    let span = spans[i];
    result.push(new Decoration(span.from + offset3, span.to + offset3, span.type));
  }
  return result;
}
function mapAndGatherRemainingDecorations(children, oldChildren, decorations, mapping, offset3, oldOffset, options) {
  function gather(set, oldOffset2) {
    for (let i = 0; i < set.local.length; i++) {
      let mapped = set.local[i].map(mapping, offset3, oldOffset2);
      if (mapped)
        decorations.push(mapped);
      else if (options.onRemove)
        options.onRemove(set.local[i].spec);
    }
    for (let i = 0; i < set.children.length; i += 3)
      gather(set.children[i + 2], set.children[i] + oldOffset2 + 1);
  }
  for (let i = 0; i < children.length; i += 3)
    if (children[i + 1] == -1)
      gather(children[i + 2], oldChildren[i] + oldOffset + 1);
  return decorations;
}
function takeSpansForNode(spans, node, offset3) {
  if (node.isLeaf)
    return null;
  let end = offset3 + node.nodeSize, found = null;
  for (let i = 0, span; i < spans.length; i++) {
    if ((span = spans[i]) && span.from > offset3 && span.to < end) {
      (found || (found = [])).push(span);
      spans[i] = null;
    }
  }
  return found;
}
function withoutNulls(array) {
  let result = [];
  for (let i = 0; i < array.length; i++)
    if (array[i] != null)
      result.push(array[i]);
  return result;
}
function buildTree(spans, node, offset3, options) {
  let children = [], hasNulls = false;
  node.forEach((childNode, localStart) => {
    let found = takeSpansForNode(spans, childNode, localStart + offset3);
    if (found) {
      hasNulls = true;
      let subtree = buildTree(found, childNode, offset3 + localStart + 1, options);
      if (subtree != empty)
        children.push(localStart, localStart + childNode.nodeSize, subtree);
    }
  });
  let locals = moveSpans(hasNulls ? withoutNulls(spans) : spans, -offset3).sort(byPos);
  for (let i = 0; i < locals.length; i++)
    if (!locals[i].type.valid(node, locals[i])) {
      if (options.onRemove)
        options.onRemove(locals[i].spec);
      locals.splice(i--, 1);
    }
  return locals.length || children.length ? new DecorationSet(locals, children) : empty;
}
function byPos(a, b) {
  return a.from - b.from || a.to - b.to;
}
function removeOverlap(spans) {
  let working = spans;
  for (let i = 0; i < working.length - 1; i++) {
    let span = working[i];
    if (span.from != span.to)
      for (let j = i + 1; j < working.length; j++) {
        let next = working[j];
        if (next.from == span.from) {
          if (next.to != span.to) {
            if (working == spans)
              working = spans.slice();
            working[j] = next.copy(next.from, span.to);
            insertAhead(working, j + 1, next.copy(span.to, next.to));
          }
          continue;
        } else {
          if (next.from < span.to) {
            if (working == spans)
              working = spans.slice();
            working[i] = span.copy(span.from, next.from);
            insertAhead(working, j, span.copy(next.from, span.to));
          }
          break;
        }
      }
  }
  return working;
}
function insertAhead(array, i, deco) {
  while (i < array.length && byPos(deco, array[i]) > 0)
    i++;
  array.splice(i, 0, deco);
}
function viewDecorations(view) {
  let found = [];
  view.someProp("decorations", (f) => {
    let result = f(view.state);
    if (result && result != empty)
      found.push(result);
  });
  if (view.cursorWrapper)
    found.push(DecorationSet.create(view.state.doc, [view.cursorWrapper.deco]));
  return DecorationGroup.from(found);
}
var observeOptions = {
  childList: true,
  characterData: true,
  characterDataOldValue: true,
  attributes: true,
  attributeOldValue: true,
  subtree: true
};
var useCharData = ie && ie_version <= 11;
var SelectionState = class {
  constructor() {
    this.anchorNode = null;
    this.anchorOffset = 0;
    this.focusNode = null;
    this.focusOffset = 0;
  }
  set(sel) {
    this.anchorNode = sel.anchorNode;
    this.anchorOffset = sel.anchorOffset;
    this.focusNode = sel.focusNode;
    this.focusOffset = sel.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(sel) {
    return sel.anchorNode == this.anchorNode && sel.anchorOffset == this.anchorOffset && sel.focusNode == this.focusNode && sel.focusOffset == this.focusOffset;
  }
};
var DOMObserver = class {
  constructor(view, handleDOMChange) {
    this.view = view;
    this.handleDOMChange = handleDOMChange;
    this.queue = [];
    this.flushingSoon = -1;
    this.observer = null;
    this.currentSelection = new SelectionState();
    this.onCharData = null;
    this.suppressingSelectionUpdates = false;
    this.lastChangedTextNode = null;
    this.observer = window.MutationObserver && new window.MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++)
        this.queue.push(mutations[i]);
      if (ie && ie_version <= 11 && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length)) {
        this.flushSoon();
      } else if (safari && view.composing && mutations.some((m) => m.type == "childList" && m.target.nodeName == "TR")) {
        view.input.badSafariComposition = true;
        this.flushSoon();
      } else {
        this.flush();
      }
    });
    if (useCharData) {
      this.onCharData = (e) => {
        this.queue.push({ target: e.target, type: "characterData", oldValue: e.prevValue });
        this.flushSoon();
      };
    }
    this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    if (this.flushingSoon < 0)
      this.flushingSoon = window.setTimeout(() => {
        this.flushingSoon = -1;
        this.flush();
      }, 20);
  }
  forceFlush() {
    if (this.flushingSoon > -1) {
      window.clearTimeout(this.flushingSoon);
      this.flushingSoon = -1;
      this.flush();
    }
  }
  start() {
    if (this.observer) {
      this.observer.takeRecords();
      this.observer.observe(this.view.dom, observeOptions);
    }
    if (this.onCharData)
      this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
    this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let take = this.observer.takeRecords();
      if (take.length) {
        for (let i = 0; i < take.length; i++)
          this.queue.push(take[i]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    if (this.onCharData)
      this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = true;
    setTimeout(() => this.suppressingSelectionUpdates = false, 50);
  }
  onSelectionChange() {
    if (!hasFocusAndSelection(this.view))
      return;
    if (this.suppressingSelectionUpdates)
      return selectionToDOM(this.view);
    if (ie && ie_version <= 11 && !this.view.state.selection.empty) {
      let sel = this.view.domSelectionRange();
      if (sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
        return this.flushSoon();
    }
    this.flush();
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(sel) {
    if (!sel.focusNode)
      return true;
    let ancestors = /* @__PURE__ */ new Set(), container;
    for (let scan = sel.focusNode; scan; scan = parentNode(scan))
      ancestors.add(scan);
    for (let scan = sel.anchorNode; scan; scan = parentNode(scan))
      if (ancestors.has(scan)) {
        container = scan;
        break;
      }
    let desc = container && this.view.docView.nearestDesc(container);
    if (desc && desc.ignoreMutation({
      type: "selection",
      target: isText(container) ? container.parentNode : container
    })) {
      this.setCurSelection();
      return true;
    }
  }
  pendingRecords() {
    if (this.observer)
      for (let mut of this.observer.takeRecords())
        this.queue.push(mut);
    return this.queue;
  }
  flush() {
    let { view } = this;
    if (!view.docView || this.flushingSoon > -1)
      return;
    let mutations = this.pendingRecords();
    if (mutations.length)
      this.queue = [];
    let sel = view.domSelectionRange();
    let newSel = !this.suppressingSelectionUpdates && !this.currentSelection.eq(sel) && hasFocusAndSelection(view) && !this.ignoreSelectionChange(sel);
    let from2 = -1, to = -1, typeOver = false, added = [];
    if (view.editable) {
      for (let i = 0; i < mutations.length; i++) {
        let result = this.registerMutation(mutations[i], added);
        if (result) {
          from2 = from2 < 0 ? result.from : Math.min(result.from, from2);
          to = to < 0 ? result.to : Math.max(result.to, to);
          if (result.typeOver)
            typeOver = true;
        }
      }
    }
    if (added.some((n) => n.nodeName == "BR") && (view.input.lastKeyCode == 8 || view.input.lastKeyCode == 46 || chrome && (view.composing || view.input.compositionEndedAt > Date.now() - 50) && mutations.some((m) => m.type == "childList" && m.removedNodes.length))) {
      for (let node of added)
        if (node.nodeName == "BR" && node.parentNode) {
          let after = node.nextSibling;
          while (after && isElt(after)) {
            if (after.contentEditable == "false") {
              node.parentNode.removeChild(node);
              break;
            }
            after = after.firstChild;
          }
        }
    } else if (gecko && added.length) {
      let brs = added.filter((n) => n.nodeName == "BR");
      if (brs.length == 2) {
        let [a, b] = brs;
        if (a.parentNode && a.parentNode.parentNode == b.parentNode)
          b.remove();
        else
          a.remove();
      } else {
        let { focusNode } = this.currentSelection;
        for (let br of brs) {
          let parent = br.parentNode;
          if (parent && parent.nodeName == "LI" && (!focusNode || blockParent(view, focusNode) != parent))
            br.remove();
        }
      }
    }
    let readSel = null;
    if (from2 < 0 && newSel && view.input.lastFocus > Date.now() - 200 && Math.max(view.input.lastTouch, view.input.lastClick.time) < Date.now() - 300 && selectionCollapsed(sel) && (readSel = selectionFromDOM(view)) && readSel.eq(Selection.near(view.state.doc.resolve(0), 1))) {
      view.input.lastFocus = 0;
      selectionToDOM(view);
      this.currentSelection.set(sel);
      view.scrollToSelection();
    } else if (from2 > -1 || newSel) {
      if (from2 > -1) {
        view.docView.markDirty(from2, to);
        checkCSS(view);
      }
      if (view.input.badSafariComposition) {
        view.input.badSafariComposition = false;
        fixUpBadSafariComposition(view, added);
      }
      this.handleDOMChange(from2, to, typeOver, added);
      if (view.docView && view.docView.dirty)
        view.updateState(view.state);
      else if (!this.currentSelection.eq(sel))
        selectionToDOM(view);
      this.currentSelection.set(sel);
    }
  }
  registerMutation(mut, added) {
    if (added.indexOf(mut.target) > -1)
      return null;
    let desc = this.view.docView.nearestDesc(mut.target);
    if (mut.type == "attributes" && (desc == this.view.docView || mut.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    mut.attributeName == "style" && !mut.oldValue && !mut.target.getAttribute("style")))
      return null;
    if (!desc || desc.ignoreMutation(mut))
      return null;
    if (mut.type == "childList") {
      for (let i = 0; i < mut.addedNodes.length; i++) {
        let node = mut.addedNodes[i];
        added.push(node);
        if (isText(node))
          this.lastChangedTextNode = node;
      }
      if (desc.contentDOM && desc.contentDOM != desc.dom && !desc.contentDOM.contains(mut.target))
        return { from: desc.posBefore, to: desc.posAfter };
      let prev = mut.previousSibling, next = mut.nextSibling;
      if (ie && ie_version <= 11 && mut.addedNodes.length) {
        for (let i = 0; i < mut.addedNodes.length; i++) {
          let { previousSibling, nextSibling } = mut.addedNodes[i];
          if (!previousSibling || Array.prototype.indexOf.call(mut.addedNodes, previousSibling) < 0)
            prev = previousSibling;
          if (!nextSibling || Array.prototype.indexOf.call(mut.addedNodes, nextSibling) < 0)
            next = nextSibling;
        }
      }
      let fromOffset = prev && prev.parentNode == mut.target ? domIndex(prev) + 1 : 0;
      let from2 = desc.localPosFromDOM(mut.target, fromOffset, -1);
      let toOffset = next && next.parentNode == mut.target ? domIndex(next) : mut.target.childNodes.length;
      let to = desc.localPosFromDOM(mut.target, toOffset, 1);
      return { from: from2, to };
    } else if (mut.type == "attributes") {
      return { from: desc.posAtStart - desc.border, to: desc.posAtEnd + desc.border };
    } else {
      this.lastChangedTextNode = mut.target;
      return {
        from: desc.posAtStart,
        to: desc.posAtEnd,
        // An event was generated for a text change that didn't change
        // any text. Mark the dom change to fall back to assuming the
        // selection was typed over with an identical value if it can't
        // find another change.
        typeOver: mut.target.nodeValue == mut.oldValue
      };
    }
  }
};
var cssChecked = /* @__PURE__ */ new WeakMap();
var cssCheckWarned = false;
function checkCSS(view) {
  if (cssChecked.has(view))
    return;
  cssChecked.set(view, null);
  if (["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(view.dom).whiteSpace) !== -1) {
    view.requiresGeckoHackNode = gecko;
    if (cssCheckWarned)
      return;
    console["warn"]("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package.");
    cssCheckWarned = true;
  }
}
function rangeToSelectionRange(view, range) {
  let anchorNode = range.startContainer, anchorOffset = range.startOffset;
  let focusNode = range.endContainer, focusOffset = range.endOffset;
  let currentAnchor = view.domAtPos(view.state.selection.anchor);
  if (isEquivalentPosition(currentAnchor.node, currentAnchor.offset, focusNode, focusOffset))
    [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
  return { anchorNode, anchorOffset, focusNode, focusOffset };
}
function safariShadowSelectionRange(view, selection) {
  if (selection.getComposedRanges) {
    let range = selection.getComposedRanges(view.root)[0];
    if (range)
      return rangeToSelectionRange(view, range);
  }
  let found;
  function read(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    found = event.getTargetRanges()[0];
  }
  view.dom.addEventListener("beforeinput", read, true);
  document.execCommand("indent");
  view.dom.removeEventListener("beforeinput", read, true);
  return found ? rangeToSelectionRange(view, found) : null;
}
function blockParent(view, node) {
  for (let p = node.parentNode; p && p != view.dom; p = p.parentNode) {
    let desc = view.docView.nearestDesc(p, true);
    if (desc && desc.node.isBlock)
      return p;
  }
  return null;
}
function fixUpBadSafariComposition(view, addedNodes) {
  var _a;
  let { focusNode, focusOffset } = view.domSelectionRange();
  for (let node of addedNodes) {
    if (((_a = node.parentNode) === null || _a === void 0 ? void 0 : _a.nodeName) == "TR") {
      let nextCell2 = node.nextSibling;
      while (nextCell2 && (nextCell2.nodeName != "TD" && nextCell2.nodeName != "TH"))
        nextCell2 = nextCell2.nextSibling;
      if (nextCell2) {
        let parent = nextCell2;
        for (; ; ) {
          let first2 = parent.firstChild;
          if (!first2 || !isElt(first2) || first2.contentEditable == "false" || /^(BR|IMG)$/.test(first2.nodeName))
            break;
          parent = first2;
        }
        parent.insertBefore(node, parent.firstChild);
        if (focusNode == node)
          view.domSelection().collapse(node, focusOffset);
      } else {
        node.parentNode.removeChild(node);
      }
    }
  }
}
function parseBetween(view, from_, to_, addedNodes) {
  let { node: parent, fromOffset, toOffset, from: from2, to } = view.docView.parseRange(from_, to_);
  let domSel = view.domSelectionRange();
  let find;
  let anchor = domSel.anchorNode;
  if (anchor && contains(view.dom, anchor)) {
    find = [{ node: anchor, offset: domSel.anchorOffset }];
    if (!selectionCollapsed(domSel))
      find.push({ node: domSel.focusNode, offset: domSel.focusOffset });
  }
  if (chrome && view.input.lastKeyCode === 8) {
    for (let off = toOffset; off > fromOffset; off--) {
      let node = parent.childNodes[off - 1], desc = node.pmViewDesc;
      if (node.nodeName == "BR" && !desc) {
        toOffset = off;
        break;
      }
      if (!desc || desc.size)
        break;
    }
  }
  let startDoc = view.state.doc;
  let parser = view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
  let $from = startDoc.resolve(from2);
  let sel = null, doc2 = parser.parse(parent, {
    topNode: $from.parent,
    topMatch: $from.parent.contentMatchAt($from.index()),
    topOpen: true,
    from: fromOffset,
    to: toOffset,
    preserveWhitespace: $from.parent.type.whitespace == "pre" ? "full" : true,
    findPositions: find,
    ruleFromNode: ruleFromNode(addedNodes),
    context: $from
  });
  if (find && find[0].pos != null) {
    let anchor2 = find[0].pos, head = find[1] && find[1].pos;
    if (head == null)
      head = anchor2;
    sel = { anchor: anchor2 + from2, head: head + from2 };
  }
  return { doc: doc2, sel, from: from2, to };
}
var ruleFromNode = (added) => (dom) => {
  let desc = dom.pmViewDesc;
  if (desc) {
    return desc.parseRule(added);
  } else if (dom.nodeName == "BR" && dom.parentNode) {
    if (safari && /^(ul|ol)$/i.test(dom.parentNode.nodeName)) {
      let skip = document.createElement("div");
      skip.appendChild(document.createElement("li"));
      return { skip };
    } else if (dom.parentNode.lastChild == dom || safari && /^(tr|table)$/i.test(dom.parentNode.nodeName)) {
      return { ignore: true };
    }
  } else if (dom.nodeName == "IMG" && dom.getAttribute("mark-placeholder")) {
    return { ignore: true };
  }
  return null;
};
var isInline = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function readDOMChange(view, from2, to, typeOver, addedNodes) {
  let compositionID = view.input.compositionPendingChanges || (view.composing ? view.input.compositionID : 0);
  view.input.compositionPendingChanges = 0;
  if (from2 < 0) {
    let origin = view.input.lastSelectionTime > Date.now() - 50 ? view.input.lastSelectionOrigin : null;
    let newSel = selectionFromDOM(view, origin);
    if (newSel && !view.state.selection.eq(newSel)) {
      if (chrome && android && view.input.lastKeyCode === 13 && Date.now() - 100 < view.input.lastKeyCodeTime && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter"))))
        return;
      let tr = view.state.tr.setSelection(newSel);
      if (origin == "pointer")
        tr.setMeta("pointer", true);
      else if (origin == "key")
        tr.scrollIntoView();
      if (compositionID)
        tr.setMeta("composition", compositionID);
      view.dispatch(tr);
    }
    return;
  }
  let $before = view.state.doc.resolve(from2);
  let shared = $before.sharedDepth(to);
  from2 = $before.before(shared + 1);
  to = view.state.doc.resolve(to).after(shared + 1);
  let sel = view.state.selection;
  let parse = parseBetween(view, from2, to, addedNodes);
  let doc2 = view.state.doc, compare = doc2.slice(parse.from, parse.to);
  let preferredPos, preferredSide;
  if (view.input.lastKeyCode === 8 && Date.now() - 100 < view.input.lastKeyCodeTime) {
    preferredPos = view.state.selection.to;
    preferredSide = "end";
  } else {
    preferredPos = view.state.selection.from;
    preferredSide = "start";
  }
  view.input.lastKeyCode = null;
  let change = findDiff(compare.content, parse.doc.content, parse.from, preferredPos, preferredSide);
  if (change)
    view.input.domChangeCount++;
  if ((ios && view.input.lastIOSEnter > Date.now() - 225 || android) && addedNodes.some((n) => isElt(n) && !isInline.test(n.nodeName)) && (!change || change.endA >= change.endB) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
    view.input.lastIOSEnter = 0;
    return;
  }
  if (!change) {
    if (typeOver && sel instanceof TextSelection && !sel.empty && sel.$head.sameParent(sel.$anchor) && !view.composing && !(parse.sel && parse.sel.anchor != parse.sel.head)) {
      change = { start: sel.from, endA: sel.to, endB: sel.to };
    } else {
      if (parse.sel) {
        let sel2 = resolveSelection(view, view.state.doc, parse.sel);
        if (sel2 && !sel2.eq(view.state.selection)) {
          let tr = view.state.tr.setSelection(sel2);
          if (compositionID)
            tr.setMeta("composition", compositionID);
          view.dispatch(tr);
        }
      }
      return;
    }
  }
  if (view.state.selection.from < view.state.selection.to && change.start == change.endB && view.state.selection instanceof TextSelection) {
    if (change.start > view.state.selection.from && change.start <= view.state.selection.from + 2 && view.state.selection.from >= parse.from) {
      change.start = view.state.selection.from;
    } else if (change.endA < view.state.selection.to && change.endA >= view.state.selection.to - 2 && view.state.selection.to <= parse.to) {
      change.endB += view.state.selection.to - change.endA;
      change.endA = view.state.selection.to;
    }
  }
  if (ie && ie_version <= 11 && change.endB == change.start + 1 && change.endA == change.start && change.start > parse.from && parse.doc.textBetween(change.start - parse.from - 1, change.start - parse.from + 1) == " \xA0") {
    change.start--;
    change.endA--;
    change.endB--;
  }
  let $from = parse.doc.resolveNoCache(change.start - parse.from);
  let $to = parse.doc.resolveNoCache(change.endB - parse.from);
  let $fromA = doc2.resolve(change.start);
  let inlineChange = $from.sameParent($to) && $from.parent.inlineContent && $fromA.end() >= change.endA;
  if ((ios && view.input.lastIOSEnter > Date.now() - 225 && (!inlineChange || addedNodes.some((n) => n.nodeName == "DIV" || n.nodeName == "P")) || !inlineChange && looksLikeEnter(parse.doc, $from.pos, $to.pos)) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
    view.input.lastIOSEnter = 0;
    return;
  }
  if (view.state.selection.anchor > change.start && looksLikeBackspace(doc2, change.start, change.endA, $from, $to) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace")))) {
    if (android && chrome)
      view.domObserver.suppressSelectionUpdates();
    return;
  }
  if (chrome && change.endB == change.start)
    view.input.lastChromeDelete = Date.now();
  if (android && !inlineChange && $from.start() != $to.start() && $to.parentOffset == 0 && $from.depth == $to.depth && parse.sel && parse.sel.anchor == parse.sel.head && parse.sel.head == change.endA) {
    change.endB -= 2;
    $to = parse.doc.resolveNoCache(change.endB - parse.from);
    setTimeout(() => {
      view.someProp("handleKeyDown", function(f) {
        return f(view, keyEvent(13, "Enter"));
      });
    }, 20);
  }
  let chFrom = change.start, chTo = change.endA;
  let mkTr = (base2) => {
    let tr = base2 || view.state.tr.replace(chFrom, chTo, parse.doc.slice(change.start - parse.from, change.endB - parse.from));
    if (parse.sel) {
      let sel2 = resolveSelection(view, tr.doc, parse.sel);
      if (sel2 && !(chrome && view.composing && sel2.empty && (change.start != change.endB || view.input.lastChromeDelete < Date.now() - 100) && (sel2.head == chFrom || sel2.head == tr.mapping.map(chTo) - 1) || ie && sel2.empty && sel2.head == chFrom))
        tr.setSelection(sel2);
    }
    if (compositionID)
      tr.setMeta("composition", compositionID);
    return tr.scrollIntoView();
  };
  let markChange;
  if (inlineChange) {
    if ($from.pos == $to.pos) {
      if (ie && ie_version <= 11 && $from.parentOffset == 0) {
        view.domObserver.suppressSelectionUpdates();
        setTimeout(() => selectionToDOM(view), 20);
      }
      let tr = mkTr(view.state.tr.delete(chFrom, chTo));
      let marks = doc2.resolve(change.start).marksAcross(doc2.resolve(change.endA));
      if (marks)
        tr.ensureMarks(marks);
      view.dispatch(tr);
    } else if (
      // Adding or removing a mark
      change.endA == change.endB && (markChange = isMarkChange($from.parent.content.cut($from.parentOffset, $to.parentOffset), $fromA.parent.content.cut($fromA.parentOffset, change.endA - $fromA.start())))
    ) {
      let tr = mkTr(view.state.tr);
      if (markChange.type == "add")
        tr.addMark(chFrom, chTo, markChange.mark);
      else
        tr.removeMark(chFrom, chTo, markChange.mark);
      view.dispatch(tr);
    } else if ($from.parent.child($from.index()).isText && $from.index() == $to.index() - ($to.textOffset ? 0 : 1)) {
      let text = $from.parent.textBetween($from.parentOffset, $to.parentOffset);
      let deflt = () => mkTr(view.state.tr.insertText(text, chFrom, chTo));
      if (!view.someProp("handleTextInput", (f) => f(view, chFrom, chTo, text, deflt)))
        view.dispatch(deflt());
    } else {
      view.dispatch(mkTr());
    }
  } else {
    view.dispatch(mkTr());
  }
}
function resolveSelection(view, doc2, parsedSel) {
  if (Math.max(parsedSel.anchor, parsedSel.head) > doc2.content.size)
    return null;
  return selectionBetween(view, doc2.resolve(parsedSel.anchor), doc2.resolve(parsedSel.head));
}
function isMarkChange(cur, prev) {
  let curMarks = cur.firstChild.marks, prevMarks = prev.firstChild.marks;
  let added = curMarks, removed = prevMarks, type, mark, update;
  for (let i = 0; i < prevMarks.length; i++)
    added = prevMarks[i].removeFromSet(added);
  for (let i = 0; i < curMarks.length; i++)
    removed = curMarks[i].removeFromSet(removed);
  if (added.length == 1 && removed.length == 0) {
    mark = added[0];
    type = "add";
    update = (node) => node.mark(mark.addToSet(node.marks));
  } else if (added.length == 0 && removed.length == 1) {
    mark = removed[0];
    type = "remove";
    update = (node) => node.mark(mark.removeFromSet(node.marks));
  } else {
    return null;
  }
  let updated = [];
  for (let i = 0; i < prev.childCount; i++)
    updated.push(update(prev.child(i)));
  if (Fragment.from(updated).eq(cur))
    return { mark, type };
}
function looksLikeBackspace(old, start, end, $newStart, $newEnd) {
  if (
    // The content must have shrunk
    end - start <= $newEnd.pos - $newStart.pos || // newEnd must point directly at or after the end of the block that newStart points into
    skipClosingAndOpening($newStart, true, false) < $newEnd.pos
  )
    return false;
  let $start = old.resolve(start);
  if (!$newStart.parent.isTextblock) {
    let after = $start.nodeAfter;
    return after != null && end == start + after.nodeSize;
  }
  if ($start.parentOffset < $start.parent.content.size || !$start.parent.isTextblock)
    return false;
  let $next = old.resolve(skipClosingAndOpening($start, true, true));
  if (!$next.parent.isTextblock || $next.pos > end || skipClosingAndOpening($next, true, false) < end)
    return false;
  return $newStart.parent.content.cut($newStart.parentOffset).eq($next.parent.content);
}
function looksLikeEnter(content, from2, to) {
  let newTextlines = 0, newLeaves = 0;
  content.nodesBetween(from2, to, (node, pos) => {
    if (node.isTextblock && pos >= from2 && pos < to)
      newTextlines++;
    else if (node.isText ? /\S/.test(node.text.slice(Math.max(0, from2 - pos), Math.min(node.nodeSize, to - pos))) : node.isLeaf)
      newLeaves++;
  });
  return newLeaves == 0 && newTextlines == 1;
}
function skipClosingAndOpening($pos, fromEnd, mayOpen) {
  let depth = $pos.depth, end = fromEnd ? $pos.end() : $pos.pos;
  while (depth > 0 && (fromEnd || $pos.indexAfter(depth) == $pos.node(depth).childCount)) {
    depth--;
    end++;
    fromEnd = false;
  }
  if (mayOpen) {
    let next = $pos.node(depth).maybeChild($pos.indexAfter(depth));
    while (next && !next.isLeaf) {
      next = next.firstChild;
      end++;
    }
  }
  return end;
}
function findDiff(a, b, pos, preferredPos, preferredSide) {
  let start = a.findDiffStart(b, pos), lenA = pos + a.size, lenB = pos + b.size;
  if (start == null)
    return null;
  let { a: endA, b: endB } = a.findDiffEnd(b, lenA, lenB);
  if (preferredSide == "end") {
    let adjust = Math.max(0, start - Math.min(endA, endB));
    preferredPos -= endA + adjust - start;
  }
  if (endA < start && lenA < lenB) {
    let move = preferredPos <= start && preferredPos >= endA ? start - preferredPos : 0;
    start -= move;
    endB = start + (endB - endA);
    endA = start;
  } else if (endB < start) {
    let move = preferredPos <= start && preferredPos >= endB ? start - preferredPos : 0;
    start -= move;
    endA = start + (endA - endB);
    endB = start;
  }
  return { start, endA, endB };
}
var EditorView = class {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(place, props) {
    this._root = null;
    this.focused = false;
    this.trackWrites = null;
    this.mounted = false;
    this.markCursor = null;
    this.cursorWrapper = null;
    this.lastSelectedViewDesc = void 0;
    this.input = new InputState();
    this.prevDirectPlugins = [];
    this.pluginViews = [];
    this.requiresGeckoHackNode = false;
    this.dragging = null;
    this._props = props;
    this.state = props.state;
    this.directPlugins = props.plugins || [];
    this.directPlugins.forEach(checkStateComponent);
    this.dispatch = this.dispatch.bind(this);
    this.dom = place && place.mount || document.createElement("div");
    if (place) {
      if (place.appendChild)
        place.appendChild(this.dom);
      else if (typeof place == "function")
        place(this.dom);
      else if (place.mount)
        this.mounted = true;
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    this.nodeViews = buildNodeViews(this);
    this.docView = docViewDesc(this.state.doc, computeDocDeco(this), viewDecorations(this), this.dom, this);
    this.domObserver = new DOMObserver(this, (from2, to, typeOver, added) => readDOMChange(this, from2, to, typeOver, added));
    this.domObserver.start();
    initInput(this);
    this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let prev = this._props;
      this._props = {};
      for (let name in prev)
        this._props[name] = prev[name];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(props) {
    if (props.handleDOMEvents != this._props.handleDOMEvents)
      ensureListeners(this);
    let prevProps = this._props;
    this._props = props;
    if (props.plugins) {
      props.plugins.forEach(checkStateComponent);
      this.directPlugins = props.plugins;
    }
    this.updateStateInner(props.state, prevProps);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(props) {
    let updated = {};
    for (let name in this._props)
      updated[name] = this._props[name];
    updated.state = this.state;
    for (let name in props)
      updated[name] = props[name];
    this.update(updated);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(state) {
    this.updateStateInner(state, this._props);
  }
  updateStateInner(state, prevProps) {
    var _a;
    let prev = this.state, redraw = false, updateSel = false;
    if (state.storedMarks && this.composing) {
      clearComposition(this);
      updateSel = true;
    }
    this.state = state;
    let pluginsChanged = prev.plugins != state.plugins || this._props.plugins != prevProps.plugins;
    if (pluginsChanged || this._props.plugins != prevProps.plugins || this._props.nodeViews != prevProps.nodeViews) {
      let nodeViews = buildNodeViews(this);
      if (changedNodeViews(nodeViews, this.nodeViews)) {
        this.nodeViews = nodeViews;
        redraw = true;
      }
    }
    if (pluginsChanged || prevProps.handleDOMEvents != this._props.handleDOMEvents) {
      ensureListeners(this);
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    let innerDeco = viewDecorations(this), outerDeco = computeDocDeco(this);
    let scroll = prev.plugins != state.plugins && !prev.doc.eq(state.doc) ? "reset" : state.scrollToSelection > prev.scrollToSelection ? "to selection" : "preserve";
    let updateDoc = redraw || !this.docView.matchesNode(state.doc, outerDeco, innerDeco);
    if (updateDoc || !state.selection.eq(prev.selection))
      updateSel = true;
    let oldScrollPos = scroll == "preserve" && updateSel && this.dom.style.overflowAnchor == null && storeScrollPos(this);
    if (updateSel) {
      this.domObserver.stop();
      let forceSelUpdate = updateDoc && (ie || chrome) && !this.composing && !prev.selection.empty && !state.selection.empty && selectionContextChanged(prev.selection, state.selection);
      if (updateDoc) {
        let chromeKludge = chrome ? this.trackWrites = this.domSelectionRange().focusNode : null;
        if (this.composing)
          this.input.compositionNode = findCompositionNode(this);
        if (redraw || !this.docView.update(state.doc, outerDeco, innerDeco, this)) {
          this.docView.updateOuterDeco(outerDeco);
          this.docView.destroy();
          this.docView = docViewDesc(state.doc, outerDeco, innerDeco, this.dom, this);
        }
        if (chromeKludge && (!this.trackWrites || !this.dom.contains(this.trackWrites)))
          forceSelUpdate = true;
      }
      let mouseDown = this.input.mouseDown;
      if (forceSelUpdate || !(mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && anchorInRightPlace(this) && mouseDown.delaySelUpdate())) {
        selectionToDOM(this, forceSelUpdate);
      } else {
        syncNodeSelection(this, state.selection);
        this.domObserver.setCurSelection();
      }
      this.domObserver.start();
    }
    this.updatePluginViews(prev);
    if (((_a = this.dragging) === null || _a === void 0 ? void 0 : _a.node) && !prev.doc.eq(state.doc))
      this.updateDraggedNode(this.dragging, prev);
    if (scroll == "reset") {
      this.dom.scrollTop = 0;
    } else if (scroll == "to selection") {
      this.scrollToSelection();
    } else if (oldScrollPos) {
      resetScrollPos(oldScrollPos);
    }
  }
  /**
  @internal
  */
  scrollToSelection() {
    let startDOM = this.domSelectionRange().focusNode;
    if (!startDOM || !contains(this.dom, startDOM)) ;
    else if (this.someProp("handleScrollToSelection", (f) => f(this))) ;
    else if (this.state.selection instanceof NodeSelection) {
      let target = this.docView.domAfterPos(this.state.selection.from);
      if (isElt(target))
        scrollRectIntoView(this, target.getBoundingClientRect(), startDOM);
    } else {
      scrollRectIntoView(this, this.coordsAtPos(this.state.selection.head, 1), startDOM);
    }
  }
  destroyPluginViews() {
    let view;
    while (view = this.pluginViews.pop())
      if (view.destroy)
        view.destroy();
  }
  updatePluginViews(prevState) {
    if (!prevState || prevState.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins;
      this.destroyPluginViews();
      for (let i = 0; i < this.directPlugins.length; i++) {
        let plugin = this.directPlugins[i];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
      for (let i = 0; i < this.state.plugins.length; i++) {
        let plugin = this.state.plugins[i];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
    } else {
      for (let i = 0; i < this.pluginViews.length; i++) {
        let pluginView = this.pluginViews[i];
        if (pluginView.update)
          pluginView.update(this, prevState);
      }
    }
  }
  updateDraggedNode(dragging, prev) {
    let sel = dragging.node, found = -1;
    if (sel.from < this.state.doc.content.size && this.state.doc.nodeAt(sel.from) == sel.node) {
      found = sel.from;
    } else {
      let movedPos = sel.from + (this.state.doc.content.size - prev.doc.content.size);
      let moved = movedPos > 0 && movedPos < this.state.doc.content.size && this.state.doc.nodeAt(movedPos);
      if (moved == sel.node)
        found = movedPos;
    }
    this.dragging = new Dragging(dragging.slice, dragging.move, found < 0 ? void 0 : NodeSelection.create(this.state.doc, found));
  }
  someProp(propName, f) {
    let prop = this._props && this._props[propName], value;
    if (prop != null && (value = f ? f(prop) : prop))
      return value;
    for (let i = 0; i < this.directPlugins.length; i++) {
      let prop2 = this.directPlugins[i].props[propName];
      if (prop2 != null && (value = f ? f(prop2) : prop2))
        return value;
    }
    let plugins = this.state.plugins;
    if (plugins)
      for (let i = 0; i < plugins.length; i++) {
        let prop2 = plugins[i].props[propName];
        if (prop2 != null && (value = f ? f(prop2) : prop2))
          return value;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (ie) {
      let node = this.root.activeElement;
      if (node == this.dom)
        return true;
      if (!node || !this.dom.contains(node))
        return false;
      while (node && this.dom != node && this.dom.contains(node)) {
        if (node.contentEditable == "false")
          return false;
        node = node.parentElement;
      }
      return true;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop();
    if (this.editable)
      focusPreventScroll(this.dom);
    selectionToDOM(this);
    this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let cached = this._root;
    if (cached == null)
      for (let search = this.dom.parentNode; search; search = search.parentNode) {
        if (search.nodeType == 9 || search.nodeType == 11 && search.host) {
          if (!search.getSelection)
            Object.getPrototypeOf(search).getSelection = () => search.ownerDocument.getSelection();
          return this._root = search;
        }
      }
    return cached || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(coords) {
    return posAtCoords(this, coords);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(pos, side = 1) {
    return coordsAtPos(this, pos, side);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.
  
  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(pos, side = 0) {
    return this.docView.domFromPos(pos, side);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.
  
  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(pos) {
    let desc = this.docView.descAt(pos);
    return desc ? desc.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)
  
  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(node, offset3, bias = -1) {
    let pos = this.docView.posFromDOM(node, offset3, bias);
    if (pos == null)
      throw new RangeError("DOM position not inside the editor");
    return pos;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(dir, state) {
    return endOfTextblock(this, state || this.state, dir);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(html, event) {
    return doPaste(this, "", html, false, event || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(text, event) {
    return doPaste(this, text, null, true, event || new ClipboardEvent("paste"));
  }
  /**
  Serialize the given slice as it would be if it was copied from
  this editor. Returns a DOM element that contains a
  representation of the slice as its children, a textual
  representation, and the transformed slice (which can be
  different from the given input due to hooks like
  [`transformCopied`](https://prosemirror.net/docs/ref/#view.EditorProps.transformCopied)).
  */
  serializeForClipboard(slice2) {
    return serializeForClipboard(this, slice2);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    if (!this.docView)
      return;
    destroyInput(this);
    this.destroyPluginViews();
    if (this.mounted) {
      this.docView.update(this.state.doc, [], viewDecorations(this), this);
      this.dom.textContent = "";
    } else if (this.dom.parentNode) {
      this.dom.parentNode.removeChild(this.dom);
    }
    this.docView.destroy();
    this.docView = null;
    clearReusedRange();
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(event) {
    return dispatchEvent(this, event);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let sel = this.dom.isConnected !== false && this.domSelection();
    if (!sel)
      return { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
    return safari && this.root.nodeType === 11 && deepActiveElement(this.dom.ownerDocument) == this.dom && safariShadowSelectionRange(this, sel) || sel;
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
};
EditorView.prototype.dispatch = function(tr) {
  let dispatchTransaction = this._props.dispatchTransaction;
  if (dispatchTransaction)
    dispatchTransaction.call(this, tr);
  else
    this.updateState(this.state.apply(tr));
};
function computeDocDeco(view) {
  let attrs = /* @__PURE__ */ Object.create(null);
  attrs.class = "ProseMirror";
  attrs.contenteditable = String(view.editable);
  view.someProp("attributes", (value) => {
    if (typeof value == "function")
      value = value(view.state);
    if (value)
      for (let attr in value) {
        if (attr == "class")
          attrs.class += " " + value[attr];
        else if (attr == "style")
          attrs.style = (attrs.style ? attrs.style + ";" : "") + value[attr];
        else if (!attrs[attr] && attr != "contenteditable" && attr != "nodeName")
          attrs[attr] = String(value[attr]);
      }
  });
  if (!attrs.translate)
    attrs.translate = "no";
  return [Decoration.node(0, view.state.doc.content.size, attrs)];
}
function updateCursorWrapper(view) {
  if (view.markCursor) {
    let dom = document.createElement("img");
    dom.className = "ProseMirror-separator";
    dom.setAttribute("mark-placeholder", "true");
    dom.setAttribute("alt", "");
    view.cursorWrapper = { dom, deco: Decoration.widget(view.state.selection.from, dom, { raw: true, marks: view.markCursor }) };
  } else {
    view.cursorWrapper = null;
  }
}
function getEditable(view) {
  return !view.someProp("editable", (value) => value(view.state) === false);
}
function selectionContextChanged(sel1, sel2) {
  let depth = Math.min(sel1.$anchor.sharedDepth(sel1.head), sel2.$anchor.sharedDepth(sel2.head));
  return sel1.$anchor.start(depth) != sel2.$anchor.start(depth);
}
function buildNodeViews(view) {
  let result = /* @__PURE__ */ Object.create(null);
  function add(obj) {
    for (let prop in obj)
      if (!Object.prototype.hasOwnProperty.call(result, prop))
        result[prop] = obj[prop];
  }
  view.someProp("nodeViews", add);
  view.someProp("markViews", add);
  return result;
}
function changedNodeViews(a, b) {
  let nA = 0, nB = 0;
  for (let prop in a) {
    if (a[prop] != b[prop])
      return true;
    nA++;
  }
  for (let _ in b)
    nB++;
  return nA != nB;
}
function checkStateComponent(plugin) {
  if (plugin.spec.state || plugin.spec.filterTransaction || plugin.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}

// node_modules/.pnpm/w3c-keyname@2.2.8/node_modules/w3c-keyname/index.js
var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};
var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
};
var mac3 = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie2 = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
var i;
for (i = 1; i <= 24; i++) base[i + 111] = "F" + i;
var i;
for (i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}
var i;
for (code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
var code;
function keyName(event) {
  var ignoreKey = mac3 && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie2 && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
  var name = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
  if (name == "Esc") name = "Escape";
  if (name == "Del") name = "Delete";
  if (name == "Left") name = "ArrowLeft";
  if (name == "Up") name = "ArrowUp";
  if (name == "Right") name = "ArrowRight";
  if (name == "Down") name = "ArrowDown";
  return name;
}

// node_modules/.pnpm/prosemirror-keymap@1.2.3/node_modules/prosemirror-keymap/dist/index.js
var mac4 = typeof navigator != "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
var windows2 = typeof navigator != "undefined" && /Win/.test(navigator.platform);
function normalizeKeyName(name) {
  let parts = name.split(/-(?!$)/), result = parts[parts.length - 1];
  if (result == "Space")
    result = " ";
  let alt, ctrl, shift4, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod))
      meta = true;
    else if (/^a(lt)?$/i.test(mod))
      alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod))
      ctrl = true;
    else if (/^s(hift)?$/i.test(mod))
      shift4 = true;
    else if (/^mod$/i.test(mod)) {
      if (mac4)
        meta = true;
      else
        ctrl = true;
    } else
      throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt)
    result = "Alt-" + result;
  if (ctrl)
    result = "Ctrl-" + result;
  if (meta)
    result = "Meta-" + result;
  if (shift4)
    result = "Shift-" + result;
  return result;
}
function normalize(map2) {
  let copy = /* @__PURE__ */ Object.create(null);
  for (let prop in map2)
    copy[normalizeKeyName(prop)] = map2[prop];
  return copy;
}
function modifiers(name, event, shift4 = true) {
  if (event.altKey)
    name = "Alt-" + name;
  if (event.ctrlKey)
    name = "Ctrl-" + name;
  if (event.metaKey)
    name = "Meta-" + name;
  if (shift4 && event.shiftKey)
    name = "Shift-" + name;
  return name;
}
function keymap(bindings) {
  return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
function keydownHandler(bindings) {
  let map2 = normalize(bindings);
  return function(view, event) {
    let name = keyName(event), baseName, direct = map2[modifiers(name, event)];
    if (direct && direct(view.state, view.dispatch, view))
      return true;
    if (name.length == 1 && name != " ") {
      if (event.shiftKey) {
        let noShift = map2[modifiers(name, event, false)];
        if (noShift && noShift(view.state, view.dispatch, view))
          return true;
      }
      if ((event.altKey || event.metaKey || event.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(windows2 && event.ctrlKey && event.altKey) && (baseName = base[event.keyCode]) && baseName != name) {
        let fromCode = map2[modifiers(baseName, event)];
        if (fromCode && fromCode(view.state, view.dispatch, view))
          return true;
      }
    }
    return false;
  };
}

// node_modules/.pnpm/rope-sequence@1.3.4/node_modules/rope-sequence/dist/index.js
var GOOD_LEAF_SIZE = 200;
var RopeSequence = function RopeSequence2() {
};
RopeSequence.prototype.append = function append(other) {
  if (!other.length) {
    return this;
  }
  other = RopeSequence.from(other);
  return !this.length && other || other.length < GOOD_LEAF_SIZE && this.leafAppend(other) || this.length < GOOD_LEAF_SIZE && other.leafPrepend(this) || this.appendInner(other);
};
RopeSequence.prototype.prepend = function prepend(other) {
  if (!other.length) {
    return this;
  }
  return RopeSequence.from(other).append(this);
};
RopeSequence.prototype.appendInner = function appendInner(other) {
  return new Append(this, other);
};
RopeSequence.prototype.slice = function slice(from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  if (from2 >= to) {
    return RopeSequence.empty;
  }
  return this.sliceInner(Math.max(0, from2), Math.min(this.length, to));
};
RopeSequence.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) {
    return void 0;
  }
  return this.getInner(i);
};
RopeSequence.prototype.forEach = function forEach(f, from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  if (from2 <= to) {
    this.forEachInner(f, from2, to, 0);
  } else {
    this.forEachInvertedInner(f, from2, to, 0);
  }
};
RopeSequence.prototype.map = function map(f, from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  var result = [];
  this.forEach(function(elt, i) {
    return result.push(f(elt, i));
  }, from2, to);
  return result;
};
RopeSequence.from = function from(values) {
  if (values instanceof RopeSequence) {
    return values;
  }
  return values && values.length ? new Leaf(values) : RopeSequence.empty;
};
var Leaf = /* @__PURE__ */ (function(RopeSequence3) {
  function Leaf2(values) {
    RopeSequence3.call(this);
    this.values = values;
  }
  if (RopeSequence3) Leaf2.__proto__ = RopeSequence3;
  Leaf2.prototype = Object.create(RopeSequence3 && RopeSequence3.prototype);
  Leaf2.prototype.constructor = Leaf2;
  var prototypeAccessors = { length: { configurable: true }, depth: { configurable: true } };
  Leaf2.prototype.flatten = function flatten() {
    return this.values;
  };
  Leaf2.prototype.sliceInner = function sliceInner(from2, to) {
    if (from2 == 0 && to == this.length) {
      return this;
    }
    return new Leaf2(this.values.slice(from2, to));
  };
  Leaf2.prototype.getInner = function getInner(i) {
    return this.values[i];
  };
  Leaf2.prototype.forEachInner = function forEachInner(f, from2, to, start) {
    for (var i = from2; i < to; i++) {
      if (f(this.values[i], start + i) === false) {
        return false;
      }
    }
  };
  Leaf2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from2, to, start) {
    for (var i = from2 - 1; i >= to; i--) {
      if (f(this.values[i], start + i) === false) {
        return false;
      }
    }
  };
  Leaf2.prototype.leafAppend = function leafAppend(other) {
    if (this.length + other.length <= GOOD_LEAF_SIZE) {
      return new Leaf2(this.values.concat(other.flatten()));
    }
  };
  Leaf2.prototype.leafPrepend = function leafPrepend(other) {
    if (this.length + other.length <= GOOD_LEAF_SIZE) {
      return new Leaf2(other.flatten().concat(this.values));
    }
  };
  prototypeAccessors.length.get = function() {
    return this.values.length;
  };
  prototypeAccessors.depth.get = function() {
    return 0;
  };
  Object.defineProperties(Leaf2.prototype, prototypeAccessors);
  return Leaf2;
})(RopeSequence);
RopeSequence.empty = new Leaf([]);
var Append = /* @__PURE__ */ (function(RopeSequence3) {
  function Append2(left, right) {
    RopeSequence3.call(this);
    this.left = left;
    this.right = right;
    this.length = left.length + right.length;
    this.depth = Math.max(left.depth, right.depth) + 1;
  }
  if (RopeSequence3) Append2.__proto__ = RopeSequence3;
  Append2.prototype = Object.create(RopeSequence3 && RopeSequence3.prototype);
  Append2.prototype.constructor = Append2;
  Append2.prototype.flatten = function flatten() {
    return this.left.flatten().concat(this.right.flatten());
  };
  Append2.prototype.getInner = function getInner(i) {
    return i < this.left.length ? this.left.get(i) : this.right.get(i - this.left.length);
  };
  Append2.prototype.forEachInner = function forEachInner(f, from2, to, start) {
    var leftLen = this.left.length;
    if (from2 < leftLen && this.left.forEachInner(f, from2, Math.min(to, leftLen), start) === false) {
      return false;
    }
    if (to > leftLen && this.right.forEachInner(f, Math.max(from2 - leftLen, 0), Math.min(this.length, to) - leftLen, start + leftLen) === false) {
      return false;
    }
  };
  Append2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from2, to, start) {
    var leftLen = this.left.length;
    if (from2 > leftLen && this.right.forEachInvertedInner(f, from2 - leftLen, Math.max(to, leftLen) - leftLen, start + leftLen) === false) {
      return false;
    }
    if (to < leftLen && this.left.forEachInvertedInner(f, Math.min(from2, leftLen), to, start) === false) {
      return false;
    }
  };
  Append2.prototype.sliceInner = function sliceInner(from2, to) {
    if (from2 == 0 && to == this.length) {
      return this;
    }
    var leftLen = this.left.length;
    if (to <= leftLen) {
      return this.left.slice(from2, to);
    }
    if (from2 >= leftLen) {
      return this.right.slice(from2 - leftLen, to - leftLen);
    }
    return this.left.slice(from2, leftLen).append(this.right.slice(0, to - leftLen));
  };
  Append2.prototype.leafAppend = function leafAppend(other) {
    var inner = this.right.leafAppend(other);
    if (inner) {
      return new Append2(this.left, inner);
    }
  };
  Append2.prototype.leafPrepend = function leafPrepend(other) {
    var inner = this.left.leafPrepend(other);
    if (inner) {
      return new Append2(inner, this.right);
    }
  };
  Append2.prototype.appendInner = function appendInner2(other) {
    if (this.left.depth >= Math.max(this.right.depth, other.depth) + 1) {
      return new Append2(this.left, new Append2(this.right, other));
    }
    return new Append2(this, other);
  };
  return Append2;
})(RopeSequence);
var dist_default = RopeSequence;

// node_modules/.pnpm/prosemirror-history@1.5.1/node_modules/prosemirror-history/dist/index.js
var max_empty_items = 500;
var Branch = class _Branch {
  constructor(items, eventCount) {
    this.items = items;
    this.eventCount = eventCount;
  }
  // Pop the latest event off the branch's history and apply it
  // to a document transform.
  popEvent(state, preserveItems) {
    if (this.eventCount == 0)
      return null;
    let end = this.items.length;
    for (; ; end--) {
      let next = this.items.get(end - 1);
      if (next.selection) {
        --end;
        break;
      }
    }
    let remap, mapFrom;
    if (preserveItems) {
      remap = this.remapping(end, this.items.length);
      mapFrom = remap.maps.length;
    }
    let transform = state.tr;
    let selection, remaining;
    let addAfter = [], addBefore = [];
    this.items.forEach((item, i) => {
      if (!item.step) {
        if (!remap) {
          remap = this.remapping(end, i + 1);
          mapFrom = remap.maps.length;
        }
        mapFrom--;
        addBefore.push(item);
        return;
      }
      if (remap) {
        addBefore.push(new Item(item.map));
        let step = item.step.map(remap.slice(mapFrom)), map2;
        if (step && transform.maybeStep(step).doc) {
          map2 = transform.mapping.maps[transform.mapping.maps.length - 1];
          addAfter.push(new Item(map2, void 0, void 0, addAfter.length + addBefore.length));
        }
        mapFrom--;
        if (map2)
          remap.appendMap(map2, mapFrom);
      } else {
        transform.maybeStep(item.step);
      }
      if (item.selection) {
        selection = remap ? item.selection.map(remap.slice(mapFrom)) : item.selection;
        remaining = new _Branch(this.items.slice(0, end).append(addBefore.reverse().concat(addAfter)), this.eventCount - 1);
        return false;
      }
    }, this.items.length, 0);
    return { remaining, transform, selection };
  }
  // Create a new branch with the given transform added.
  addTransform(transform, selection, histOptions, preserveItems) {
    let newItems = [], eventCount = this.eventCount;
    let oldItems = this.items, lastItem = !preserveItems && oldItems.length ? oldItems.get(oldItems.length - 1) : null;
    for (let i = 0; i < transform.steps.length; i++) {
      let step = transform.steps[i].invert(transform.docs[i]);
      let item = new Item(transform.mapping.maps[i], step, selection), merged;
      if (merged = lastItem && lastItem.merge(item)) {
        item = merged;
        if (i)
          newItems.pop();
        else
          oldItems = oldItems.slice(0, oldItems.length - 1);
      }
      newItems.push(item);
      if (selection) {
        eventCount++;
        selection = void 0;
      }
      if (!preserveItems)
        lastItem = item;
    }
    let overflow = eventCount - histOptions.depth;
    if (overflow > DEPTH_OVERFLOW) {
      oldItems = cutOffEvents(oldItems, overflow);
      eventCount -= overflow;
    }
    return new _Branch(oldItems.append(newItems), eventCount);
  }
  remapping(from2, to) {
    let maps = new Mapping();
    this.items.forEach((item, i) => {
      let mirrorPos = item.mirrorOffset != null && i - item.mirrorOffset >= from2 ? maps.maps.length - item.mirrorOffset : void 0;
      maps.appendMap(item.map, mirrorPos);
    }, from2, to);
    return maps;
  }
  addMaps(array) {
    if (this.eventCount == 0)
      return this;
    return new _Branch(this.items.append(array.map((map2) => new Item(map2))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(rebasedTransform, rebasedCount) {
    if (!this.eventCount)
      return this;
    rebasedCount = Math.min(this.items.length, rebasedCount);
    let rebasedItems = [], start = this.items.length - rebasedCount;
    let mapping = rebasedTransform.mapping;
    let newUntil = rebasedTransform.steps.length;
    let eventCount = this.eventCount;
    this.items.forEach((item) => {
      if (item.selection)
        eventCount--;
    }, start);
    let iRebased = rebasedCount;
    this.items.forEach((item) => {
      let pos = mapping.getMirror(--iRebased);
      if (pos == null)
        return;
      newUntil = Math.min(newUntil, pos);
      let map2 = mapping.maps[pos];
      if (item.step) {
        let step = rebasedTransform.steps[pos].invert(rebasedTransform.docs[pos]);
        let selection = item.selection && item.selection.map(mapping.slice(iRebased + 1, pos));
        if (selection)
          eventCount++;
        rebasedItems.push(new Item(map2, step, selection));
      } else {
        rebasedItems.push(new Item(map2));
      }
    }, start);
    let newMaps = [];
    for (let i = rebasedCount; i < newUntil; i++)
      newMaps.push(new Item(mapping.maps[i]));
    let items = this.items.slice(0, start).append(newMaps).append(rebasedItems);
    let branch = new _Branch(items, eventCount);
    if (branch.emptyItemCount() > max_empty_items)
      branch = branch.compress(this.items.length - rebasedItems.length);
    return branch;
  }
  emptyItemCount() {
    let count = 0;
    this.items.forEach((item) => {
      if (!item.step)
        count++;
    });
    return count;
  }
  // Compressing a branch means rewriting it to push the air (map-only
  // items) out. During collaboration, these naturally accumulate
  // because each remote change adds one. The `upto` argument is used
  // to ensure that only the items below a given level are compressed,
  // because `rebased` relies on a clean, untouched set of items in
  // order to associate old items with rebased steps.
  compress(upto = this.items.length) {
    let remap = this.remapping(0, upto), mapFrom = remap.maps.length;
    let items = [], events = 0;
    this.items.forEach((item, i) => {
      if (i >= upto) {
        items.push(item);
        if (item.selection)
          events++;
      } else if (item.step) {
        let step = item.step.map(remap.slice(mapFrom)), map2 = step && step.getMap();
        mapFrom--;
        if (map2)
          remap.appendMap(map2, mapFrom);
        if (step) {
          let selection = item.selection && item.selection.map(remap.slice(mapFrom));
          if (selection)
            events++;
          let newItem = new Item(map2.invert(), step, selection), merged, last = items.length - 1;
          if (merged = items.length && items[last].merge(newItem))
            items[last] = merged;
          else
            items.push(newItem);
        }
      } else if (item.map) {
        mapFrom--;
      }
    }, this.items.length, 0);
    return new _Branch(dist_default.from(items.reverse()), events);
  }
};
Branch.empty = new Branch(dist_default.empty, 0);
function cutOffEvents(items, n) {
  let cutPoint;
  items.forEach((item, i) => {
    if (item.selection && n-- == 0) {
      cutPoint = i;
      return false;
    }
  });
  return items.slice(cutPoint);
}
var Item = class _Item {
  constructor(map2, step, selection, mirrorOffset) {
    this.map = map2;
    this.step = step;
    this.selection = selection;
    this.mirrorOffset = mirrorOffset;
  }
  merge(other) {
    if (this.step && other.step && !other.selection) {
      let step = other.step.merge(this.step);
      if (step)
        return new _Item(step.getMap().invert(), step, this.selection);
    }
  }
};
var HistoryState = class {
  constructor(done, undone, prevRanges, prevTime, prevComposition) {
    this.done = done;
    this.undone = undone;
    this.prevRanges = prevRanges;
    this.prevTime = prevTime;
    this.prevComposition = prevComposition;
  }
};
var DEPTH_OVERFLOW = 20;
function applyTransaction(history2, state, tr, options) {
  let historyTr = tr.getMeta(historyKey), rebased;
  if (historyTr)
    return historyTr.historyState;
  if (tr.getMeta(closeHistoryKey))
    history2 = new HistoryState(history2.done, history2.undone, null, 0, -1);
  let appended = tr.getMeta("appendedTransaction");
  if (tr.steps.length == 0) {
    return history2;
  } else if (appended && appended.getMeta(historyKey)) {
    if (appended.getMeta(historyKey).redo)
      return new HistoryState(history2.done.addTransform(tr, void 0, options, mustPreserveItems(state)), history2.undone, rangesFor(tr.mapping.maps), history2.prevTime, history2.prevComposition);
    else
      return new HistoryState(history2.done, history2.undone.addTransform(tr, void 0, options, mustPreserveItems(state)), null, history2.prevTime, history2.prevComposition);
  } else if (tr.getMeta("addToHistory") !== false && !(appended && appended.getMeta("addToHistory") === false)) {
    let composition = tr.getMeta("composition");
    let newGroup = history2.prevTime == 0 || !appended && history2.prevComposition != composition && (history2.prevTime < (tr.time || 0) - options.newGroupDelay || !isAdjacentTo(tr, history2.prevRanges));
    let prevRanges = appended ? mapRanges(history2.prevRanges, tr.mapping) : rangesFor(tr.mapping.maps);
    return new HistoryState(history2.done.addTransform(tr, newGroup ? state.selection.getBookmark() : void 0, options, mustPreserveItems(state)), Branch.empty, prevRanges, tr.time, composition == null ? history2.prevComposition : composition);
  } else if (rebased = tr.getMeta("rebased")) {
    return new HistoryState(history2.done.rebased(tr, rebased), history2.undone.rebased(tr, rebased), mapRanges(history2.prevRanges, tr.mapping), history2.prevTime, history2.prevComposition);
  } else {
    return new HistoryState(history2.done.addMaps(tr.mapping.maps), history2.undone.addMaps(tr.mapping.maps), mapRanges(history2.prevRanges, tr.mapping), history2.prevTime, history2.prevComposition);
  }
}
function isAdjacentTo(transform, prevRanges) {
  if (!prevRanges)
    return false;
  if (!transform.docChanged)
    return true;
  let adjacent = false;
  transform.mapping.maps[0].forEach((start, end) => {
    for (let i = 0; i < prevRanges.length; i += 2)
      if (start <= prevRanges[i + 1] && end >= prevRanges[i])
        adjacent = true;
  });
  return adjacent;
}
function rangesFor(maps) {
  let result = [];
  for (let i = maps.length - 1; i >= 0 && result.length == 0; i--)
    maps[i].forEach((_from, _to, from2, to) => result.push(from2, to));
  return result;
}
function mapRanges(ranges, mapping) {
  if (!ranges)
    return null;
  let result = [];
  for (let i = 0; i < ranges.length; i += 2) {
    let from2 = mapping.map(ranges[i], 1), to = mapping.map(ranges[i + 1], -1);
    if (from2 <= to)
      result.push(from2, to);
  }
  return result;
}
function histTransaction(history2, state, redo2) {
  let preserveItems = mustPreserveItems(state);
  let histOptions = historyKey.get(state).spec.config;
  let pop = (redo2 ? history2.undone : history2.done).popEvent(state, preserveItems);
  if (!pop)
    return null;
  let selection = pop.selection.resolve(pop.transform.doc);
  let added = (redo2 ? history2.done : history2.undone).addTransform(pop.transform, state.selection.getBookmark(), histOptions, preserveItems);
  let newHist = new HistoryState(redo2 ? added : pop.remaining, redo2 ? pop.remaining : added, null, 0, -1);
  return pop.transform.setSelection(selection).setMeta(historyKey, { redo: redo2, historyState: newHist });
}
var cachedPreserveItems = false;
var cachedPreserveItemsPlugins = null;
function mustPreserveItems(state) {
  let plugins = state.plugins;
  if (cachedPreserveItemsPlugins != plugins) {
    cachedPreserveItems = false;
    cachedPreserveItemsPlugins = plugins;
    for (let i = 0; i < plugins.length; i++)
      if (plugins[i].spec.historyPreserveItems) {
        cachedPreserveItems = true;
        break;
      }
  }
  return cachedPreserveItems;
}
function closeHistory(tr) {
  return tr.setMeta(closeHistoryKey, true);
}
var historyKey = new PluginKey("history");
var closeHistoryKey = new PluginKey("closeHistory");
function history(config = {}) {
  config = {
    depth: config.depth || 100,
    newGroupDelay: config.newGroupDelay || 500
  };
  return new Plugin({
    key: historyKey,
    state: {
      init() {
        return new HistoryState(Branch.empty, Branch.empty, null, 0, -1);
      },
      apply(tr, hist, state) {
        return applyTransaction(hist, state, tr, config);
      }
    },
    config,
    props: {
      handleDOMEvents: {
        beforeinput(view, e) {
          let inputType = e.inputType;
          let command2 = inputType == "historyUndo" ? undo : inputType == "historyRedo" ? redo : null;
          if (!command2 || !view.editable)
            return false;
          e.preventDefault();
          return command2(view.state, view.dispatch);
        }
      }
    }
  });
}
function buildCommand(redo2, scroll) {
  return (state, dispatch) => {
    let hist = historyKey.getState(state);
    if (!hist || (redo2 ? hist.undone : hist.done).eventCount == 0)
      return false;
    if (dispatch) {
      let tr = histTransaction(hist, state, redo2);
      if (tr)
        dispatch(scroll ? tr.scrollIntoView() : tr);
    }
    return true;
  };
}
var undo = buildCommand(false, true);
var redo = buildCommand(true, true);
var undoNoScroll = buildCommand(false, false);
var redoNoScroll = buildCommand(true, false);

// node_modules/.pnpm/@tiptap+core@3.32.0_@tiptap+pm@3.32.0/node_modules/@tiptap/core/dist/index.js
function createChainableState(config) {
  const { state, transaction } = config;
  let { selection } = transaction;
  let { doc: doc2 } = transaction;
  let { storedMarks } = transaction;
  return {
    ...state,
    apply: state.apply.bind(state),
    applyTransaction: state.applyTransaction.bind(state),
    plugins: state.plugins,
    schema: state.schema,
    reconfigure: state.reconfigure.bind(state),
    toJSON: state.toJSON.bind(state),
    get storedMarks() {
      return storedMarks;
    },
    get selection() {
      return selection;
    },
    get doc() {
      return doc2;
    },
    get tr() {
      selection = transaction.selection;
      doc2 = transaction.doc;
      storedMarks = transaction.storedMarks;
      return transaction;
    }
  };
}
var CommandManager = class CommandManager2 {
  constructor(props) {
    this.editor = props.editor;
    this.rawCommands = this.editor.extensionManager.commands;
    this.customState = props.state;
  }
  get hasCustomState() {
    return !!this.customState;
  }
  get state() {
    return this.customState || this.editor.state;
  }
  get commands() {
    const { rawCommands, editor, state } = this;
    const { view } = editor;
    const { tr } = state;
    const props = this.buildProps(tr);
    return Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
      const method = (...args) => {
        const callback = command2(...args)(props);
        if (!tr.getMeta("preventDispatch") && !this.hasCustomState) view.dispatch(tr);
        return callback;
      };
      return [name, method];
    }));
  }
  get chain() {
    return () => this.createChain();
  }
  get can() {
    return () => this.createCan();
  }
  createChain(startTr, shouldDispatch = true) {
    const { rawCommands, editor, state } = this;
    const { view } = editor;
    const callbacks = [];
    const hasStartTransaction = !!startTr;
    const tr = startTr || state.tr;
    const run3 = () => {
      if (!hasStartTransaction && shouldDispatch && !tr.getMeta("preventDispatch") && !this.hasCustomState) view.dispatch(tr);
      return callbacks.every((callback) => callback === true);
    };
    const chain = {
      ...Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
        const chainedCommand = (...args) => {
          const props = this.buildProps(tr, shouldDispatch);
          const callback = command2(...args)(props);
          callbacks.push(callback);
          return chain;
        };
        return [name, chainedCommand];
      })),
      run: run3
    };
    return chain;
  }
  /**
  * Creates a chain that safely returns `false` when run.
  * @returns A non-dispatching command chain.
  * @example
  * const chain = CommandManager.createFakeChain()
  * chain.focus().run() // false
  */
  static createFakeChain() {
    const chain = new Proxy({}, { get: (_target, property) => {
      if (property === "then") return;
      if (property === "run") return () => false;
      return () => chain;
    } });
    return chain;
  }
  createCan(startTr) {
    const { rawCommands, state } = this;
    const dispatch = false;
    const tr = startTr || state.tr;
    const props = this.buildProps(tr, dispatch);
    return {
      ...Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
        return [name, (...args) => command2(...args)({
          ...props,
          dispatch: void 0
        })];
      })),
      chain: () => this.createChain(tr, dispatch)
    };
  }
  /**
  * Creates capability checks that safely return `false`.
  * @returns A non-dispatching capability checker.
  * @example
  * const can = CommandManager.createFallbackCan()
  * can.focus() // false
  */
  static createFallbackCan() {
    const chain = CommandManager2.createFakeChain();
    return new Proxy({ chain: () => chain }, { get: (target, property) => {
      if (property === "then") return;
      if (property === "chain") return target.chain;
      return () => false;
    } });
  }
  buildProps(tr, shouldDispatch = true) {
    const { rawCommands, editor, state } = this;
    const { view } = editor;
    const props = {
      tr,
      editor,
      view,
      state: createChainableState({
        state,
        transaction: tr
      }),
      dispatch: shouldDispatch ? () => void 0 : void 0,
      chain: () => this.createChain(tr, shouldDispatch),
      can: () => this.createCan(tr),
      get commands() {
        return Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
          return [name, (...args) => command2(...args)(props)];
        }));
      }
    };
    return props;
  }
};
var blur = () => ({ editor, view }) => {
  requestAnimationFrame(() => {
    if (!editor.isDestroyed) {
      var _window;
      view.dom.blur();
      (_window = window) === null || _window === void 0 || (_window = _window.getSelection()) === null || _window === void 0 || _window.removeAllRanges();
    }
  });
  return true;
};
var clearContent = (emitUpdate = true) => ({ commands }) => {
  return commands.setContent("", { emitUpdate });
};
var clearNodes = () => ({ state, tr, dispatch }) => {
  const { selection } = tr;
  const { ranges } = selection;
  if (!dispatch) return true;
  ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
      if (node.type.isText) return;
      const { doc: doc2, mapping } = tr;
      const $mappedFrom = doc2.resolve(mapping.map(pos));
      const $mappedTo = doc2.resolve(mapping.map(pos + node.nodeSize));
      const nodeRange = $mappedFrom.blockRange($mappedTo);
      if (!nodeRange) return;
      const targetLiftDepth = liftTarget(nodeRange);
      if (node.type.isTextblock) {
        const { defaultType } = $mappedFrom.parent.contentMatchAt($mappedFrom.index());
        tr.setNodeMarkup(nodeRange.start, defaultType);
      }
      if (targetLiftDepth || targetLiftDepth === 0) tr.lift(nodeRange, targetLiftDepth);
    });
  });
  return true;
};
var command = (fn) => (props) => {
  return fn(props);
};
var createParagraphNear$1 = () => ({ state, dispatch }) => {
  return createParagraphNear(state, dispatch);
};
var cut = (originRange, targetPos) => ({ editor, tr }) => {
  const { state } = editor;
  const contentSlice = state.doc.slice(originRange.from, originRange.to);
  tr.deleteRange(originRange.from, originRange.to);
  const newPos = tr.mapping.map(targetPos);
  tr.insert(newPos, contentSlice.content);
  tr.setSelection(new TextSelection(tr.doc.resolve(Math.max(newPos - 1, 0))));
  return true;
};
var deleteCurrentNode = () => ({ tr, dispatch }) => {
  const { selection } = tr;
  const currentNode = selection.$anchor.node();
  if (currentNode.content.size > 0) return false;
  const $pos = tr.selection.$anchor;
  for (let depth = $pos.depth; depth > 0; depth -= 1) if ($pos.node(depth).type === currentNode.type) {
    if (dispatch) {
      const from2 = $pos.before(depth);
      const to = $pos.after(depth);
      tr.delete(from2, to).scrollIntoView();
    }
    return true;
  }
  return false;
};
function getNodeType(nameOrType, schema) {
  if (typeof nameOrType === "string") {
    if (!schema.nodes[nameOrType]) throw Error(`There is no node type named '${nameOrType}'. Maybe you forgot to add the extension?`);
    return schema.nodes[nameOrType];
  }
  return nameOrType;
}
var deleteNode = (typeOrName) => ({ tr, state, dispatch }) => {
  const type = getNodeType(typeOrName, state.schema);
  const $pos = tr.selection.$anchor;
  for (let depth = $pos.depth; depth > 0; depth -= 1) if ($pos.node(depth).type === type) {
    if (dispatch) {
      const from2 = $pos.before(depth);
      const to = $pos.after(depth);
      tr.delete(from2, to).scrollIntoView();
    }
    return true;
  }
  return false;
};
var deleteRange = (range) => ({ tr, dispatch }) => {
  const { from: from2, to } = range;
  if (dispatch) tr.delete(from2, to);
  return true;
};
var hasTextContent = (nodeSpec) => {
  if (!nodeSpec.content) return false;
  return /^text(\*|\+)/.test(nodeSpec.content);
};
var expandSelectionForSide = ($pos, schema, side) => {
  if (!$pos.parent.isInline) return $pos.pos;
  if (side === "left" && $pos.pos > $pos.start() || side === "right" && $pos.pos < $pos.end()) return $pos.pos;
  const parentContent = schema.nodes[$pos.parent.type.name].spec;
  if (!hasTextContent(parentContent)) return $pos.pos;
  return side === "left" ? $pos.start() - 1 : $pos.end() + 1;
};
var expandSelectionForInlineText = ($from, $to, schema) => {
  return {
    from: expandSelectionForSide($from, schema, "left"),
    to: expandSelectionForSide($to, schema, "right")
  };
};
var deleteSelection2 = () => ({ state, dispatch }) => {
  if (state.selection.empty) return false;
  if (dispatch) {
    const tr = state.tr;
    const { ranges } = state.selection;
    const mapFrom = tr.steps.length;
    ranges.forEach((range) => {
      const mapping = tr.mapping.slice(mapFrom);
      const $from = tr.doc.resolve(mapping.map(range.$from.pos));
      const $to = tr.doc.resolve(mapping.map(range.$to.pos));
      const { from: from2, to } = expandSelectionForInlineText($from, $to, state.schema);
      tr.deleteRange(from2, to);
    });
    if (!tr.selection.empty) tr.setSelection(TextSelection.near(tr.doc.resolve(tr.selection.from)));
    tr.scrollIntoView();
    dispatch(tr);
  }
  return true;
};
var enter = () => ({ commands }) => {
  return commands.keyboardShortcut("Enter");
};
var exitCode$1 = () => ({ state, dispatch }) => {
  return exitCode(state, dispatch);
};
function isRegExp(value) {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}
function objectIncludes(object1, object2, options = { strict: true }) {
  const keys3 = Object.keys(object2);
  if (!keys3.length) return true;
  return keys3.every((key) => {
    if (options.strict) return object2[key] === object1[key];
    if (isRegExp(object2[key])) return object2[key].test(object1[key]);
    return object2[key] === object1[key];
  });
}
function findMarkInSet(marks, type, attributes = {}) {
  return marks.find((item) => {
    return item.type === type && objectIncludes(Object.fromEntries(Object.keys(attributes).map((k) => [k, item.attrs[k]])), attributes);
  });
}
function isMarkInSet(marks, type, attributes = {}) {
  return !!findMarkInSet(marks, type, attributes);
}
function getMarkRange($pos, type, attributes) {
  if (!$pos || !type) return;
  let start = $pos.parent.childAfter($pos.parentOffset);
  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) start = $pos.parent.childBefore($pos.parentOffset);
  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) return;
  if (!attributes) {
    const firstMark = start.node.marks.find((mark) => mark.type === type);
    if (firstMark) attributes = firstMark.attrs;
  }
  if (!findMarkInSet([...start.node.marks], type, attributes)) return;
  let startIndex = start.index;
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;
  while (startIndex > 0 && isMarkInSet([...$pos.parent.child(startIndex - 1).marks], type, attributes)) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }
  while (endIndex < $pos.parent.childCount && isMarkInSet([...$pos.parent.child(endIndex).marks], type, attributes)) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }
  return {
    from: startPos,
    to: endPos
  };
}
function getMarkType(nameOrType, schema) {
  if (typeof nameOrType === "string") {
    if (!schema.marks[nameOrType]) throw Error(`There is no mark type named '${nameOrType}'. Maybe you forgot to add the extension?`);
    return schema.marks[nameOrType];
  }
  return nameOrType;
}
var extendMarkRange = (typeOrName, attributes) => ({ tr, state, dispatch }) => {
  const type = getMarkType(typeOrName, state.schema);
  const { doc: doc2, selection } = tr;
  const { $from, from: from2, to } = selection;
  if (dispatch) {
    const range = getMarkRange($from, type, attributes);
    if (range && range.from <= from2 && range.to >= to) {
      const newSelection = TextSelection.create(doc2, range.from, range.to);
      tr.setSelection(newSelection);
    }
  }
  return true;
};
var first = (commands) => (props) => {
  const items = typeof commands === "function" ? commands(props) : commands;
  for (let i = 0; i < items.length; i += 1) if (items[i](props)) return true;
  return false;
};
function isTextSelection(value) {
  return value instanceof TextSelection;
}
function minMax(value = 0, min2 = 0, max2 = 0) {
  return Math.min(Math.max(value, min2), max2);
}
function resolveFocusPosition(doc2, position = null) {
  if (!position) return null;
  const selectionAtStart = Selection.atStart(doc2);
  const selectionAtEnd = Selection.atEnd(doc2);
  if (position === "start" || position === true) return selectionAtStart;
  if (position === "end") return selectionAtEnd;
  const minPos = selectionAtStart.from;
  const maxPos = selectionAtEnd.to;
  if (position === "all") return TextSelection.create(doc2, minMax(0, minPos, maxPos), minMax(doc2.content.size, minPos, maxPos));
  return TextSelection.create(doc2, minMax(position, minPos, maxPos), minMax(position, minPos, maxPos));
}
function isAndroid() {
  return ["Android"].includes(navigator.platform) || /android/i.test(navigator.userAgent);
}
function isiOS() {
  return [
    "iPad Simulator",
    "iPhone Simulator",
    "iPod Simulator",
    "iPad",
    "iPhone",
    "iPod"
  ].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
}
function isSafari() {
  return typeof navigator !== "undefined" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false;
}
var focus = (position = null, options = {}) => ({ editor, view, tr, dispatch }) => {
  options = {
    scrollIntoView: true,
    ...options
  };
  const delayedFocus = () => {
    if (isiOS() || isAndroid()) view.dom.focus();
    if (isSafari() && !isiOS() && !isAndroid()) view.dom.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        view.focus();
        if (options === null || options === void 0 ? void 0 : options.scrollIntoView) editor.commands.scrollIntoView();
      }
    });
  };
  try {
    if (view.hasFocus() && position === null || position === false) return true;
  } catch {
    return false;
  }
  if (dispatch && position === null && !isTextSelection(editor.state.selection)) {
    delayedFocus();
    return true;
  }
  const selection = resolveFocusPosition(tr.doc, position) || editor.state.selection;
  const isSameSelection = editor.state.selection.eq(selection);
  if (dispatch) {
    if (!isSameSelection) tr.setSelection(selection);
    if (isSameSelection && tr.storedMarks) tr.setStoredMarks(tr.storedMarks);
    delayedFocus();
  }
  return true;
};
var forEach2 = (items, fn) => (props) => {
  return items.every((item, index) => fn(item, {
    ...props,
    index
  }));
};
var insertContent = (value, options) => ({ tr, commands }) => {
  return commands.insertContentAt({
    from: tr.selection.from,
    to: tr.selection.to
  }, value, options);
};
var removeWhitespaces = (node) => {
  const children = node.childNodes;
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) node.removeChild(child);
    else if (child.nodeType === 1) removeWhitespaces(child);
  }
  return node;
};
function elementFromString(value) {
  if (typeof window === "undefined") throw new Error("[tiptap error]: there is no window object available, so this function cannot be used");
  const wrappedValue = `<body>${value}</body>`;
  const html = new window.DOMParser().parseFromString(wrappedValue, "text/html").body;
  return removeWhitespaces(html);
}
function isProseMirrorContent(value) {
  return typeof (value === null || value === void 0 ? void 0 : value.nodesBetween) === "function";
}
function createNodeFromContent(content, schema, options) {
  if (isProseMirrorContent(content)) return content;
  const isJSONContent = typeof content === "object" && content !== null;
  options = {
    slice: true,
    parseOptions: {},
    ...options
  };
  const isTextContent = typeof content === "string";
  if (isJSONContent) try {
    if (Array.isArray(content) && content.length > 0) return Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item)));
    const node = schema.nodeFromJSON(content);
    if (options.errorOnInvalidContent) node.check();
    return node;
  } catch (error) {
    if (options.errorOnInvalidContent) throw new Error("[tiptap error]: Invalid JSON content", { cause: error });
    console.warn("[tiptap warn]: Invalid content.", "Passed value:", content, "Error:", error);
    return createNodeFromContent("", schema, options);
  }
  if (isTextContent) {
    if (options.errorOnInvalidContent) {
      let hasInvalidContent = false;
      let invalidContent = "";
      const contentCheckSchema = new Schema({
        topNode: schema.spec.topNode,
        marks: schema.spec.marks,
        nodes: schema.spec.nodes.append({ __tiptap__private__unknown__catch__all__node: {
          content: "inline*",
          group: "block",
          parseDOM: [{
            tag: "*",
            getAttrs: (e) => {
              hasInvalidContent = true;
              invalidContent = typeof e === "string" ? e : e.outerHTML;
              return null;
            }
          }]
        } })
      });
      if (options.slice) DOMParser.fromSchema(contentCheckSchema).parseSlice(elementFromString(content), options.parseOptions);
      else DOMParser.fromSchema(contentCheckSchema).parse(elementFromString(content), options.parseOptions);
      if (options.errorOnInvalidContent && hasInvalidContent) throw new Error("[tiptap error]: Invalid HTML content", { cause: /* @__PURE__ */ new Error(`Invalid element found: ${invalidContent}`) });
    }
    const parser = DOMParser.fromSchema(schema);
    if (options.slice) return parser.parseSlice(elementFromString(content), options.parseOptions).content;
    return parser.parse(elementFromString(content), options.parseOptions);
  }
  return createNodeFromContent("", schema, options);
}
function isFragment(nodeOrFragment) {
  return !("type" in nodeOrFragment);
}
function selectionToInsertionEnd2(tr, startLen, bias) {
  const last = tr.steps.length - 1;
  if (last < startLen) return;
  const step = tr.steps[last];
  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) return;
  const map2 = tr.mapping.maps[last];
  let end = 0;
  map2.forEach((_from, _to, _newFrom, newTo) => {
    if (end === 0) end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
var insertContentAt = (position, value, options) => ({ tr, dispatch, editor }) => {
  if (dispatch) {
    options = {
      parseOptions: editor.options.parseOptions,
      updateSelection: true,
      applyInputRules: false,
      applyPasteRules: false,
      ...options
    };
    let content;
    const emitContentError = (error) => {
      editor.emit("contentError", {
        editor,
        error,
        disableCollaboration: () => {
          if ("collaboration" in editor.storage && typeof editor.storage.collaboration === "object" && editor.storage.collaboration) editor.storage.collaboration.isDisabled = true;
        }
      });
    };
    const parseOptions = {
      preserveWhitespace: "full",
      ...options.parseOptions
    };
    if (!options.errorOnInvalidContent && !editor.options.enableContentCheck && editor.options.emitContentError) try {
      createNodeFromContent(value, editor.schema, {
        parseOptions,
        errorOnInvalidContent: true
      });
    } catch (e) {
      emitContentError(e);
    }
    try {
      var _options$errorOnInval;
      content = createNodeFromContent(value, editor.schema, {
        parseOptions,
        errorOnInvalidContent: (_options$errorOnInval = options.errorOnInvalidContent) !== null && _options$errorOnInval !== void 0 ? _options$errorOnInval : editor.options.enableContentCheck
      });
    } catch (e) {
      emitContentError(e);
      return false;
    }
    let { from: from2, to } = typeof position === "number" ? {
      from: position,
      to: position
    } : {
      from: position.from,
      to: position.to
    };
    let isOnlyTextContent = true;
    let isOnlyBlockContent = true;
    const nodes = isFragment(content) ? content.content : [content];
    nodes.forEach((node) => {
      node.check();
      isOnlyTextContent = isOnlyTextContent ? node.isText && node.marks.length === 0 : false;
      isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false;
    });
    if (from2 === to && isOnlyBlockContent) {
      const { parent } = tr.doc.resolve(from2);
      if (parent.isTextblock && !parent.type.spec.code && !parent.childCount) {
        from2 -= 1;
        to += 1;
      }
    }
    let newContent;
    if (isOnlyTextContent) {
      if (Array.isArray(value)) newContent = value.map((item) => item.text || "").join("");
      else if (isProseMirrorContent(value)) newContent = nodes.map((node) => {
        var _node$text;
        return (_node$text = node.text) !== null && _node$text !== void 0 ? _node$text : "";
      }).join("");
      else if (typeof value === "object" && !!value && !!value.text) newContent = value.text;
      else newContent = value;
      tr.insertText(newContent, from2, to);
    } else {
      newContent = Fragment.from(nodes);
      const $from = tr.doc.resolve(from2);
      const $fromNode = $from.node();
      const fromSelectionAtStart = $from.parentOffset === 0;
      const isTextSelection2 = $fromNode.isText || $fromNode.isTextblock;
      const hasContent = $fromNode.content.size > 0;
      if (fromSelectionAtStart && isTextSelection2 && hasContent && isOnlyBlockContent) from2 = Math.max(0, from2 - 1);
      tr.replaceWith(from2, to, nodes);
    }
    if (options.updateSelection) selectionToInsertionEnd2(tr, tr.steps.length - 1, -1);
    if (options.applyInputRules) tr.setMeta("applyInputRules", {
      from: from2,
      text: newContent
    });
    if (options.applyPasteRules) tr.setMeta("applyPasteRules", {
      from: from2,
      text: newContent
    });
  }
  return true;
};
function defaultBlockAt2(match) {
  for (let i = 0; i < match.edgeCount; i += 1) {
    const { type } = match.edge(i);
    if (type.isTextblock && !type.hasRequiredAttrs()) return type;
  }
  return null;
}
var insertDefaultBlock = (options = {}) => ({ tr, dispatch, editor }) => {
  const { pos, attrs, content, updateSelection: updateSelection2 = true } = options;
  let $pos;
  if (typeof pos === "number") $pos = tr.doc.resolve(pos);
  else if (pos) $pos = pos;
  else $pos = tr.selection.$from;
  const defaultType = defaultBlockAt2($pos.parent.contentMatchAt($pos.index()));
  if (!defaultType) return false;
  const validAttrKeys = Object.keys(defaultType.spec.attrs || {});
  const filteredAttrs = attrs ? Object.fromEntries(Object.entries(attrs).filter(([key]) => validAttrKeys.includes(key))) : {};
  let node;
  if (content) {
    const parsed = createNodeFromContent(content, editor.schema);
    node = defaultType.createAndFill(filteredAttrs, parsed);
  } else node = defaultType.createAndFill(filteredAttrs);
  if (!node) return false;
  if (dispatch) {
    tr.insert($pos.pos, node);
    if (updateSelection2) selectionToInsertionEnd2(tr, tr.steps.length - 1, -1);
  }
  return true;
};
var joinUp$1 = () => ({ state, dispatch }) => {
  return joinUp(state, dispatch);
};
var joinDown$1 = () => ({ state, dispatch }) => {
  return joinDown(state, dispatch);
};
var joinBackward$1 = () => ({ state, dispatch }) => {
  return joinBackward(state, dispatch);
};
var joinForward$1 = () => ({ state, dispatch }) => {
  return joinForward(state, dispatch);
};
var canJoinItemsAt = (doc2, pos) => {
  const $pos = doc2.resolve(pos);
  const before = $pos.nodeBefore;
  const after = $pos.nodeAfter;
  if (!before || !after) return false;
  return !before.type.spec.isolating && !after.type.spec.isolating;
};
var joinItemBackward = () => ({ state, dispatch, tr }) => {
  try {
    const point = joinPoint(state.doc, state.selection.$from.pos, -1);
    if (point === null || point === void 0) return false;
    if (!canJoinItemsAt(state.doc, point)) return false;
    tr.join(point, 2);
    if (dispatch) dispatch(tr);
    return true;
  } catch {
    return false;
  }
};
var joinItemForward = () => ({ state, dispatch, tr }) => {
  try {
    const point = joinPoint(state.doc, state.selection.$from.pos, 1);
    if (point === null || point === void 0) return false;
    if (!canJoinItemsAt(state.doc, point)) return false;
    tr.join(point, 2);
    if (dispatch) dispatch(tr);
    return true;
  } catch {
    return false;
  }
};
var joinTextblockBackward$1 = () => ({ state, dispatch }) => {
  return joinTextblockBackward(state, dispatch);
};
var joinTextblockForward$1 = () => ({ state, dispatch }) => {
  return joinTextblockForward(state, dispatch);
};
function isMacOS() {
  return typeof navigator !== "undefined" ? /Mac/.test(navigator.platform) : false;
}
function normalizeKeyName2(name) {
  const parts = name.split(/-(?!$)/);
  let result = parts[parts.length - 1];
  if (result === "Space") result = " ";
  let alt;
  let ctrl;
  let shift4;
  let meta;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true;
    else if (/^a(lt)?$/i.test(mod)) alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
    else if (/^s(hift)?$/i.test(mod)) shift4 = true;
    else if (/^mod$/i.test(mod)) {
      if (isiOS() || isMacOS()) meta = true;
      else ctrl = true;
    } else throw new Error(`Unrecognized modifier name: ${mod}`);
  }
  if (alt) result = `Alt-${result}`;
  if (ctrl) result = `Ctrl-${result}`;
  if (meta) result = `Meta-${result}`;
  if (shift4) result = `Shift-${result}`;
  return result;
}
var keyboardShortcut = (name) => ({ editor, view, tr, dispatch }) => {
  const keys3 = normalizeKeyName2(name).split(/-(?!$)/);
  const key = keys3.find((item) => ![
    "Alt",
    "Ctrl",
    "Meta",
    "Shift"
  ].includes(item));
  const event = new KeyboardEvent("keydown", {
    key: key === "Space" ? " " : key,
    altKey: keys3.includes("Alt"),
    ctrlKey: keys3.includes("Ctrl"),
    metaKey: keys3.includes("Meta"),
    shiftKey: keys3.includes("Shift"),
    bubbles: true,
    cancelable: true
  });
  const capturedTransaction = editor.captureTransaction(() => {
    view.someProp("handleKeyDown", (f) => f(view, event));
  });
  capturedTransaction === null || capturedTransaction === void 0 || capturedTransaction.steps.forEach((step) => {
    const newStep = step.map(tr.mapping);
    if (newStep && dispatch) tr.maybeStep(newStep);
  });
  return true;
};
function isNodeActive(state, typeOrName, attributes = {}) {
  const { from: from2, to, empty: empty2 } = state.selection;
  const type = typeOrName ? getNodeType(typeOrName, state.schema) : null;
  const nodeRanges = [];
  state.doc.nodesBetween(from2, to, (node, pos) => {
    if (node.isText) return;
    const relativeFrom = Math.max(from2, pos);
    const relativeTo = Math.min(to, pos + node.nodeSize);
    nodeRanges.push({
      node,
      from: relativeFrom,
      to: relativeTo
    });
  });
  const selectionRange = to - from2;
  const matchedNodeRanges = nodeRanges.filter((nodeRange) => {
    if (!type) return true;
    return type.name === nodeRange.node.type.name;
  }).filter((nodeRange) => objectIncludes(nodeRange.node.attrs, attributes, { strict: false }));
  if (empty2) return !!matchedNodeRanges.length;
  return matchedNodeRanges.reduce((sum, nodeRange) => sum + nodeRange.to - nodeRange.from, 0) >= selectionRange;
}
var lift$1 = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
  if (!isNodeActive(state, getNodeType(typeOrName, state.schema), attributes)) return false;
  return lift(state, dispatch);
};
var liftEmptyBlock$1 = () => ({ state, dispatch }) => {
  return liftEmptyBlock(state, dispatch);
};
var liftListItem$1 = (typeOrName) => ({ state, dispatch }) => {
  const type = getNodeType(typeOrName, state.schema);
  return liftListItem(type)(state, dispatch);
};
var newlineInCode$1 = () => ({ state, dispatch }) => {
  return newlineInCode(state, dispatch);
};
function getSchemaTypeNameByName(name, schema) {
  if (schema.nodes[name]) return "node";
  if (schema.marks[name]) return "mark";
  return null;
}
function deleteProps(obj, propOrProps) {
  const props = typeof propOrProps === "string" ? [propOrProps] : propOrProps;
  return Object.keys(obj).reduce((newObj, prop) => {
    if (!props.includes(prop)) newObj[prop] = obj[prop];
    return newObj;
  }, {});
}
var resetAttributes = (typeOrName, attributes) => ({ tr, state, dispatch }) => {
  let nodeType = null;
  let markType = null;
  const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
  if (!schemaType) return false;
  if (schemaType === "node") nodeType = getNodeType(typeOrName, state.schema);
  if (schemaType === "mark") markType = getMarkType(typeOrName, state.schema);
  let canReset = false;
  tr.selection.ranges.forEach((range) => {
    state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
      if (nodeType && nodeType === node.type) {
        canReset = true;
        if (dispatch) tr.setNodeMarkup(pos, void 0, deleteProps(node.attrs, attributes));
      }
      if (markType && node.marks.length) node.marks.forEach((mark) => {
        if (markType === mark.type) {
          canReset = true;
          if (dispatch) tr.addMark(pos, pos + node.nodeSize, markType.create(deleteProps(mark.attrs, attributes)));
        }
      });
    });
  });
  return canReset;
};
var scrollIntoView = () => ({ tr, dispatch }) => {
  if (dispatch) tr.scrollIntoView();
  return true;
};
var selectAll2 = () => ({ tr, dispatch }) => {
  if (dispatch) {
    const selection = new AllSelection(tr.doc);
    tr.setSelection(selection);
  }
  return true;
};
var selectNodeBackward$1 = () => ({ state, dispatch }) => {
  return selectNodeBackward(state, dispatch);
};
var selectNodeForward$1 = () => ({ state, dispatch }) => {
  return selectNodeForward(state, dispatch);
};
var selectParentNode$1 = () => ({ state, dispatch }) => {
  return selectParentNode(state, dispatch);
};
var selectTextblockEnd$1 = () => ({ state, dispatch }) => {
  return selectTextblockEnd(state, dispatch);
};
var selectTextblockStart$1 = () => ({ state, dispatch }) => {
  return selectTextblockStart(state, dispatch);
};
function createDocument(content, schema, parseOptions = {}, options = {}) {
  return createNodeFromContent(content, schema, {
    slice: false,
    parseOptions,
    errorOnInvalidContent: options.errorOnInvalidContent
  });
}
var setContent = (content, { errorOnInvalidContent, emitUpdate = true, parseOptions = {} } = {}) => ({ editor, tr, dispatch, commands }) => {
  const { doc: doc2 } = tr;
  if (parseOptions.preserveWhitespace !== "full") {
    const document2 = createDocument(content, editor.schema, parseOptions, { errorOnInvalidContent: errorOnInvalidContent !== null && errorOnInvalidContent !== void 0 ? errorOnInvalidContent : editor.options.enableContentCheck });
    if (dispatch) {
      const nodes = isFragment(document2) ? document2.content : [document2];
      tr.replaceWith(0, doc2.content.size, nodes).setMeta("preventUpdate", !emitUpdate);
    }
    return true;
  }
  if (dispatch) tr.setMeta("preventUpdate", !emitUpdate);
  return commands.insertContentAt({
    from: 0,
    to: doc2.content.size
  }, content, {
    parseOptions,
    errorOnInvalidContent: errorOnInvalidContent !== null && errorOnInvalidContent !== void 0 ? errorOnInvalidContent : editor.options.enableContentCheck
  });
};
function getMarkAttributes(state, typeOrName) {
  const type = getMarkType(typeOrName, state.schema);
  const { from: from2, to, empty: empty2 } = state.selection;
  const marks = [];
  if (empty2) {
    if (state.storedMarks) marks.push(...state.storedMarks);
    marks.push(...state.selection.$head.marks());
  } else state.doc.nodesBetween(from2, to, (node) => {
    marks.push(...node.marks);
  });
  const mark = marks.find((markItem) => markItem.type.name === type.name);
  if (!mark) return {};
  return { ...mark.attrs };
}
function combineTransactionSteps(oldDoc, transactions) {
  const transform = new Transform(oldDoc);
  transactions.forEach((transaction) => {
    transaction.steps.forEach((step) => {
      transform.step(step);
    });
  });
  return transform;
}
function findParentNodeClosestToPos($pos, predicate) {
  for (let i = $pos.depth; i > 0; i -= 1) {
    const node = $pos.node(i);
    if (predicate(node)) return {
      pos: i > 0 ? $pos.before(i) : 0,
      start: $pos.start(i),
      depth: i,
      node
    };
  }
}
function findParentNode(predicate) {
  return (selection) => findParentNodeClosestToPos(selection.$from, predicate);
}
function getExtensionField(extension, field, context) {
  if (extension.config[field] === void 0 && extension.parent) return getExtensionField(extension.parent, field, context);
  if (typeof extension.config[field] === "function") return extension.config[field].bind({
    ...context,
    parent: extension.parent ? getExtensionField(extension.parent, field, context) : null
  });
  return extension.config[field];
}
function flattenExtensions(extensions) {
  return extensions.map((extension) => {
    const addExtensions = getExtensionField(extension, "addExtensions", {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    });
    if (addExtensions) return [extension, ...flattenExtensions(addExtensions())];
    return extension;
  }).flat(10);
}
function getHTMLFromFragment(fragment, schema) {
  const documentFragment = DOMSerializer.fromSchema(schema).serializeFragment(fragment);
  const container = document.implementation.createHTMLDocument().createElement("div");
  container.appendChild(documentFragment);
  return container.innerHTML;
}
function getSchemaAttributes(attributes, schema) {
  const attributesByType = /* @__PURE__ */ new Map();
  for (const attribute of attributes) {
    var _attributesByType$get;
    const typeAttributes = (_attributesByType$get = attributesByType.get(attribute.type)) !== null && _attributesByType$get !== void 0 ? _attributesByType$get : /* @__PURE__ */ new Map();
    typeAttributes.set(attribute.name, attribute);
    attributesByType.set(attribute.type, typeAttributes);
  }
  return [...Object.values(schema.nodes), ...Object.values(schema.marks)].flatMap((type) => {
    var _type$spec$attrs;
    return Object.entries((_type$spec$attrs = type.spec.attrs) !== null && _type$spec$attrs !== void 0 ? _type$spec$attrs : {}).map(([name, spec]) => {
      var _attributesByType$get2;
      const local = (_attributesByType$get2 = attributesByType.get(type.name)) === null || _attributesByType$get2 === void 0 ? void 0 : _attributesByType$get2.get(name);
      const hasDefault = Object.hasOwn(spec, "default");
      return {
        type: type.name,
        name,
        attribute: {
          rendered: true,
          renderHTML: null,
          parseHTML: null,
          keepOnSplit: true,
          ...local === null || local === void 0 ? void 0 : local.attribute,
          default: spec.default,
          isRequired: !hasDefault,
          validate: spec.validate
        }
      };
    });
  });
}
var nodeSchemaFields = {
  content: "string",
  marks: "string",
  group: "string",
  inline: "boolean",
  atom: "boolean",
  selectable: "boolean",
  draggable: "boolean",
  code: "boolean",
  whitespace: ["pre", "normal"],
  definingAsContext: "boolean",
  definingForContent: "boolean",
  defining: "boolean",
  isolating: "boolean",
  linebreakReplacement: "boolean"
};
var markSchemaFields = {
  inclusive: "boolean",
  excludes: "string",
  group: "string",
  spanning: "boolean",
  code: "boolean"
};
function structuralFields(spec, fields, path) {
  return Object.fromEntries(Object.entries(fields).flatMap(([name, expected]) => {
    const value = spec[name];
    if (value === void 0) return [];
    if (!(typeof expected === "string" ? typeof value === expected : typeof value === "string" && expected.includes(value))) throw new RangeError(`Invalid schemaSpec field '${path}.${name}'`);
    return [[name, value]];
  }));
}
function mergeType(name, local, external, fields) {
  return {
    ...Object.fromEntries(Object.entries(local).filter(([key]) => key !== "attrs" && !Object.hasOwn(fields, key))),
    ...structuralFields(external, fields, name),
    attrs: external.attrs
  };
}
function checkTypes(local, external, kind) {
  for (const name of Object.keys(external)) if (!Object.hasOwn(local, name)) throw new RangeError(`schemaSpec requires a local ${kind} extension named '${name}'`);
  for (const name of Object.keys(local)) if (!Object.hasOwn(external, name)) throw new RangeError(`Local ${kind} extension '${name}' is not in schemaSpec`);
}
function mergeSchemaSpec(local, external) {
  checkTypes(local.nodes, external.nodes, "node");
  checkTypes(local.marks, external.marks, "mark");
  let nodes = external.spec.nodes;
  let marks = external.spec.marks;
  external.spec.nodes.forEach((name, spec) => {
    nodes = nodes.update(name, mergeType(name, local.nodes[name], spec, nodeSchemaFields));
  });
  external.spec.marks.forEach((name, spec) => {
    marks = marks.update(name, mergeType(name, local.marks[name], spec, markSchemaFields));
  });
  return {
    topNode: external.topNodeType.name,
    nodes,
    marks
  };
}
function findDuplicates(items) {
  const filtered = items.filter((el, index) => items.indexOf(el) !== index);
  return Array.from(new Set(filtered));
}
function splitExtensions(extensions) {
  return {
    baseExtensions: extensions.filter((extension) => extension.type === "extension"),
    nodeExtensions: extensions.filter((extension) => extension.type === "node"),
    markExtensions: extensions.filter((extension) => extension.type === "mark")
  };
}
function getAttributesFromExtensions(extensions) {
  const extensionAttributes = [];
  const { nodeExtensions, markExtensions } = splitExtensions(extensions);
  const nodeAndMarkExtensions = [...nodeExtensions, ...markExtensions];
  const defaultAttribute = {
    default: null,
    validate: void 0,
    rendered: true,
    renderHTML: null,
    parseHTML: null,
    keepOnSplit: true,
    isRequired: false
  };
  const nodeExtensionTypes = nodeExtensions.filter((ext) => ext.name !== "text").map((ext) => ext.name);
  const markExtensionTypes = markExtensions.map((ext) => ext.name);
  const allExtensionTypes = [...nodeExtensionTypes, ...markExtensionTypes];
  extensions.forEach((extension) => {
    const addGlobalAttributes = getExtensionField(extension, "addGlobalAttributes", {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      extensions: nodeAndMarkExtensions
    });
    if (!addGlobalAttributes) return;
    addGlobalAttributes().forEach((globalAttribute) => {
      let resolvedTypes;
      if (Array.isArray(globalAttribute.types)) resolvedTypes = globalAttribute.types;
      else if (globalAttribute.types === "*") resolvedTypes = allExtensionTypes;
      else if (globalAttribute.types === "nodes") resolvedTypes = nodeExtensionTypes;
      else if (globalAttribute.types === "marks") resolvedTypes = markExtensionTypes;
      else resolvedTypes = [];
      resolvedTypes.forEach((type) => {
        Object.entries(globalAttribute.attributes).forEach(([name, attribute]) => {
          extensionAttributes.push({
            type,
            name,
            attribute: {
              ...defaultAttribute,
              ...attribute
            }
          });
        });
      });
    });
  });
  nodeAndMarkExtensions.forEach((extension) => {
    const addAttributes = getExtensionField(extension, "addAttributes", {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    });
    if (!addAttributes) return;
    const attributes = addAttributes();
    Object.entries(attributes).forEach(([name, attribute]) => {
      const mergedAttr = {
        ...defaultAttribute,
        ...attribute
      };
      if (typeof (mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.default) === "function") mergedAttr.default = mergedAttr.default();
      if ((mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.isRequired) && (mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.default) === void 0) delete mergedAttr.default;
      extensionAttributes.push({
        type: extension.name,
        name,
        attribute: mergedAttr
      });
    });
  });
  return extensionAttributes;
}
function isFunction(value) {
  return typeof value === "function";
}
function callOrReturn(value, context = void 0, ...props) {
  if (isFunction(value)) {
    if (context) return value.bind(context)(...props);
    return value(...props);
  }
  return value;
}
function isEmptyObject(value = {}) {
  return Object.keys(value).length === 0 && value.constructor === Object;
}
function splitStyleDeclarations(styles) {
  const result = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;
  const length = styles.length;
  for (let i = 0; i < length; i += 1) {
    const char = styles[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "(") {
        parenDepth += 1;
        current += char;
        continue;
      }
      if (char === ")" && parenDepth > 0) {
        parenDepth -= 1;
        current += char;
        continue;
      }
      if (char === ";" && parenDepth === 0) {
        result.push(current);
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current) result.push(current);
  return result;
}
function parseStyleEntries(styles) {
  const pairs = [];
  const declarations = splitStyleDeclarations(styles || "");
  const numDeclarations = declarations.length;
  for (let i = 0; i < numDeclarations; i += 1) {
    const declaration = declarations[i];
    const firstColonIndex = declaration.indexOf(":");
    if (firstColonIndex === -1) continue;
    const property = declaration.slice(0, firstColonIndex).trim();
    const value = declaration.slice(firstColonIndex + 1).trim();
    if (property && value) pairs.push([property, value]);
  }
  return pairs;
}
function mergeAttributes(...objects) {
  return objects.filter((item) => !!item).reduce((items, item) => {
    const mergedAttributes = { ...items };
    Object.entries(item).forEach(([key, value]) => {
      if (key === "__proto__") {
        Object.defineProperty(mergedAttributes, key, {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        });
        return;
      }
      if (!mergedAttributes[key]) {
        mergedAttributes[key] = value;
        return;
      }
      if (key === "class") {
        const valueClasses = value ? String(value).split(" ") : [];
        const existingClasses = mergedAttributes[key] ? mergedAttributes[key].split(" ") : [];
        const insertClasses = valueClasses.filter((valueClass) => !existingClasses.includes(valueClass));
        mergedAttributes[key] = [...existingClasses, ...insertClasses].join(" ");
      } else if (key === "style") {
        const styleMap = new Map([...parseStyleEntries(mergedAttributes[key]), ...parseStyleEntries(value)]);
        mergedAttributes[key] = Array.from(styleMap.entries()).map(([property, val]) => `${property}: ${val}`).join("; ");
      } else mergedAttributes[key] = value;
    });
    return mergedAttributes;
  }, {});
}
function getRenderedAttributes(nodeOrMark, extensionAttributes) {
  return extensionAttributes.filter((attribute) => attribute.type === nodeOrMark.type.name).filter((item) => item.attribute.rendered).map((item) => {
    if (!item.attribute.renderHTML) return { [item.name]: nodeOrMark.attrs[item.name] };
    return item.attribute.renderHTML(nodeOrMark.attrs) || {};
  }).reduce((attributes, attribute) => mergeAttributes(attributes, attribute), {});
}
function fromString(value) {
  if (typeof value !== "string") return value;
  if (value.match(/^[+-]?(?:\d*\.)?\d+$/)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}
function injectExtensionAttributesToParseRule(parseRule, extensionAttributes) {
  if ("style" in parseRule) return parseRule;
  return {
    ...parseRule,
    getAttrs: (node) => {
      const oldAttributes = parseRule.getAttrs ? parseRule.getAttrs(node) : parseRule.attrs;
      if (oldAttributes === false) return false;
      const newAttributes = extensionAttributes.reduce((items, item) => {
        const value = item.attribute.parseHTML ? item.attribute.parseHTML(node) : fromString(node.getAttribute(item.name));
        if (value === null || value === void 0) return items;
        return {
          ...items,
          [item.name]: value
        };
      }, {});
      return {
        ...oldAttributes,
        ...newAttributes
      };
    }
  };
}
function cleanUpSchemaItem(data) {
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => {
    if (key === "attrs" && isEmptyObject(value)) return false;
    return value !== null && value !== void 0;
  }));
}
function buildAttributeSpec(extensionAttribute) {
  var _extensionAttribute$a, _extensionAttribute$a2;
  const spec = {};
  if (!(extensionAttribute === null || extensionAttribute === void 0 || (_extensionAttribute$a = extensionAttribute.attribute) === null || _extensionAttribute$a === void 0 ? void 0 : _extensionAttribute$a.isRequired) && "default" in ((extensionAttribute === null || extensionAttribute === void 0 ? void 0 : extensionAttribute.attribute) || {})) spec.default = extensionAttribute.attribute.default;
  if ((extensionAttribute === null || extensionAttribute === void 0 || (_extensionAttribute$a2 = extensionAttribute.attribute) === null || _extensionAttribute$a2 === void 0 ? void 0 : _extensionAttribute$a2.validate) !== void 0) spec.validate = extensionAttribute.attribute.validate;
  return [extensionAttribute.name, spec];
}
function getSchemaSpecByResolvedExtensions(extensions, editor, allAttributes = getAttributesFromExtensions(extensions)) {
  var _nodeExtensions$find;
  const { nodeExtensions, markExtensions } = splitExtensions(extensions);
  return {
    topNode: (_nodeExtensions$find = nodeExtensions.find((extension) => getExtensionField(extension, "topNode"))) === null || _nodeExtensions$find === void 0 ? void 0 : _nodeExtensions$find.name,
    nodes: Object.fromEntries(nodeExtensions.map((extension) => {
      const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor
      };
      const schema = cleanUpSchemaItem({
        ...extensions.reduce((fields, e) => {
          const extendNodeSchema = getExtensionField(e, "extendNodeSchema", context);
          return {
            ...fields,
            ...extendNodeSchema ? extendNodeSchema(extension) : {}
          };
        }, {}),
        content: callOrReturn(getExtensionField(extension, "content", context)),
        marks: callOrReturn(getExtensionField(extension, "marks", context)),
        group: callOrReturn(getExtensionField(extension, "group", context)),
        inline: callOrReturn(getExtensionField(extension, "inline", context)),
        atom: callOrReturn(getExtensionField(extension, "atom", context)),
        selectable: callOrReturn(getExtensionField(extension, "selectable", context)),
        draggable: callOrReturn(getExtensionField(extension, "draggable", context)),
        code: callOrReturn(getExtensionField(extension, "code", context)),
        whitespace: callOrReturn(getExtensionField(extension, "whitespace", context)),
        linebreakReplacement: callOrReturn(getExtensionField(extension, "linebreakReplacement", context)),
        defining: callOrReturn(getExtensionField(extension, "defining", context)),
        isolating: callOrReturn(getExtensionField(extension, "isolating", context)),
        attrs: Object.fromEntries(extensionAttributes.map(buildAttributeSpec))
      });
      const parseHTML = callOrReturn(getExtensionField(extension, "parseHTML", context));
      if (parseHTML) schema.parseDOM = parseHTML.map((parseRule) => injectExtensionAttributesToParseRule(parseRule, extensionAttributes));
      const renderHTML = getExtensionField(extension, "renderHTML", context);
      if (renderHTML) schema.toDOM = (node) => renderHTML({
        node,
        HTMLAttributes: getRenderedAttributes(node, extensionAttributes)
      });
      const renderText = getExtensionField(extension, "renderText", context);
      if (renderText) schema.toText = renderText;
      return [extension.name, schema];
    })),
    marks: Object.fromEntries(markExtensions.map((extension) => {
      const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor
      };
      const schema = cleanUpSchemaItem({
        ...extensions.reduce((fields, e) => {
          const extendMarkSchema = getExtensionField(e, "extendMarkSchema", context);
          return {
            ...fields,
            ...extendMarkSchema ? extendMarkSchema(extension) : {}
          };
        }, {}),
        inclusive: callOrReturn(getExtensionField(extension, "inclusive", context)),
        excludes: callOrReturn(getExtensionField(extension, "excludes", context)),
        group: callOrReturn(getExtensionField(extension, "group", context)),
        spanning: callOrReturn(getExtensionField(extension, "spanning", context)),
        code: callOrReturn(getExtensionField(extension, "code", context)),
        attrs: Object.fromEntries(extensionAttributes.map(buildAttributeSpec))
      });
      const parseHTML = callOrReturn(getExtensionField(extension, "parseHTML", context));
      if (parseHTML) schema.parseDOM = parseHTML.map((parseRule) => injectExtensionAttributesToParseRule(parseRule, extensionAttributes));
      const renderHTML = getExtensionField(extension, "renderHTML", context);
      if (renderHTML) schema.toDOM = (mark) => renderHTML({
        mark,
        HTMLAttributes: getRenderedAttributes(mark, extensionAttributes)
      });
      return [extension.name, schema];
    }))
  };
}
function getSchemaByResolvedExtensions(extensions, editor, schemaSpec) {
  if (schemaSpec === void 0) return new Schema(getSchemaSpecByResolvedExtensions(extensions, editor));
  const duplicates = findDuplicates(extensions.filter((extension) => extension.type !== "extension").map((extension) => extension.name));
  if (duplicates.length) throw new RangeError(`Duplicate local schema types: ${duplicates.join(", ")}`);
  const external = new Schema(schemaSpec);
  const local = getSchemaSpecByResolvedExtensions(extensions, editor, getSchemaAttributes(getAttributesFromExtensions(extensions), external));
  return new Schema(mergeSchemaSpec(local, external));
}
function sortExtensions(extensions) {
  const defaultPriority = 100;
  return extensions.sort((a, b) => {
    const priorityA = getExtensionField(a, "priority") || defaultPriority;
    const priorityB = getExtensionField(b, "priority") || defaultPriority;
    if (priorityA > priorityB) return -1;
    if (priorityA < priorityB) return 1;
    return 0;
  });
}
function resolveExtensions(extensions) {
  const resolvedExtensions = sortExtensions(flattenExtensions(extensions));
  const duplicatedNames = findDuplicates(resolvedExtensions.map((extension) => extension.name));
  if (duplicatedNames.length) console.warn(`[tiptap warn]: Duplicate extension names found: [${duplicatedNames.map((item) => `'${item}'`).join(", ")}]. This can lead to issues.`);
  return resolvedExtensions;
}
function getTextBetween(startNode, range, options) {
  const { from: from2, to } = range;
  const { blockSeparator = "\n\n", textSerializers = {} } = options || {};
  let text = "";
  startNode.nodesBetween(from2, to, (node, pos, parent, index) => {
    if (node.isBlock && pos > from2) text += blockSeparator;
    const textSerializer = textSerializers === null || textSerializers === void 0 ? void 0 : textSerializers[node.type.name];
    if (textSerializer) {
      if (parent) text += textSerializer({
        node,
        pos,
        parent,
        index,
        range
      });
      return false;
    }
    if (node.isText) {
      var _node$text;
      text += node === null || node === void 0 || (_node$text = node.text) === null || _node$text === void 0 ? void 0 : _node$text.slice(Math.max(from2, pos) - pos, to - pos);
    }
  });
  return text;
}
function getText2(node, options) {
  return getTextBetween(node, {
    from: 0,
    to: node.content.size
  }, options);
}
function getTextSerializersFromSchema(schema) {
  return Object.fromEntries(Object.entries(schema.nodes).filter(([, node]) => node.spec.toText).map(([name, node]) => [name, node.spec.toText]));
}
function getNodeAttributes(state, typeOrName) {
  const type = getNodeType(typeOrName, state.schema);
  const { from: from2, to } = state.selection;
  const nodes = [];
  state.doc.nodesBetween(from2, to, (node2) => {
    nodes.push(node2);
  });
  const node = nodes.reverse().find((nodeItem) => nodeItem.type.name === type.name);
  if (!node) return {};
  return { ...node.attrs };
}
function getAttributes(state, typeOrName) {
  const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
  if (schemaType === "node") return getNodeAttributes(state, typeOrName);
  if (schemaType === "mark") return getMarkAttributes(state, typeOrName);
  return {};
}
function removeDuplicates(array, by = JSON.stringify) {
  const seen = {};
  return array.filter((item) => {
    const key = by(item);
    return Object.prototype.hasOwnProperty.call(seen, key) ? false : seen[key] = true;
  });
}
function simplifyChangedRanges(changes) {
  const uniqueChanges = removeDuplicates(changes);
  return uniqueChanges.length === 1 ? uniqueChanges : uniqueChanges.filter((change, index) => {
    return !uniqueChanges.filter((_, i) => i !== index).some((otherChange) => {
      return change.oldRange.from >= otherChange.oldRange.from && change.oldRange.to <= otherChange.oldRange.to && change.newRange.from >= otherChange.newRange.from && change.newRange.to <= otherChange.newRange.to;
    });
  });
}
function getChangedRanges(transform) {
  const { mapping, steps } = transform;
  const changes = [];
  mapping.maps.forEach((stepMap, index) => {
    const ranges = [];
    if (!stepMap.ranges.length) {
      const { from: from2, to } = steps[index];
      if (from2 === void 0 || to === void 0) return;
      ranges.push({
        from: from2,
        to
      });
    } else stepMap.forEach((from2, to) => {
      ranges.push({
        from: from2,
        to
      });
    });
    ranges.forEach(({ from: from2, to }) => {
      const newStart = mapping.slice(index).map(from2, -1);
      const newEnd = mapping.slice(index).map(to);
      const oldStart = mapping.invert().map(newStart, -1);
      const oldEnd = mapping.invert().map(newEnd);
      changes.push({
        oldRange: {
          from: oldStart,
          to: oldEnd
        },
        newRange: {
          from: newStart,
          to: newEnd
        }
      });
    });
  });
  return simplifyChangedRanges(changes);
}
function getSchemaTypeByName(name, schema) {
  return schema.nodes[name] || schema.marks[name] || null;
}
function getSplittedAttributes(extensionAttributes, typeName, attributes) {
  return Object.fromEntries(Object.entries(attributes).filter(([name]) => {
    const extensionAttribute = extensionAttributes.find((item) => {
      return item.type === typeName && item.name === name;
    });
    if (!extensionAttribute) return false;
    return extensionAttribute.attribute.keepOnSplit;
  }));
}
var getTextContentFromNodes = ($from, maxMatch = 500) => {
  let textBefore = "";
  const sliceEndPos = $from.parentOffset;
  $from.parent.nodesBetween(Math.max(0, sliceEndPos - maxMatch), sliceEndPos, (node, pos, parent, index) => {
    var _node$type$spec$toTex, _node$type$spec;
    const chunk = ((_node$type$spec$toTex = (_node$type$spec = node.type.spec).toText) === null || _node$type$spec$toTex === void 0 ? void 0 : _node$type$spec$toTex.call(_node$type$spec, {
      node,
      pos,
      parent,
      index
    })) || node.textContent || "%leaf%";
    textBefore += node.isAtom && !node.isText ? chunk : chunk.slice(0, Math.max(0, sliceEndPos - pos));
  });
  return textBefore;
};
function isMarkActive(state, typeOrName, attributes = {}) {
  const { empty: empty2, ranges } = state.selection;
  const type = typeOrName ? getMarkType(typeOrName, state.schema) : null;
  if (empty2) return !!(state.storedMarks || state.selection.$from.marks()).filter((mark) => {
    if (!type) return true;
    return type.name === mark.type.name;
  }).find((mark) => objectIncludes(mark.attrs, attributes, { strict: false }));
  let selectionRange = 0;
  const markRanges = [];
  ranges.forEach(({ $from, $to }) => {
    const from2 = $from.pos;
    const to = $to.pos;
    state.doc.nodesBetween(from2, to, (node, pos) => {
      if (type && node.inlineContent && !node.type.allowsMarkType(type)) return false;
      if (!node.isText && !node.marks.length) return;
      const relativeFrom = Math.max(from2, pos);
      const relativeTo = Math.min(to, pos + node.nodeSize);
      const range = relativeTo - relativeFrom;
      selectionRange += range;
      markRanges.push(...node.marks.map((mark) => ({
        mark,
        from: relativeFrom,
        to: relativeTo
      })));
    });
  });
  if (selectionRange === 0) return false;
  const matchedRange = markRanges.filter((markRange) => {
    if (!type) return true;
    return type.name === markRange.mark.type.name;
  }).filter((markRange) => objectIncludes(markRange.mark.attrs, attributes, { strict: false })).reduce((sum, markRange) => sum + markRange.to - markRange.from, 0);
  const excludedRange = markRanges.filter((markRange) => {
    if (!type) return true;
    return markRange.mark.type !== type && markRange.mark.type.excludes(type);
  }).reduce((sum, markRange) => sum + markRange.to - markRange.from, 0);
  return (matchedRange > 0 ? matchedRange + excludedRange : matchedRange) >= selectionRange;
}
function isActive(state, name, attributes = {}) {
  if (!name) return isNodeActive(state, null, attributes) || isMarkActive(state, null, attributes);
  const schemaType = getSchemaTypeNameByName(name, state.schema);
  if (schemaType === "node") return isNodeActive(state, name, attributes);
  if (schemaType === "mark") return isMarkActive(state, name, attributes);
  return false;
}
function isExtensionRulesEnabled(extension, enabled) {
  if (Array.isArray(enabled)) return enabled.some((enabledExtension) => {
    return (typeof enabledExtension === "string" ? enabledExtension : enabledExtension.name) === extension.name;
  });
  return enabled;
}
function isList(name, extensions) {
  const { nodeExtensions } = splitExtensions(extensions);
  const extension = nodeExtensions.find((item) => item.name === name);
  if (!extension) return false;
  const group = callOrReturn(getExtensionField(extension, "group", {
    name: extension.name,
    options: extension.options,
    storage: extension.storage
  }));
  if (typeof group !== "string") return false;
  return group.split(" ").includes("list");
}
function isNodeEmpty(node, { checkChildren = true, ignoreWhitespace = false } = {}) {
  if (ignoreWhitespace) {
    if (node.type.name === "hardBreak") return true;
    if (node.isText) {
      var _node$text;
      return !/\S/.test((_node$text = node.text) !== null && _node$text !== void 0 ? _node$text : "");
    }
  }
  if (node.isText) return !node.text;
  if (node.isAtom || node.isLeaf) return false;
  if (node.content.childCount === 0) return true;
  if (checkChildren) {
    let isContentEmpty = true;
    node.content.forEach((childNode) => {
      if (isContentEmpty === false) return;
      if (!isNodeEmpty(childNode, {
        ignoreWhitespace,
        checkChildren
      })) isContentEmpty = false;
    });
    return isContentEmpty;
  }
  return false;
}
function isNodeSelection(value) {
  return value instanceof NodeSelection;
}
function isProseMirrorStep(value) {
  if (value === null || typeof value !== "object") return false;
  const step = value;
  if (typeof step.apply !== "function" || typeof step.getMap !== "function" || typeof step.invert !== "function" || typeof step.map !== "function" || typeof step.merge !== "function" || typeof step.toJSON !== "function") return false;
  return true;
}
function isProseMirrorReplaceStep(value) {
  if (value === null || typeof value !== "object") return false;
  const step = value;
  if (!isProseMirrorStep(step)) return false;
  const json = step.toJSON();
  if (json === null || typeof json !== "object" || json.stepType !== "replace") return false;
  return true;
}
var MappablePosition = class MappablePosition2 {
  constructor(position) {
    this.position = position;
  }
  /**
  * Creates a MappablePosition from a JSON object.
  */
  static fromJSON(json) {
    return new MappablePosition2(json.position);
  }
  /**
  * Converts the MappablePosition to a JSON object.
  */
  toJSON() {
    return { position: this.position };
  }
};
function getUpdatedPosition(position, transaction) {
  const mapResult = transaction.mapping.mapResult(position.position);
  return {
    position: new MappablePosition(mapResult.pos),
    mapResult
  };
}
function createMappablePosition(position) {
  return new MappablePosition(position);
}
function posToDOMRect(view, from2, to) {
  const minPos = 0;
  const maxPos = view.state.doc.content.size;
  const resolvedFrom = minMax(from2, minPos, maxPos);
  const resolvedEnd = minMax(to, minPos, maxPos);
  const start = view.coordsAtPos(resolvedFrom);
  const end = view.coordsAtPos(resolvedEnd, -1);
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);
  const data = {
    top,
    bottom,
    left,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };
  return {
    ...data,
    toJSON: () => data
  };
}
function canSetMark(state, tr, newMarkType) {
  const { selection } = tr;
  let cursor = null;
  if (isTextSelection(selection)) cursor = selection.$cursor;
  if (cursor) {
    var _state$storedMarks;
    const currentMarks = (_state$storedMarks = state.storedMarks) !== null && _state$storedMarks !== void 0 ? _state$storedMarks : cursor.marks();
    return cursor.parent.type.allowsMarkType(newMarkType) && (!!newMarkType.isInSet(currentMarks) || !currentMarks.some((mark) => mark.type.excludes(newMarkType)));
  }
  const { ranges } = selection;
  return ranges.some(({ $from, $to }) => {
    let someNodeSupportsMark = $from.depth === 0 ? state.doc.inlineContent && state.doc.type.allowsMarkType(newMarkType) : false;
    state.doc.nodesBetween($from.pos, $to.pos, (node, _pos, parent) => {
      if (someNodeSupportsMark) return false;
      if (node.isInline) {
        const parentAllowsMarkType = !parent || parent.type.allowsMarkType(newMarkType);
        const currentMarksAllowMarkType = !!newMarkType.isInSet(node.marks) || !node.marks.some((otherMark) => otherMark.type.excludes(newMarkType));
        someNodeSupportsMark = parentAllowsMarkType && currentMarksAllowMarkType;
      }
      return !someNodeSupportsMark;
    });
    return someNodeSupportsMark;
  });
}
var setMark = (typeOrName, attributes = {}) => ({ tr, state, dispatch }) => {
  const { selection } = tr;
  const { empty: empty2, ranges } = selection;
  const type = getMarkType(typeOrName, state.schema);
  if (dispatch) {
    if (empty2) {
      const oldAttributes = getMarkAttributes(state, type);
      tr.addStoredMark(type.create({
        ...oldAttributes,
        ...attributes
      }));
    } else ranges.forEach((range) => {
      const from2 = range.$from.pos;
      const to = range.$to.pos;
      state.doc.nodesBetween(from2, to, (node, pos) => {
        const trimmedFrom = Math.max(pos, from2);
        const trimmedTo = Math.min(pos + node.nodeSize, to);
        if (node.marks.find((mark) => mark.type === type)) node.marks.forEach((mark) => {
          if (type === mark.type) tr.addMark(trimmedFrom, trimmedTo, type.create({
            ...mark.attrs,
            ...attributes
          }));
        });
        else tr.addMark(trimmedFrom, trimmedTo, type.create(attributes));
      });
    });
  }
  return canSetMark(state, tr, type);
};
var setMeta = (key, value) => ({ tr }) => {
  tr.setMeta(key, value);
  return true;
};
var setNode = (typeOrName, attributes = {}) => ({ state, dispatch, chain }) => {
  const type = getNodeType(typeOrName, state.schema);
  let attributesToCopy;
  if (state.selection.$anchor.sameParent(state.selection.$head)) attributesToCopy = state.selection.$anchor.parent.attrs;
  if (!type.isTextblock) {
    console.warn('[tiptap warn]: Currently "setNode()" only supports text block nodes.');
    return false;
  }
  return chain().command(({ commands }) => {
    if (setBlockType(type, {
      ...attributesToCopy,
      ...attributes
    })(state)) return true;
    return commands.clearNodes();
  }).command(({ state: updatedState }) => {
    return setBlockType(type, {
      ...attributesToCopy,
      ...attributes
    })(updatedState, dispatch);
  }).run();
};
var setNodeSelection = (position) => ({ tr, dispatch }) => {
  if (dispatch) {
    const { doc: doc2 } = tr;
    const from2 = minMax(position, 0, doc2.content.size);
    const selection = NodeSelection.create(doc2, from2);
    tr.setSelection(selection);
  }
  return true;
};
var setTextDirection = (direction, position) => ({ tr, state, dispatch }) => {
  const { selection } = state;
  let from2;
  let to;
  if (typeof position === "number") {
    from2 = position;
    to = position;
  } else if (position && "from" in position && "to" in position) {
    from2 = position.from;
    to = position.to;
  } else {
    from2 = selection.from;
    to = selection.to;
  }
  if (dispatch) tr.doc.nodesBetween(from2, to, (node, pos) => {
    if (node.isText) return;
    tr.setNodeMarkup(pos, void 0, {
      ...node.attrs,
      dir: direction
    });
  });
  return true;
};
var setTextSelection = (position) => ({ tr, dispatch }) => {
  if (dispatch) {
    const { doc: doc2 } = tr;
    const { from: from2, to } = typeof position === "number" ? {
      from: position,
      to: position
    } : position;
    const minPos = TextSelection.atStart(doc2).from;
    const maxPos = TextSelection.atEnd(doc2).to;
    const resolvedFrom = minMax(from2, minPos, maxPos);
    const resolvedEnd = minMax(to, minPos, maxPos);
    const selection = TextSelection.create(doc2, resolvedFrom, resolvedEnd);
    tr.setSelection(selection);
  }
  return true;
};
var sinkListItem$1 = (typeOrName) => ({ state, dispatch }) => {
  const type = getNodeType(typeOrName, state.schema);
  return sinkListItem(type)(state, dispatch);
};
function ensureMarks(state, splittableMarks) {
  const marks = state.storedMarks || state.selection.$to.parentOffset && state.selection.$from.marks();
  if (marks) {
    const filteredMarks = marks.filter((mark) => splittableMarks === null || splittableMarks === void 0 ? void 0 : splittableMarks.includes(mark.type.name));
    state.tr.ensureMarks(filteredMarks);
  }
}
var splitBlock2 = ({ keepMarks = true } = {}) => ({ tr, state, dispatch, editor }) => {
  const { selection, doc: doc2 } = tr;
  const { $from, $to } = selection;
  const extensionAttributes = editor.extensionManager.attributes;
  const newAttributes = getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs);
  if (selection instanceof NodeSelection && selection.node.isBlock) {
    if (!$from.parentOffset || !canSplit(doc2, $from.pos)) return false;
    if (dispatch) {
      if (keepMarks) ensureMarks(state, editor.extensionManager.splittableMarks);
      tr.split($from.pos).scrollIntoView();
    }
    return true;
  }
  if (!$from.parent.isBlock) return false;
  const atEnd = $to.parentOffset === $to.parent.content.size;
  const deflt = $from.depth === 0 ? void 0 : defaultBlockAt2($from.node(-1).contentMatchAt($from.indexAfter(-1)));
  let types = atEnd && deflt ? [{
    type: deflt,
    attrs: newAttributes
  }] : void 0;
  const deletedTr = selection instanceof TextSelection && !selection.empty ? EditorState.create({
    doc: tr.doc,
    selection
  }).tr.deleteSelection() : null;
  const splitDoc = deletedTr ? deletedTr.doc : tr.doc;
  const splitPos = deletedTr ? deletedTr.mapping.map($from.pos) : $from.pos;
  let can = canSplit(splitDoc, splitPos, 1, types);
  if (!types && !can && canSplit(splitDoc, splitPos, 1, deflt ? [{ type: deflt }] : void 0)) {
    can = true;
    types = deflt ? [{
      type: deflt,
      attrs: newAttributes
    }] : void 0;
  }
  if (dispatch) {
    if (can) {
      const mapFrom = tr.steps.length;
      if (selection instanceof TextSelection) tr.deleteSelection();
      tr.split(tr.mapping.slice(mapFrom).map($from.pos), 1, types);
      if (deflt && !atEnd && !$from.parentOffset && $from.parent.type !== deflt) {
        const first2 = tr.mapping.slice(mapFrom).map($from.before());
        const $first = tr.doc.resolve(first2);
        if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, deflt)) tr.setNodeMarkup(tr.mapping.slice(mapFrom).map($from.before()), deflt);
      }
    }
    if (keepMarks) ensureMarks(state, editor.extensionManager.splittableMarks);
    tr.scrollIntoView();
  }
  return can;
};
var splitListItem2 = (typeOrName, overrideAttrs = {}) => ({ tr, state, dispatch, editor }) => {
  const type = getNodeType(typeOrName, state.schema);
  const { $from, $to } = state.selection;
  const node = state.selection.node;
  if (node && node.isBlock || $from.depth < 2 || !$from.sameParent($to)) return false;
  const grandParent = $from.node(-1);
  if (grandParent.type !== type) return false;
  const extensionAttributes = editor.extensionManager.attributes;
  if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
    if ($from.depth === 2 || $from.node(-3).type !== type || $from.index(-2) !== $from.node(-2).childCount - 1) return false;
    if (dispatch) {
      var _type$contentMatch$de;
      let wrap = Fragment.empty;
      const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;
      for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d -= 1) wrap = Fragment.from($from.node(d).copy(wrap));
      const depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;
      const newNextTypeAttributes2 = {
        ...getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs),
        ...overrideAttrs
      };
      const nextType2 = ((_type$contentMatch$de = type.contentMatch.defaultType) === null || _type$contentMatch$de === void 0 ? void 0 : _type$contentMatch$de.createAndFill(newNextTypeAttributes2)) || void 0;
      wrap = wrap.append(Fragment.from(type.createAndFill(null, nextType2) || void 0));
      const start = $from.before($from.depth - (depthBefore - 1));
      tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));
      let sel = -1;
      tr.doc.nodesBetween(start, tr.doc.content.size, (n, pos) => {
        if (sel > -1) return false;
        if (n.isTextblock && n.content.size === 0) sel = pos + 1;
      });
      if (sel > -1) tr.setSelection(TextSelection.near(tr.doc.resolve(sel)));
      tr.scrollIntoView();
    }
    return true;
  }
  const nextType = $to.pos === $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
  const newTypeAttributes = {
    ...getSplittedAttributes(extensionAttributes, grandParent.type.name, grandParent.attrs),
    ...overrideAttrs
  };
  const newNextTypeAttributes = {
    ...getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs),
    ...overrideAttrs
  };
  const splitsAtStartOfItem = $from.parentOffset === 0 && $from.index(-1) === 0;
  const itemStart = $from.before(-1);
  tr.delete($from.pos, $to.pos);
  const trailingTypeAttributes = splitsAtStartOfItem ? grandParent.attrs : newTypeAttributes;
  const types = nextType ? [{
    type,
    attrs: trailingTypeAttributes
  }, {
    type: nextType,
    attrs: newNextTypeAttributes
  }] : [{
    type,
    attrs: trailingTypeAttributes
  }];
  if (!canSplit(tr.doc, $from.pos, 2)) return false;
  if (dispatch) {
    const { selection, storedMarks } = state;
    const { splittableMarks } = editor.extensionManager;
    const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
    tr.split($from.pos, 2, types).scrollIntoView();
    if (splitsAtStartOfItem) tr.setNodeMarkup(itemStart, void 0, newTypeAttributes);
    if (!marks || !dispatch) return true;
    const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
    tr.ensureMarks(filteredMarks);
  }
  return true;
};
function createNode(type, content, attrs) {
  if (!type.validContent(content)) return null;
  try {
    return type.create(attrs, content);
  } catch {
    return null;
  }
}
function flushPendingContent(state, itemType) {
  if (state.pendingContent.length === 0) return true;
  const item = createNode(itemType, Fragment.from(state.pendingContent));
  if (!item) return false;
  state.items.push(item);
  state.pendingContent = [];
  return true;
}
function appendContentNode(node, state, itemType) {
  if (itemType.validContent(Fragment.from([...state.pendingContent, node]))) {
    state.pendingContent.push(node);
    return true;
  }
  if (!flushPendingContent(state, itemType) || !itemType.validContent(Fragment.from(node))) return false;
  state.pendingContent.push(node);
  return true;
}
function appendNestedList(sourceList, state, context, convertListItems2) {
  const nestedItems = convertListItems2(sourceList, context);
  if (!nestedItems) return false;
  const nestedList = createNode(context.listType, Fragment.from(nestedItems), sourceList.attrs);
  if (!nestedList) return false;
  if (context.itemType.validContent(Fragment.from([...state.pendingContent, nestedList]))) {
    state.pendingContent.push(nestedList);
    return true;
  }
  if (!flushPendingContent(state, context.itemType)) return false;
  state.items.push(...nestedItems);
  return true;
}
function convertListItem(sourceItem, context, convertListItems2) {
  const state = {
    items: [],
    pendingContent: []
  };
  for (let index = 0; index < sourceItem.childCount; index += 1) {
    const child = sourceItem.child(index);
    if (!(context.isListNode(child) ? appendNestedList(child, state, context, convertListItems2) : appendContentNode(child, state, context.itemType))) return null;
  }
  return flushPendingContent(state, context.itemType) ? state.items : null;
}
function convertListItems(sourceList, context) {
  const convertedItems = [];
  for (let index = 0; index < sourceList.childCount; index += 1) {
    const items = convertListItem(sourceList.child(index), context, convertListItems);
    if (!items) return null;
    convertedItems.push(...items);
  }
  return convertedItems;
}
function findNodePosition(root, target) {
  let targetPos = null;
  root.descendants((node, pos) => {
    if (node !== target) return true;
    targetPos = pos;
    return false;
  });
  return targetPos;
}
function normalizeListType(type) {
  return !type || type === "1" ? null : type;
}
function areListTypesCompatible(typeA, typeB) {
  return normalizeListType(typeA) === normalizeListType(typeB);
}
var joinListBackwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;
  const before = tr.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);
  if (before === void 0) return true;
  const nodeBefore = tr.doc.nodeAt(before);
  if (!(list.node.type === (nodeBefore === null || nodeBefore === void 0 ? void 0 : nodeBefore.type) && canJoin(tr.doc, list.pos))) return true;
  if (!areListTypesCompatible(list.node.attrs.type, nodeBefore === null || nodeBefore === void 0 ? void 0 : nodeBefore.attrs.type)) return true;
  tr.join(list.pos);
  return true;
};
var joinListForwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;
  const after = tr.doc.resolve(list.start).after(list.depth);
  if (after === void 0) return true;
  const nodeAfter = tr.doc.nodeAt(after);
  if (!(list.node.type === (nodeAfter === null || nodeAfter === void 0 ? void 0 : nodeAfter.type) && canJoin(tr.doc, after))) return true;
  if (!areListTypesCompatible(list.node.attrs.type, nodeAfter === null || nodeAfter === void 0 ? void 0 : nodeAfter.attrs.type)) return true;
  tr.join(after);
  return true;
};
function createInnerSelectionForWholeDocList(tr) {
  const doc2 = tr.doc;
  const list = doc2.firstChild;
  if (!list) return null;
  const $start = doc2.resolve(1);
  const $end = doc2.resolve(list.nodeSize - 1);
  return TextSelection.between($start, $end);
}
var toggleList = (listTypeOrName, itemTypeOrName, keepMarks, attributes = {}) => ({ editor, tr, state, dispatch, chain, commands, can }) => {
  const { extensions, splittableMarks } = editor.extensionManager;
  const listType = getNodeType(listTypeOrName, state.schema);
  const itemType = getNodeType(itemTypeOrName, state.schema);
  const { selection, storedMarks } = state;
  const { $from, $to } = selection;
  const range = $from.blockRange($to);
  const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
  if (!range) return false;
  const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection);
  const isAllSelection = selection.from === 0 && selection.to === state.doc.content.size;
  const topLevelNodes = state.doc.content.content;
  const soleTopLevelNode = topLevelNodes.length === 1 ? topLevelNodes[0] : null;
  const allSelectionList = isAllSelection && soleTopLevelNode && isList(soleTopLevelNode.type.name, extensions) ? {
    node: soleTopLevelNode,
    pos: 0,
    depth: 0
  } : null;
  const currentList = parentList !== null && parentList !== void 0 ? parentList : allSelectionList;
  const isInsideExistingList = !!parentList && range.depth >= 1 && range.depth - parentList.depth <= 1;
  const hasWholeDocSelectedList = !!allSelectionList;
  if ((isInsideExistingList || hasWholeDocSelectedList) && currentList) {
    if (currentList.node.type === listType) {
      if (isAllSelection && hasWholeDocSelectedList) return chain().command(({ tr: trx, dispatch: disp }) => {
        const nextSelection = createInnerSelectionForWholeDocList(trx);
        if (!nextSelection) return false;
        trx.setSelection(nextSelection);
        if (disp) disp(trx);
        return true;
      }).liftListItem(itemType).run();
      return commands.liftListItem(itemType);
    }
    if (isList(currentList.node.type.name, extensions) && listType.validContent(currentList.node.content)) return chain().command(() => {
      tr.setNodeMarkup(currentList.pos, listType);
      return true;
    }).command(() => joinListBackwards(tr, listType)).command(() => joinListForwards(tr, listType)).run();
    if (isList(currentList.node.type.name, extensions)) {
      var _currentList$node$fir;
      const currentItemType = (_currentList$node$fir = currentList.node.firstChild) === null || _currentList$node$fir === void 0 ? void 0 : _currentList$node$fir.type;
      if (currentItemType && currentItemType !== itemType) {
        const convertedItems = convertListItems(currentList.node, {
          listType,
          itemType,
          isListNode: (node) => isList(node.type.name, extensions)
        });
        const convertedContent = convertedItems ? Fragment.from(convertedItems) : null;
        if (!convertedContent || !listType.validContent(convertedContent)) return false;
        return chain().command(() => {
          const { $anchor, $head } = tr.selection;
          const anchorParent = $anchor.parent;
          const headParent = $head.parent;
          const anchorOffset = $anchor.parentOffset;
          const headOffset = $head.parentOffset;
          let newList;
          try {
            newList = listType.create(attributes, convertedContent);
          } catch {
            return false;
          }
          tr.replaceWith(currentList.pos, currentList.pos + currentList.node.nodeSize, newList);
          if (anchorParent.inlineContent && headParent.inlineContent) {
            const anchorParentPos = findNodePosition(newList, anchorParent);
            const headParentPos = findNodePosition(newList, headParent);
            if (anchorParentPos !== null && headParentPos !== null) {
              const anchor = currentList.pos + anchorParentPos + 2 + anchorOffset;
              const head = currentList.pos + headParentPos + 2 + headOffset;
              tr.setSelection(TextSelection.create(tr.doc, anchor, head));
            }
          }
          return true;
        }).command(() => joinListBackwards(tr, listType)).command(() => joinListForwards(tr, listType)).run();
      }
    }
  }
  if (!keepMarks || !marks || !dispatch) return chain().command(() => {
    if (can().wrapInList(listType, attributes)) return true;
    return commands.clearNodes();
  }).wrapInList(listType, attributes).command(() => joinListBackwards(tr, listType)).command(() => joinListForwards(tr, listType)).run();
  return chain().command(() => {
    const canWrapInList = can().wrapInList(listType, attributes);
    const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
    tr.ensureMarks(filteredMarks);
    if (canWrapInList) return true;
    return commands.clearNodes();
  }).wrapInList(listType, attributes).command(() => joinListBackwards(tr, listType)).command(() => joinListForwards(tr, listType)).run();
};
var toggleMark = (typeOrName, attributes = {}, options = {}) => ({ state, commands }) => {
  const { extendEmptyMarkRange = false } = options;
  const type = getMarkType(typeOrName, state.schema);
  if (isMarkActive(state, type, attributes)) return commands.unsetMark(type, { extendEmptyMarkRange });
  return commands.setMark(type, attributes);
};
var toggleNode = (typeOrName, toggleTypeOrName, attributes = {}) => ({ state, commands }) => {
  const type = getNodeType(typeOrName, state.schema);
  const toggleType = getNodeType(toggleTypeOrName, state.schema);
  const isActive2 = isNodeActive(state, type, attributes);
  let attributesToCopy;
  if (state.selection.$anchor.sameParent(state.selection.$head)) attributesToCopy = state.selection.$anchor.parent.attrs;
  if (isActive2) return commands.setNode(toggleType, attributesToCopy);
  return commands.setNode(type, {
    ...attributesToCopy,
    ...attributes
  });
};
var toggleWrap = (typeOrName, attributes = {}) => ({ state, commands }) => {
  const type = getNodeType(typeOrName, state.schema);
  if (isNodeActive(state, type, attributes)) return commands.lift(type);
  return commands.wrapIn(type, attributes);
};
var undoInputRule = () => ({ state, dispatch }) => {
  const plugins = state.plugins;
  for (let i = 0; i < plugins.length; i += 1) {
    const plugin = plugins[i];
    let undoable;
    if (plugin.spec.isInputRules && (undoable = plugin.getState(state))) {
      if (dispatch) {
        const tr = state.tr;
        const toUndo = undoable.transform;
        for (let j = toUndo.steps.length - 1; j >= 0; j -= 1) tr.step(toUndo.steps[j].invert(toUndo.docs[j]));
        if (undoable.text) {
          const marks = tr.doc.resolve(undoable.from).marks();
          tr.replaceWith(undoable.from, undoable.to, state.schema.text(undoable.text, marks));
        } else tr.delete(undoable.from, undoable.to);
      }
      return true;
    }
  }
  return false;
};
var unsetAllMarks = (options = {}) => ({ tr, dispatch, editor }) => {
  const { ignoreClearable = false } = options;
  const { selection } = tr;
  const { empty: empty2, ranges } = selection;
  if (empty2) return true;
  const { nonClearableMarks } = editor.extensionManager;
  if (dispatch) {
    const clearableMarkTypes = Object.values(editor.schema.marks).filter((markType) => ignoreClearable || !nonClearableMarks.includes(markType.name));
    ranges.forEach((range) => {
      for (const markType of clearableMarkTypes) tr.removeMark(range.$from.pos, range.$to.pos, markType);
    });
  }
  return true;
};
var unsetMark = (typeOrName, options = {}) => ({ tr, state, dispatch }) => {
  const { extendEmptyMarkRange = false } = options;
  const { selection } = tr;
  const type = getMarkType(typeOrName, state.schema);
  const { $from, empty: empty2, ranges } = selection;
  if (!dispatch) return true;
  if (empty2 && extendEmptyMarkRange) {
    var _$from$marks$find;
    let { from: from2, to } = selection;
    const range = getMarkRange($from, type, (_$from$marks$find = $from.marks().find((mark) => mark.type === type)) === null || _$from$marks$find === void 0 ? void 0 : _$from$marks$find.attrs);
    if (range) {
      from2 = range.from;
      to = range.to;
    }
    tr.removeMark(from2, to, type);
  } else ranges.forEach((range) => {
    tr.removeMark(range.$from.pos, range.$to.pos, type);
  });
  tr.removeStoredMark(type);
  return true;
};
var unsetTextDirection = (position) => ({ tr, state, dispatch }) => {
  const { selection } = state;
  let from2;
  let to;
  if (typeof position === "number") {
    from2 = position;
    to = position;
  } else if (position && "from" in position && "to" in position) {
    from2 = position.from;
    to = position.to;
  } else {
    from2 = selection.from;
    to = selection.to;
  }
  if (dispatch) tr.doc.nodesBetween(from2, to, (node, pos) => {
    if (node.isText) return;
    const newAttrs = { ...node.attrs };
    delete newAttrs.dir;
    tr.setNodeMarkup(pos, void 0, newAttrs);
  });
  return true;
};
var updateAttributes = (typeOrName, attributes = {}) => ({ tr, state, dispatch }) => {
  let nodeType = null;
  let markType = null;
  const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
  if (!schemaType) return false;
  if (schemaType === "node") nodeType = getNodeType(typeOrName, state.schema);
  if (schemaType === "mark") markType = getMarkType(typeOrName, state.schema);
  let canUpdate = false;
  tr.selection.ranges.forEach((range) => {
    const from2 = range.$from.pos;
    const to = range.$to.pos;
    let lastPos;
    let lastNode;
    let trimmedFrom;
    let trimmedTo;
    if (tr.selection.empty) state.doc.nodesBetween(from2, to, (node, pos) => {
      if (nodeType && nodeType === node.type) {
        canUpdate = true;
        trimmedFrom = Math.max(pos, from2);
        trimmedTo = Math.min(pos + node.nodeSize, to);
        lastPos = pos;
        lastNode = node;
      }
    });
    else state.doc.nodesBetween(from2, to, (node, pos) => {
      if (pos < from2 && nodeType && nodeType === node.type) {
        canUpdate = true;
        trimmedFrom = Math.max(pos, from2);
        trimmedTo = Math.min(pos + node.nodeSize, to);
        lastPos = pos;
        lastNode = node;
      }
      if (pos >= from2 && pos <= to) {
        if (nodeType && nodeType === node.type) {
          canUpdate = true;
          if (dispatch) tr.setNodeMarkup(pos, void 0, {
            ...node.attrs,
            ...attributes
          });
        }
        if (markType && node.marks.length) node.marks.forEach((mark) => {
          if (markType === mark.type) {
            canUpdate = true;
            if (dispatch) {
              const trimmedFrom2 = Math.max(pos, from2);
              const trimmedTo2 = Math.min(pos + node.nodeSize, to);
              tr.addMark(trimmedFrom2, trimmedTo2, markType.create({
                ...mark.attrs,
                ...attributes
              }));
            }
          }
        });
      }
    });
    if (lastNode) {
      if (lastPos !== void 0 && dispatch) tr.setNodeMarkup(lastPos, void 0, {
        ...lastNode.attrs,
        ...attributes
      });
      if (markType && lastNode.marks.length) lastNode.marks.forEach((mark) => {
        if (markType === mark.type && dispatch) tr.addMark(trimmedFrom, trimmedTo, markType.create({
          ...mark.attrs,
          ...attributes
        }));
      });
    }
  });
  return canUpdate;
};
var DECORATION_MANAGER_PLUGIN_KEY = new PluginKey("__tiptap_decorations__");
var updateDecorations = (extensionName) => ({ tr, dispatch }) => {
  if (dispatch) tr.setMeta(DECORATION_MANAGER_PLUGIN_KEY, {
    type: "force",
    name: extensionName
  });
  return true;
};
var wrapIn$1 = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
  const type = getNodeType(typeOrName, state.schema);
  return wrapIn(type, attributes)(state, dispatch);
};
var wrapInList$1 = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
  const type = getNodeType(typeOrName, state.schema);
  return wrapInList(type, attributes)(state, dispatch);
};
var commands_exports = /* @__PURE__ */ __exportAll({
  blur: () => blur,
  clearContent: () => clearContent,
  clearNodes: () => clearNodes,
  command: () => command,
  createParagraphNear: () => createParagraphNear$1,
  cut: () => cut,
  deleteCurrentNode: () => deleteCurrentNode,
  deleteNode: () => deleteNode,
  deleteRange: () => deleteRange,
  deleteSelection: () => deleteSelection2,
  enter: () => enter,
  exitCode: () => exitCode$1,
  extendMarkRange: () => extendMarkRange,
  first: () => first,
  focus: () => focus,
  forEach: () => forEach2,
  insertContent: () => insertContent,
  insertContentAt: () => insertContentAt,
  insertDefaultBlock: () => insertDefaultBlock,
  joinBackward: () => joinBackward$1,
  joinDown: () => joinDown$1,
  joinForward: () => joinForward$1,
  joinItemBackward: () => joinItemBackward,
  joinItemForward: () => joinItemForward,
  joinTextblockBackward: () => joinTextblockBackward$1,
  joinTextblockForward: () => joinTextblockForward$1,
  joinUp: () => joinUp$1,
  keyboardShortcut: () => keyboardShortcut,
  lift: () => lift$1,
  liftEmptyBlock: () => liftEmptyBlock$1,
  liftListItem: () => liftListItem$1,
  newlineInCode: () => newlineInCode$1,
  resetAttributes: () => resetAttributes,
  scrollIntoView: () => scrollIntoView,
  selectAll: () => selectAll2,
  selectNodeBackward: () => selectNodeBackward$1,
  selectNodeForward: () => selectNodeForward$1,
  selectParentNode: () => selectParentNode$1,
  selectTextblockEnd: () => selectTextblockEnd$1,
  selectTextblockStart: () => selectTextblockStart$1,
  setContent: () => setContent,
  setMark: () => setMark,
  setMeta: () => setMeta,
  setNode: () => setNode,
  setNodeSelection: () => setNodeSelection,
  setTextDirection: () => setTextDirection,
  setTextSelection: () => setTextSelection,
  sinkListItem: () => sinkListItem$1,
  splitBlock: () => splitBlock2,
  splitListItem: () => splitListItem2,
  toggleList: () => toggleList,
  toggleMark: () => toggleMark,
  toggleNode: () => toggleNode,
  toggleWrap: () => toggleWrap,
  undoInputRule: () => undoInputRule,
  unsetAllMarks: () => unsetAllMarks,
  unsetMark: () => unsetMark,
  unsetTextDirection: () => unsetTextDirection,
  updateAttributes: () => updateAttributes,
  updateDecorations: () => updateDecorations,
  wrapIn: () => wrapIn$1,
  wrapInList: () => wrapInList$1
});
var depthByEditor = /* @__PURE__ */ new WeakMap();
function runInDecorationApplyScope(editor, callback) {
  var _depthByEditor$get;
  depthByEditor.set(editor, ((_depthByEditor$get = depthByEditor.get(editor)) !== null && _depthByEditor$get !== void 0 ? _depthByEditor$get : 0) + 1);
  try {
    return callback();
  } finally {
    var _depthByEditor$get2;
    const remaining = ((_depthByEditor$get2 = depthByEditor.get(editor)) !== null && _depthByEditor$get2 !== void 0 ? _depthByEditor$get2 : 1) - 1;
    if (remaining > 0) depthByEditor.set(editor, remaining);
    else depthByEditor.delete(editor);
  }
}
function isInDecorationApplyScope(editor) {
  return depthByEditor.has(editor);
}
var EventEmitter = class {
  constructor() {
    this.callbacks = {};
  }
  on(event, fn) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(fn);
    return this;
  }
  emit(event, ...args) {
    const callbacks = this.callbacks[event];
    if (callbacks) callbacks.forEach((callback) => callback.apply(this, args));
    return this;
  }
  off(event, fn) {
    const callbacks = this.callbacks[event];
    if (callbacks) {
      if (fn) this.callbacks[event] = callbacks.filter((callback) => callback !== fn);
      else delete this.callbacks[event];
    }
    return this;
  }
  once(event, fn) {
    const onceFn = (...args) => {
      this.off(event, onceFn);
      fn.apply(this, args);
    };
    return this.on(event, onceFn);
  }
  removeAllListeners() {
    this.callbacks = {};
  }
};
var isDev = typeof process !== "undefined" && true;
function isWidgetDecoration(decoration) {
  return decoration.kind === "widget";
}
function decorationsToPMDecorations(decorations, extensionName) {
  const pmDecorations = [];
  const widgetKeys = /* @__PURE__ */ new Set();
  for (const decoration of decorations) {
    if (decoration.kind === "widget") {
      if (isWidgetDecoration(decoration)) widgetKeys.add(decoration.key);
    }
    pmDecorations.push(decoration.toPMDecoration(extensionName));
  }
  return {
    decorations: pmDecorations,
    widgetKeys
  };
}
function buildDecorationSet(doc2, decorations, extensionName) {
  const { decorations: pmDecorations, widgetKeys } = decorationsToPMDecorations(decorations, extensionName);
  return {
    set: DecorationSet.create(doc2, pmDecorations),
    widgetKeys
  };
}
function rangeOwnsPosition({ position, from: from2, to, docSize }) {
  if (position < from2) return false;
  if (position < to) return true;
  return position === to && to === docSize;
}
function filterOutOfRangeDecorations({ decorations, from: from2, to, docSize, extensionName, warnedExtensions }) {
  return decorations.filter((decoration) => {
    if (rangeOwnsPosition({
      position: decoration.anchor,
      from: from2,
      to,
      docSize
    })) return true;
    if (decoration.anchor === to) return false;
    if (!warnedExtensions.has(extensionName)) {
      warnedExtensions.add(extensionName);
      console.warn(`[tiptap warn]: Extension "${extensionName}" returned a decoration outside the requested range [${from2}, ${to}). It was ignored.`);
    }
    return false;
  });
}
function widgetKeyOf(decoration) {
  var _decoration$spec;
  const key = (_decoration$spec = decoration.spec) === null || _decoration$spec === void 0 ? void 0 : _decoration$spec.key;
  return typeof key === "string" ? key : void 0;
}
function findDuplicateWidgetKeys(decorationSet) {
  const extensionsByKey = /* @__PURE__ */ new Map();
  const counts = /* @__PURE__ */ new Map();
  for (const decoration of decorationSet.find()) {
    var _extensionName, _extensionsByKey$get, _counts$get;
    const key = widgetKeyOf(decoration);
    if (!key) continue;
    const extension = (_extensionName = decoration.spec.extensionName) !== null && _extensionName !== void 0 ? _extensionName : "unknown";
    const extensions = (_extensionsByKey$get = extensionsByKey.get(key)) !== null && _extensionsByKey$get !== void 0 ? _extensionsByKey$get : /* @__PURE__ */ new Set();
    extensions.add(extension);
    extensionsByKey.set(key, extensions);
    counts.set(key, ((_counts$get = counts.get(key)) !== null && _counts$get !== void 0 ? _counts$get : 0) + 1);
  }
  return Array.from(extensionsByKey, ([key, extensions]) => ({
    key,
    extensions
  })).filter(({ key }) => {
    var _counts$get2;
    return ((_counts$get2 = counts.get(key)) !== null && _counts$get2 !== void 0 ? _counts$get2 : 0) > 1;
  });
}
function isAttrStep(step) {
  return step.jsonID === "attr";
}
function hasResolvableChangedRange(step) {
  let hasMappedRange = false;
  step.getMap().forEach(() => {
    hasMappedRange = true;
  });
  if (hasMappedRange || isAttrStep(step)) return true;
  const positionalStep = step;
  return typeof positionalStep.from === "number" && typeof positionalStep.to === "number";
}
function blockRangeFor(doc2, changed) {
  let from2 = null;
  let to = 0;
  let nodeStart = 0;
  for (let index = 0; index < doc2.childCount; index += 1) {
    if (nodeStart > changed.to) break;
    const nodeEnd = nodeStart + doc2.child(index).nodeSize;
    if (nodeEnd >= changed.from) {
      if (from2 === null) from2 = nodeStart;
      to = nodeEnd;
    }
    nodeStart = nodeEnd;
  }
  return from2 === null ? null : {
    from: from2,
    to
  };
}
function getRebuildRanges(tr, doc2) {
  if (tr.steps.some((step) => !hasResolvableChangedRange(step))) return { type: "full" };
  const newRanges = getChangedRanges(tr).map(({ newRange }) => newRange);
  tr.steps.forEach((step, index) => {
    if (!isAttrStep(step)) return;
    const mapping = tr.mapping.slice(index);
    newRanges.push({
      from: mapping.map(step.pos, -1),
      to: mapping.map(step.pos + 1)
    });
  });
  const ranges = [];
  for (const newRange of newRanges) {
    const blockRange = blockRangeFor(doc2, newRange);
    if (blockRange) ranges.push(blockRange);
  }
  ranges.sort((a, b) => a.from - b.from);
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
    else merged.push({ ...range });
  }
  return {
    type: "ranges",
    ranges: merged
  };
}
function mapDecorationSet(set, mapping, doc2, widgetKeys) {
  return set.map(mapping, doc2, { onRemove: (removedSpec) => {
    const key = removedSpec === null || removedSpec === void 0 ? void 0 : removedSpec.key;
    if (typeof key === "string") widgetKeys.delete(key);
  } });
}
function mapDecorations(name, previous, tr) {
  var _previous$decorationS, _previous$widgetKeysB;
  const previousSet = (_previous$decorationS = previous.decorationSetsByExtension[name]) !== null && _previous$decorationS !== void 0 ? _previous$decorationS : DecorationSet.empty;
  const widgetKeys = new Set((_previous$widgetKeysB = previous.widgetKeysByExtension[name]) !== null && _previous$widgetKeysB !== void 0 ? _previous$widgetKeysB : []);
  return {
    set: mapDecorationSet(previousSet, tr.mapping, tr.doc, widgetKeys),
    widgetKeys
  };
}
function mergeDecorationSets(doc2, decorationSetsByExtension) {
  const allDecorations = Object.values(decorationSetsByExtension).flatMap((set) => set.find());
  return DecorationSet.create(doc2, allDecorations);
}
function unionWidgetKeys(widgetKeysByExtension) {
  const merged = /* @__PURE__ */ new Set();
  for (const keys3 of Object.values(widgetKeysByExtension)) for (const key of keys3) merged.add(key);
  return merged;
}
function validateDecorationSpec(name, spec) {
  var _update;
  switch ((_update = spec.update) !== null && _update !== void 0 ? _update : "document") {
    case "document":
      if (spec.createInRange) throw new Error(`[tiptap error]: Extension "${name}" provides createInRange() but does not use the "changedRanges" decoration update strategy.`);
      return;
    case "changedRanges":
      if (!spec.createInRange) throw new Error(`[tiptap error]: Extension "${name}" uses the "changedRanges" decoration update strategy but does not provide createInRange().`);
      return;
    case "manual":
      if (spec.createInRange) throw new Error(`[tiptap error]: Extension "${name}" uses the "manual" decoration update strategy, which is not compatible with createInRange(). createInRange() requires the "changedRanges" strategy.`);
      if (spec.shouldUpdate) throw new Error(`[tiptap error]: Extension "${name}" cannot combine the "manual" decoration update strategy with shouldUpdate().`);
      return;
    default:
      throw new Error(`[tiptap error]: Extension "${name}" uses an unknown decoration update strategy. Expected "document", "changedRanges", or "manual".`);
  }
}
function shouldRecomputeDecoration(spec, props, forced) {
  if (forced) return true;
  if (spec.update === "manual") return false;
  return spec.shouldUpdate ? spec.shouldUpdate(props) : props.tr.docChanged;
}
var EMPTY_KEYS = /* @__PURE__ */ new Set();
var DecorationManager = class {
  constructor(options) {
    this.warnedWidgetKeys = /* @__PURE__ */ new Set();
    this.warnedOutOfRangeExtensions = /* @__PURE__ */ new Set();
    this.handleBeforeTransaction = ({ nextState }) => {
      const state = DECORATION_MANAGER_PLUGIN_KEY.getState(nextState);
      if (state) this.warnDuplicateWidgetKeys(state);
    };
    this.editor = options.editor;
    this.entries = this.resolveEntries(options.entries);
    this.entries.forEach(({ name, spec }) => validateDecorationSpec(name, spec));
    this.plugin = this.entries.length > 0 ? this.createPlugin() : null;
    this.editor.on("beforeTransaction", this.handleBeforeTransaction);
  }
  destroy() {
    this.editor.off("beforeTransaction", this.handleBeforeTransaction);
  }
  /**
  * Returns the set of live widget keys from all decoration extensions.
  * @returns A readonly set of widget keys
  */
  liveWidgetKeys() {
    var _DECORATION_MANAGER_P, _DECORATION_MANAGER_P2;
    return (_DECORATION_MANAGER_P = (_DECORATION_MANAGER_P2 = DECORATION_MANAGER_PLUGIN_KEY.getState(this.editor.state)) === null || _DECORATION_MANAGER_P2 === void 0 ? void 0 : _DECORATION_MANAGER_P2.widgetKeys) !== null && _DECORATION_MANAGER_P !== void 0 ? _DECORATION_MANAGER_P : EMPTY_KEYS;
  }
  /**
  * The mounted editor view, or `null` when destroyed. Decoration callbacks
  * must never receive the placeholder view `editor.view` falls back to.
  * @returns The mounted editor view, or `null`
  */
  get mountedView() {
    return this.editor.isDestroyed ? null : this.editor.view;
  }
  /**
  * Resolves decoration entries by calling the addDecorations function for each extension entry.
  * @param entries The decoration manager entries to resolve
  * @returns An array of resolved decoration entries
  */
  resolveEntries(entries) {
    const resolved = [];
    for (const { name, addDecorations } of entries) {
      const spec = addDecorations();
      if (spec) resolved.push({
        name,
        spec
      });
    }
    return resolved;
  }
  /**
  * Creates the ProseMirror plugin for managing decorations.
  * @returns A ProseMirror plugin with state management
  */
  createPlugin() {
    const { editor, entries } = this;
    return new Plugin({
      key: DECORATION_MANAGER_PLUGIN_KEY,
      state: {
        init: (_config, state) => {
          const decorationSetsByExtension = {};
          const widgetKeysByExtension = {};
          for (const { name, spec } of entries) {
            const { set, widgetKeys } = this.buildFullSet(name, spec, state);
            decorationSetsByExtension[name] = set;
            widgetKeysByExtension[name] = widgetKeys;
          }
          const managerState = {
            decorationSetsByExtension,
            widgetKeysByExtension,
            mergedDecorationSet: this.buildMergedSet(state.doc, decorationSetsByExtension),
            widgetKeys: unionWidgetKeys(widgetKeysByExtension)
          };
          this.warnDuplicateWidgetKeys(managerState);
          return managerState;
        },
        apply: (tr, previous, oldState, newState) => {
          const meta = tr.getMeta(DECORATION_MANAGER_PLUGIN_KEY);
          const forceAll = (meta === null || meta === void 0 ? void 0 : meta.type) === "force" && !meta.name;
          const forceName = (meta === null || meta === void 0 ? void 0 : meta.type) === "force" ? meta.name : void 0;
          const decorationSetsByExtension = {};
          const widgetKeysByExtension = {};
          const recomputedNames = /* @__PURE__ */ new Set();
          runInDecorationApplyScope(editor, () => {
            for (const { name, spec } of entries) {
              const forced = forceAll || forceName === name;
              if (!shouldRecomputeDecoration(spec, {
                editor,
                tr,
                oldState,
                newState
              }, forced)) {
                const result = mapDecorations(name, previous, tr);
                decorationSetsByExtension[name] = result.set;
                widgetKeysByExtension[name] = result.widgetKeys;
              } else if (spec.update === "changedRanges" && tr.docChanged && !forced) {
                const result = this.applyChangedRangesRecompute(name, spec, previous, tr, newState);
                decorationSetsByExtension[name] = result.set;
                widgetKeysByExtension[name] = result.widgetKeys;
                recomputedNames.add(name);
              } else {
                const { set, widgetKeys } = this.buildFullSet(name, spec, newState);
                decorationSetsByExtension[name] = set;
                widgetKeysByExtension[name] = widgetKeys;
                recomputedNames.add(name);
              }
            }
          });
          if (recomputedNames.size === 0 && !tr.docChanged) return previous;
          return {
            decorationSetsByExtension,
            widgetKeysByExtension,
            mergedDecorationSet: this.mergeAfterApply({
              entries,
              previous,
              tr,
              decorationSetsByExtension,
              recomputedNames
            }),
            widgetKeys: unionWidgetKeys(widgetKeysByExtension)
          };
        }
      },
      props: { decorations(state) {
        var _DECORATION_MANAGER_P3, _DECORATION_MANAGER_P4;
        return (_DECORATION_MANAGER_P3 = (_DECORATION_MANAGER_P4 = DECORATION_MANAGER_PLUGIN_KEY.getState(state)) === null || _DECORATION_MANAGER_P4 === void 0 ? void 0 : _DECORATION_MANAGER_P4.mergedDecorationSet) !== null && _DECORATION_MANAGER_P3 !== void 0 ? _DECORATION_MANAGER_P3 : DecorationSet.empty;
      } }
    });
  }
  /**
  * Applies changed ranges recomputation to a decoration set, dropping stale decorations and rebuilding only the touched blocks.
  * @param name The name of the decoration extension
  * @param spec The decoration spec
  * @param previous The previous decoration manager state
  * @param tr The transaction to apply
  * @param newState The new editor state
  * @returns The updated decoration set and widget keys
  */
  applyChangedRangesRecompute(name, spec, previous, tr, newState) {
    const resolution = getRebuildRanges(tr, newState.doc);
    if (resolution.type === "full") return this.buildFullSet(name, spec, newState);
    return this.rebuildRanges(name, spec, previous, tr, newState, resolution.ranges);
  }
  /**
  * Rebuilds decorations for the changed block ranges: maps the previous set
  * forward, then for each range removes stale decorations, calls
  * `createInRange`, and adds the new ones while syncing widget keys.
  * @param name The extension name.
  * @param spec The decoration spec.
  * @param previous The previous decoration manager state.
  * @param tr The transaction to apply.
  * @param newState The new editor state.
  * @param ranges The block ranges to rebuild.
  * @returns The updated decoration set and widget keys.
  */
  rebuildRanges(name, spec, previous, tr, newState, ranges) {
    var _previous$decorationS, _previous$widgetKeysB;
    const previousSet = (_previous$decorationS = previous.decorationSetsByExtension[name]) !== null && _previous$decorationS !== void 0 ? _previous$decorationS : DecorationSet.empty;
    const widgetKeys = new Set((_previous$widgetKeysB = previous.widgetKeysByExtension[name]) !== null && _previous$widgetKeysB !== void 0 ? _previous$widgetKeysB : []);
    let set = mapDecorationSet(previousSet, tr.mapping, tr.doc, widgetKeys);
    const docSize = newState.doc.content.size;
    for (const { from: from2, to } of ranges) {
      const stale = set.find(from2, to).filter((decoration) => rangeOwnsPosition({
        position: decoration.from,
        from: from2,
        to,
        docSize
      }));
      for (const decoration of stale) {
        const key = widgetKeyOf(decoration);
        if (key) widgetKeys.delete(key);
      }
      set = set.remove(stale);
      const { decorations: pmDecorations, widgetKeys: addedKeys } = decorationsToPMDecorations(filterOutOfRangeDecorations({
        decorations: this.runCreate(name, "createInRange", () => spec.createInRange({
          editor: this.editor,
          state: newState,
          view: this.mountedView,
          from: from2,
          to
        })),
        from: from2,
        to,
        docSize,
        extensionName: name,
        warnedExtensions: this.warnedOutOfRangeExtensions
      }), name);
      set = set.add(newState.doc, pmDecorations);
      for (const key of addedKeys) widgetKeys.add(key);
    }
    return {
      set,
      widgetKeys
    };
  }
  /**
  * Builds a full decoration set for the entire document.
  * @param name The name of the decoration extension
  * @param spec The decoration spec
  * @param state The editor state
  * @returns The decoration set and widget keys
  */
  buildFullSet(name, spec, state) {
    const decorations = this.runCreate(name, "create", () => spec.create({
      editor: this.editor,
      state,
      view: this.mountedView
    }));
    return buildDecorationSet(state.doc, decorations, name);
  }
  /**
  * Runs a decoration callback and swallows anything it throws. These run inside
  * `state.apply`, where an uncaught error would abort the whole transaction.
  * @param name The extension name.
  * @param method The callback name, used in the error message.
  * @param create The callback to run.
  * @returns The decorations, or an empty array if the callback threw.
  */
  runCreate(name, method, create) {
    try {
      return create();
    } catch (error) {
      console.error(`[tiptap error]: Extension "${name}" threw in \`addDecorations().${method}()\`. Its decorations were dropped for this update.`, error);
      return [];
    }
  }
  warnDuplicateWidgetKeys(state) {
    if (!isDev) return;
    if (state.widgetKeys.size === 0) {
      this.warnedWidgetKeys.clear();
      return;
    }
    const duplicateKeys = findDuplicateWidgetKeys(state.mergedDecorationSet);
    const nextWarningKeys = new Set(duplicateKeys.map(({ key }) => key));
    for (const { key, extensions } of duplicateKeys) {
      if (this.warnedWidgetKeys.has(key)) continue;
      const names = Array.from(extensions).map((name) => `"${name}"`).join(", ");
      console.warn(`[tiptap warn]: Duplicate widget decoration key "${key}" in extension${extensions.size === 1 ? "" : "s"} ${names}. Widget decoration keys must be globally unique, otherwise ProseMirror misplaces the widget DOM. Use a stable, unique key (e.g. \`comment-\${id}\`).`);
    }
    this.warnedWidgetKeys = nextWarningKeys;
  }
  /**
  * Builds the merged DecorationSet during init. Skips the merge for a
  * single extension since its per-extension set is already correct.
  * @param doc The document to build the merged set for.
  * @param decorationSetsByExtension The per-extension decoration sets.
  * @returns The merged decoration set.
  */
  buildMergedSet(doc2, decorationSetsByExtension) {
    const names = Object.keys(decorationSetsByExtension);
    if (names.length === 1) return decorationSetsByExtension[names[0]];
    return mergeDecorationSets(doc2, decorationSetsByExtension);
  }
  /**
  * Computes the merged DecorationSet after apply. Single extension skips the
  * merge; nothing recomputed maps the previous merged set forward; otherwise
  * the merge is rebuilt from the per-extension sets.
  */
  mergeAfterApply({ entries, previous, tr, decorationSetsByExtension, recomputedNames }) {
    if (entries.length === 1) return decorationSetsByExtension[entries[0].name];
    if (recomputedNames.size === 0) return previous.mergedDecorationSet.map(tr.mapping, tr.doc);
    return mergeDecorationSets(tr.doc, decorationSetsByExtension);
  }
};
function createStyleTag(style2, nonce, suffix) {
  const tiptapStyleTag = document.querySelector(`style[data-tiptap-style${suffix ? `-${suffix}` : ""}]`);
  if (tiptapStyleTag !== null) return tiptapStyleTag;
  const styleNode = document.createElement("style");
  if (nonce) styleNode.setAttribute("nonce", nonce);
  styleNode.setAttribute(`data-tiptap-style${suffix ? `-${suffix}` : ""}`, "");
  styleNode.innerHTML = style2;
  document.getElementsByTagName("head")[0].appendChild(styleNode);
  return styleNode;
}
function isNumber(value) {
  return typeof value === "number";
}
function getType(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}
function isPlainObject(value) {
  if (getType(value) !== "Object") return false;
  return value.constructor === Object && Object.getPrototypeOf(value) === Object.prototype;
}
function mergeDeep(target, source) {
  const output = { ...target };
  if (isPlainObject(target) && isPlainObject(source)) Object.keys(source).forEach((key) => {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) output[key] = mergeDeep(target[key], source[key]);
    else output[key] = source[key];
  });
  return output;
}
function updateMarkViewAttributes(checkMark, editor, attrs = {}) {
  const { state } = editor;
  const { doc: doc2, tr } = state;
  const thisMark = checkMark;
  doc2.descendants((node, pos) => {
    const from2 = tr.mapping.map(pos);
    const to = tr.mapping.map(pos) + node.nodeSize;
    let foundMark = null;
    node.marks.forEach((mark) => {
      if (mark !== thisMark) return false;
      foundMark = mark;
    });
    if (!foundMark) return;
    let needsUpdate = false;
    Object.keys(attrs).forEach((k) => {
      if (attrs[k] !== foundMark.attrs[k]) needsUpdate = true;
    });
    if (needsUpdate) {
      const updatedMark = checkMark.type.create({
        ...checkMark.attrs,
        ...attrs
      });
      tr.removeMark(from2, to, checkMark.type);
      tr.addMark(from2, to, updatedMark);
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}
var inputRuleMatcherHandler = (text, find) => {
  if (isRegExp(find)) return find.exec(text);
  const inputRuleMatch = find(text);
  if (!inputRuleMatch) return null;
  const result = [inputRuleMatch.text];
  result.index = inputRuleMatch.index;
  result.input = text;
  result.data = inputRuleMatch.data;
  if (inputRuleMatch.replaceWith) {
    if (!inputRuleMatch.text.includes(inputRuleMatch.replaceWith)) console.warn('[tiptap warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".');
    result.push(inputRuleMatch.replaceWith);
  }
  return result;
};
function createRuleTransaction(config) {
  const { editor, from: from2, to, text, insertText } = config;
  if (!insertText) return {
    inputTransaction: null,
    tr: editor.view.state.tr
  };
  const inputTransaction = editor.view.state.tr.insertText(text, from2, to);
  return {
    inputTransaction,
    tr: EditorState.create({
      doc: inputTransaction.doc,
      selection: inputTransaction.selection,
      storedMarks: inputTransaction.storedMarks
    }).tr
  };
}
function applyRule(config) {
  const { editor, from: from2, to, text, rule, match, plugin, insertText } = config;
  const { view } = editor;
  const { inputTransaction, tr } = createRuleTransaction({
    editor,
    from: from2,
    to,
    text,
    insertText
  });
  const inputEnd = inputTransaction ? from2 + text.length : to;
  const state = createChainableState({
    state: view.state,
    transaction: tr
  });
  const range = {
    from: from2 - (match[0].length - text.length),
    to: inputEnd
  };
  const { commands, chain, can } = new CommandManager({
    editor,
    state
  });
  if (rule.handler({
    state,
    range,
    match,
    commands,
    chain,
    can
  }) === null || !tr.steps.length) return false;
  if (inputTransaction) {
    view.dispatch(inputTransaction);
    if (!view.state.doc.eq(inputTransaction.doc)) return true;
  }
  closeHistory(tr);
  tr.setMeta("inputRule", true);
  if (rule.undoable) tr.setMeta(plugin, {
    transform: tr,
    from: from2,
    to: inputEnd,
    text
  });
  view.dispatch(tr);
  return true;
}
function matchesDocument($from, match, text) {
  const matchedDocLength = match[0].length - text.length;
  if (matchedDocLength <= 0) return true;
  const matchStartOffset = $from.parentOffset - matchedDocLength;
  return matchStartOffset >= 0 && $from.parent.textBetween(matchStartOffset, $from.parentOffset) === match[0].slice(0, matchedDocLength);
}
function run$1(config) {
  var _ref;
  const { editor, from: from2, to, text, rules, plugin, insertText } = config;
  const { view } = editor;
  if (view.composing) return false;
  const $from = view.state.doc.resolve(from2);
  if ($from.parent.type.spec.code || !!((_ref = $from.nodeBefore || $from.nodeAfter) === null || _ref === void 0 ? void 0 : _ref.marks.find((mark) => mark.type.spec.code))) return false;
  const textBefore = getTextContentFromNodes($from) + text;
  for (const rule of rules) {
    const match = inputRuleMatcherHandler(textBefore, rule.find);
    if (!match || !matchesDocument($from, match, text)) continue;
    if (applyRule({
      editor,
      from: from2,
      to,
      text,
      rule,
      match,
      plugin,
      insertText
    })) return true;
  }
  return false;
}
function inputRulesPlugin(props) {
  const { editor, rules } = props;
  const plugin = new Plugin({
    state: {
      init() {
        return null;
      },
      apply(tr, prev, state) {
        const stored = tr.getMeta(plugin);
        if (stored) return stored;
        const simulatedInputMeta = tr.getMeta("applyInputRules");
        if (!!simulatedInputMeta) setTimeout(() => {
          let { text } = simulatedInputMeta;
          if (typeof text === "string") text = text;
          else text = getHTMLFromFragment(Fragment.from(text), state.schema);
          const { from: from2 } = simulatedInputMeta;
          const to = from2 + text.length;
          run$1({
            editor,
            from: from2,
            to,
            text,
            rules,
            plugin
          });
        });
        return tr.selectionSet || tr.docChanged ? null : prev;
      }
    },
    props: {
      handleTextInput(view, from2, to, text) {
        return run$1({
          editor,
          from: from2,
          to,
          text,
          rules,
          plugin,
          insertText: true
        });
      },
      handleDOMEvents: { compositionend: (view) => {
        setTimeout(() => {
          const { $cursor } = view.state.selection;
          if ($cursor) run$1({
            editor,
            from: $cursor.pos,
            to: $cursor.pos,
            text: "",
            rules,
            plugin
          });
        });
        return false;
      } },
      handleKeyDown(view, event) {
        if (event.key !== "Enter") return false;
        const { $cursor } = view.state.selection;
        if ($cursor) return run$1({
          editor,
          from: $cursor.pos,
          to: $cursor.pos,
          text: "\n",
          rules,
          plugin
        });
        return false;
      }
    },
    isInputRules: true
  });
  return plugin;
}
var Extendable = class {
  constructor(config = {}) {
    this.type = "extendable";
    this.parent = null;
    this.child = null;
    this.name = "";
    this.config = { name: this.name };
    this.config = {
      ...this.config,
      ...config
    };
    this.name = this.config.name;
  }
  get options() {
    return { ...callOrReturn(getExtensionField(this, "addOptions", { name: this.name })) };
  }
  get storage() {
    return { ...callOrReturn(getExtensionField(this, "addStorage", {
      name: this.name,
      options: this.options
    })) };
  }
  configure(options = {}) {
    const extension = this.extend({
      ...this.config,
      addOptions: () => {
        return mergeDeep(this.options, options);
      }
    });
    extension.name = this.name;
    extension.parent = this.parent;
    this.child = null;
    return extension;
  }
  extend(extendedConfig = {}) {
    const extension = new this.constructor({
      ...this.config,
      ...extendedConfig
    });
    extension.parent = this;
    this.child = extension;
    extension.name = "name" in extendedConfig ? extendedConfig.name : extension.parent.name;
    return extension;
  }
};
var Mark2 = class Mark3 extends Extendable {
  constructor(..._args) {
    super(..._args);
    this.type = "mark";
  }
  /**
  * Create a new Mark instance
  * @param config - Mark configuration object or a function that returns a configuration object
  */
  static create(config = {}) {
    const resolvedConfig = typeof config === "function" ? config() : config;
    return new Mark3(resolvedConfig);
  }
  static handleExit({ editor, mark }) {
    const { tr } = editor.state;
    const currentPos = editor.state.selection.$from;
    if (currentPos.pos === currentPos.end()) {
      const currentMarks = currentPos.marks();
      if (!!!currentMarks.find((m) => (m === null || m === void 0 ? void 0 : m.type.name) === mark.name)) return false;
      const removeMark = currentMarks.find((m) => (m === null || m === void 0 ? void 0 : m.type.name) === mark.name);
      if (removeMark) tr.removeStoredMark(removeMark);
      tr.insertText(" ", currentPos.pos);
      editor.view.dispatch(tr);
      return true;
    }
    return false;
  }
  configure(options) {
    return super.configure(options);
  }
  extend(extendedConfig) {
    const resolvedConfig = typeof extendedConfig === "function" ? extendedConfig() : extendedConfig;
    return super.extend(resolvedConfig);
  }
};
var pasteRuleMatcherHandler = (text, find, event) => {
  if (isRegExp(find)) return [...text.matchAll(find)];
  const matches = find(text, event);
  if (!matches) return [];
  return matches.map((pasteRuleMatch) => {
    const result = [pasteRuleMatch.text];
    result.index = pasteRuleMatch.index;
    result.input = text;
    result.data = pasteRuleMatch.data;
    if (pasteRuleMatch.replaceWith) {
      if (!pasteRuleMatch.text.includes(pasteRuleMatch.replaceWith)) console.warn('[tiptap warn]: "pasteRuleMatch.replaceWith" must be part of "pasteRuleMatch.text".');
      result.push(pasteRuleMatch.replaceWith);
    }
    return result;
  });
};
function run(config) {
  const { editor, state, from: from2, to, rule, pasteEvent, dropEvent } = config;
  const { commands, chain, can } = new CommandManager({
    editor,
    state
  });
  const handlers2 = [];
  state.doc.nodesBetween(from2, to, (node, pos) => {
    var _node$type, _ref, _node$content$size, _node$content;
    if (((_node$type = node.type) === null || _node$type === void 0 || (_node$type = _node$type.spec) === null || _node$type === void 0 ? void 0 : _node$type.code) || !(node.isText || node.isTextblock || node.isInline)) return;
    const contentSize = (_ref = (_node$content$size = (_node$content = node.content) === null || _node$content === void 0 ? void 0 : _node$content.size) !== null && _node$content$size !== void 0 ? _node$content$size : node.nodeSize) !== null && _ref !== void 0 ? _ref : 0;
    const resolvedFrom = Math.max(from2, pos);
    const resolvedTo = Math.min(to, pos + contentSize);
    if (resolvedFrom >= resolvedTo) return;
    const textToMatch = node.isText ? node.text || "" : node.textBetween(resolvedFrom - pos, resolvedTo - pos, void 0, "\uFFFC");
    pasteRuleMatcherHandler(textToMatch, rule.find, pasteEvent).forEach((match) => {
      if (match.index === void 0) return;
      const start = resolvedFrom + match.index + 1;
      const end = start + match[0].length;
      const range = {
        from: state.tr.mapping.map(start),
        to: state.tr.mapping.map(end)
      };
      const handler = rule.handler({
        state,
        range,
        match,
        commands,
        chain,
        can,
        pasteEvent,
        dropEvent
      });
      handlers2.push(handler);
    });
  });
  return handlers2.every((handler) => handler !== null);
}
var tiptapDragFromOtherEditor = null;
var createClipboardPasteEvent = (text) => {
  var _event$clipboardData;
  const event = new ClipboardEvent("paste", { clipboardData: new DataTransfer() });
  (_event$clipboardData = event.clipboardData) === null || _event$clipboardData === void 0 || _event$clipboardData.setData("text/html", text);
  return event;
};
function pasteRulesPlugin(props) {
  const { editor, rules } = props;
  let dragSourceElement = null;
  let isPastedFromProseMirror = false;
  let isDroppedFromProseMirror = false;
  let pasteEvent = typeof ClipboardEvent !== "undefined" ? new ClipboardEvent("paste") : null;
  let dropEvent;
  try {
    dropEvent = typeof DragEvent !== "undefined" ? new DragEvent("drop") : null;
  } catch {
    dropEvent = null;
  }
  const processEvent = ({ state, from: from2, to, rule, pasteEvt }) => {
    const tr = state.tr;
    const chainableState = createChainableState({
      state,
      transaction: tr
    });
    if (!run({
      editor,
      state: chainableState,
      from: Math.max(from2 - 1, 0),
      to: to.b - 1,
      rule,
      pasteEvent: pasteEvt,
      dropEvent
    }) || !tr.steps.length) return;
    try {
      dropEvent = typeof DragEvent !== "undefined" ? new DragEvent("drop") : null;
    } catch {
      dropEvent = null;
    }
    pasteEvent = typeof ClipboardEvent !== "undefined" ? new ClipboardEvent("paste") : null;
    return tr;
  };
  editor.on("destroy", () => {
    if (tiptapDragFromOtherEditor === editor) tiptapDragFromOtherEditor = null;
  });
  return rules.map((rule) => {
    return new Plugin({
      view(view) {
        const handleDragstart = (event) => {
          var _view$dom$parentEleme;
          dragSourceElement = ((_view$dom$parentEleme = view.dom.parentElement) === null || _view$dom$parentEleme === void 0 ? void 0 : _view$dom$parentEleme.contains(event.target)) ? view.dom.parentElement : null;
          if (dragSourceElement) tiptapDragFromOtherEditor = editor;
        };
        const handleDragend = () => {
          if (tiptapDragFromOtherEditor) tiptapDragFromOtherEditor = null;
        };
        window.addEventListener("dragstart", handleDragstart);
        window.addEventListener("dragend", handleDragend);
        return { destroy() {
          window.removeEventListener("dragstart", handleDragstart);
          window.removeEventListener("dragend", handleDragend);
        } };
      },
      props: { handleDOMEvents: {
        drop: (view, event) => {
          isDroppedFromProseMirror = dragSourceElement === view.dom.parentElement;
          dropEvent = event;
          if (!isDroppedFromProseMirror) {
            const dragFromOtherEditor = tiptapDragFromOtherEditor;
            if (dragFromOtherEditor === null || dragFromOtherEditor === void 0 ? void 0 : dragFromOtherEditor.isEditable) setTimeout(() => {
              if (dragFromOtherEditor.isDestroyed) return;
              const selection = dragFromOtherEditor.state.selection;
              if (selection) dragFromOtherEditor.commands.deleteRange({
                from: selection.from,
                to: selection.to
              });
            }, 10);
          }
          return false;
        },
        paste: (_view, event) => {
          var _clipboardData;
          const html = (_clipboardData = event.clipboardData) === null || _clipboardData === void 0 ? void 0 : _clipboardData.getData("text/html");
          pasteEvent = event;
          isPastedFromProseMirror = !!(html === null || html === void 0 ? void 0 : html.includes("data-pm-slice"));
          return false;
        }
      } },
      appendTransaction: (transactions, oldState, state) => {
        const transaction = transactions[0];
        const isPaste = transaction.getMeta("uiEvent") === "paste" && !isPastedFromProseMirror;
        const isDrop = transaction.getMeta("uiEvent") === "drop" && !isDroppedFromProseMirror;
        const simulatedPasteMeta = transaction.getMeta("applyPasteRules");
        const isSimulatedPaste = !!simulatedPasteMeta;
        if (!isPaste && !isDrop && !isSimulatedPaste) return;
        if (isSimulatedPaste) {
          let { text } = simulatedPasteMeta;
          if (typeof text === "string") text = text;
          else text = getHTMLFromFragment(Fragment.from(text), state.schema);
          const { from: from3 } = simulatedPasteMeta;
          const to2 = from3 + text.length;
          const pasteEvt = createClipboardPasteEvent(text);
          return processEvent({
            rule,
            state,
            from: from3,
            to: { b: to2 },
            pasteEvt
          });
        }
        const from2 = oldState.doc.content.findDiffStart(state.doc.content);
        const to = oldState.doc.content.findDiffEnd(state.doc.content);
        if (!isNumber(from2) || !to || from2 === to.b) return;
        return processEvent({
          rule,
          state,
          from: from2,
          to,
          pasteEvt: pasteEvent
        });
      }
    });
  });
}
var ExtensionManager = class {
  constructor(extensions, editor) {
    this.splittableMarks = [];
    this.nonClearableMarks = [];
    this.decorationManager = null;
    this.editor = editor;
    this.baseExtensions = extensions;
    this.extensions = resolveExtensions(extensions);
    this.hasSchemaSpec = editor.options.schemaSpec !== void 0;
    this.schema = getSchemaByResolvedExtensions(this.extensions, editor, editor.options.schemaSpec);
    this.setupExtensions();
  }
  /**
  * Get all commands from the extensions.
  * @returns An object with all commands where the key is the command name and the value is the command function
  */
  get commands() {
    return this.extensions.reduce((commands, extension) => {
      const addCommands = getExtensionField(extension, "addCommands", {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor: this.editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      });
      if (!addCommands) return commands;
      return {
        ...commands,
        ...addCommands()
      };
    }, {});
  }
  /**
  * Get all registered Prosemirror plugins from the extensions.
  * @returns An array of Prosemirror plugins
  */
  get plugins() {
    const { editor } = this;
    const allPlugins = sortExtensions([...this.extensions].reverse()).flatMap((extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      };
      const plugins = [];
      const addKeyboardShortcuts = getExtensionField(extension, "addKeyboardShortcuts", context);
      let defaultBindings = {};
      if (extension.type === "mark" && getExtensionField(extension, "exitable", context)) defaultBindings.ArrowRight = () => Mark2.handleExit({
        editor,
        mark: extension
      });
      if (addKeyboardShortcuts) {
        const bindings = Object.fromEntries(Object.entries(addKeyboardShortcuts()).map(([shortcut, method]) => {
          return [shortcut, () => method({ editor })];
        }));
        defaultBindings = {
          ...defaultBindings,
          ...bindings
        };
      }
      const keyMapPlugin = keymap(defaultBindings);
      plugins.push(keyMapPlugin);
      const addInputRules = getExtensionField(extension, "addInputRules", context);
      if (isExtensionRulesEnabled(extension, editor.options.enableInputRules) && addInputRules) {
        const rules = addInputRules();
        if (rules && rules.length) {
          const inputResult = inputRulesPlugin({
            editor,
            rules
          });
          const inputPlugins = Array.isArray(inputResult) ? inputResult : [inputResult];
          plugins.push(...inputPlugins);
        }
      }
      const addPasteRules = getExtensionField(extension, "addPasteRules", context);
      if (isExtensionRulesEnabled(extension, editor.options.enablePasteRules) && addPasteRules) {
        const rules = addPasteRules();
        if (rules && rules.length) {
          const pasteRules = pasteRulesPlugin({
            editor,
            rules
          });
          plugins.push(...pasteRules);
        }
      }
      const addProseMirrorPlugins = getExtensionField(extension, "addProseMirrorPlugins", context);
      if (addProseMirrorPlugins) {
        const proseMirrorPlugins = addProseMirrorPlugins();
        plugins.push(...proseMirrorPlugins);
      }
      return plugins;
    });
    const decorationPlugin = this.createDecorationPlugin();
    if (decorationPlugin) allPlugins.push(decorationPlugin);
    return allPlugins;
  }
  /**
  * Aggregates decorations from extensions into a single plugin, or returns null
  * if none exist. Destroys the previous manager to avoid orphaned listeners.
  * @returns A ProseMirror plugin or `null`
  * @example
  * const plugin = editor.extensionManager.createDecorationPlugin()
  */
  createDecorationPlugin() {
    var _this$decorationManag;
    const { editor } = this;
    (_this$decorationManag = this.decorationManager) === null || _this$decorationManag === void 0 || _this$decorationManag.destroy();
    const entries = [];
    this.extensions.forEach((extension) => {
      const addDecorations = getExtensionField(extension, "addDecorations", {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      });
      if (!addDecorations) return;
      entries.push({
        name: extension.name,
        addDecorations
      });
    });
    this.decorationManager = new DecorationManager({
      editor,
      entries
    });
    return this.decorationManager.plugin;
  }
  /**
  * Get all attributes from the extensions.
  * @returns An array of attributes
  */
  get attributes() {
    const attributes = getAttributesFromExtensions(this.extensions);
    return this.hasSchemaSpec ? getSchemaAttributes(attributes, this.schema) : attributes;
  }
  /**
  * Get all node views from the extensions.
  * @returns An object with all node views where the key is the node name and the value is the node view function
  */
  get nodeViews() {
    const { editor } = this;
    const { nodeExtensions } = splitExtensions(this.extensions);
    return Object.fromEntries(nodeExtensions.filter((extension) => !!getExtensionField(extension, "addNodeView")).map((extension) => {
      const extensionAttributes = this.attributes.filter((attribute) => attribute.type === extension.name);
      const addNodeView = getExtensionField(extension, "addNodeView", {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getNodeType(extension.name, this.schema)
      });
      if (!addNodeView) return [];
      const nodeViewResult = addNodeView();
      if (!nodeViewResult) return [];
      const nodeview = (node, view, getPos, decorations, innerDecorations) => {
        const HTMLAttributes = getRenderedAttributes(node, extensionAttributes);
        return nodeViewResult({
          node,
          view,
          getPos,
          decorations,
          innerDecorations,
          editor,
          extension,
          HTMLAttributes
        });
      };
      return [extension.name, nodeview];
    }));
  }
  /**
  * Get the composed dispatchTransaction function from all extensions.
  * @param baseDispatch The base dispatch function (e.g. from the editor or user props)
  * @returns A composed dispatch function
  */
  dispatchTransaction(baseDispatch) {
    const { editor } = this;
    return sortExtensions([...this.extensions].reverse()).reduceRight((next, extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      };
      const dispatchTransaction = getExtensionField(extension, "dispatchTransaction", context);
      if (!dispatchTransaction) return next;
      return (transaction) => {
        dispatchTransaction.call(context, {
          transaction,
          next
        });
      };
    }, baseDispatch);
  }
  /**
  * Get the composed transformPastedHTML function from all extensions.
  * @param baseTransform The base transform function (e.g. from the editor props)
  * @returns A composed transform function that chains all extension transforms
  */
  transformPastedHTML(baseTransform) {
    const { editor } = this;
    return sortExtensions([...this.extensions]).reduce((transform, extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      };
      const extensionTransform = getExtensionField(extension, "transformPastedHTML", context);
      if (!extensionTransform) return transform;
      return (html, view) => {
        const transformedHtml = transform(html, view);
        return extensionTransform.call(context, transformedHtml);
      };
    }, baseTransform || ((html) => html));
  }
  get markViews() {
    const { editor } = this;
    const { markExtensions } = splitExtensions(this.extensions);
    return Object.fromEntries(markExtensions.filter((extension) => !!getExtensionField(extension, "addMarkView")).map((extension) => {
      const extensionAttributes = this.attributes.filter((attribute) => attribute.type === extension.name);
      const addMarkView = getExtensionField(extension, "addMarkView", {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        type: getMarkType(extension.name, this.schema)
      });
      if (!addMarkView) return [];
      const markView = (mark, view, inline3) => {
        const HTMLAttributes = getRenderedAttributes(mark, extensionAttributes);
        return addMarkView()({
          mark,
          view,
          inline: inline3,
          editor,
          extension,
          HTMLAttributes,
          updateAttributes: (attrs) => {
            updateMarkViewAttributes(mark, editor, attrs);
          }
        });
      };
      return [extension.name, markView];
    }));
  }
  /**
  * Destroy the extension manager and clean up all extension references
  * to prevent memory leaks through parent/child extension chains.
  *
  * Walks each extension's full parent chain and nulls every forward
  * `parent.child → current` link where the parent still points to the
  * current node. This breaks the retention path from module-scope
  * singleton roots through deep extend() chains.
  *
  * Only ancestor `.child` links matching the current chain are cleared.
  * The `.parent` pointer on ancestors is never touched — extensions
  * may be shared across live editors, so their own backward references
  * and non-matching forward links must remain intact.
  */
  destroy() {
    var _this$decorationManag2;
    (_this$decorationManag2 = this.decorationManager) === null || _this$decorationManag2 === void 0 || _this$decorationManag2.destroy();
    this.extensions.forEach((extension) => {
      let current = extension;
      while (current.parent) {
        const parent = current.parent;
        if (parent.child === current) parent.child = null;
        current = parent;
      }
    });
    this.extensions = [];
    this.baseExtensions = [];
    this.decorationManager = null;
    this.schema = null;
    this.editor = null;
  }
  /**
  * Go through all extensions, create extension storages & setup marks
  * & bind editor event listener.
  */
  setupExtensions() {
    const extensions = this.extensions;
    this.editor.extensionStorage = Object.fromEntries(extensions.map((extension) => [extension.name, extension.storage]));
    extensions.forEach((extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor: this.editor,
        type: getSchemaTypeByName(extension.name, this.schema)
      };
      if (extension.type === "mark") {
        var _callOrReturn, _callOrReturn2;
        if ((_callOrReturn = callOrReturn(getExtensionField(extension, "keepOnSplit", context))) !== null && _callOrReturn !== void 0 ? _callOrReturn : true) this.splittableMarks.push(extension.name);
        if (!((_callOrReturn2 = callOrReturn(getExtensionField(extension, "clearable", context))) !== null && _callOrReturn2 !== void 0 ? _callOrReturn2 : true)) this.nonClearableMarks.push(extension.name);
      }
      const onBeforeCreate = getExtensionField(extension, "onBeforeCreate", context);
      const onCreate = getExtensionField(extension, "onCreate", context);
      const onUpdate = getExtensionField(extension, "onUpdate", context);
      const onSelectionUpdate = getExtensionField(extension, "onSelectionUpdate", context);
      const onTransaction = getExtensionField(extension, "onTransaction", context);
      const onFocus = getExtensionField(extension, "onFocus", context);
      const onBlur = getExtensionField(extension, "onBlur", context);
      const onDestroy = getExtensionField(extension, "onDestroy", context);
      if (onBeforeCreate) this.editor.on("beforeCreate", onBeforeCreate);
      if (onCreate) this.editor.on("create", onCreate);
      if (onUpdate) this.editor.on("update", onUpdate);
      if (onSelectionUpdate) this.editor.on("selectionUpdate", onSelectionUpdate);
      if (onTransaction) this.editor.on("transaction", onTransaction);
      if (onFocus) this.editor.on("focus", onFocus);
      if (onBlur) this.editor.on("blur", onBlur);
      if (onDestroy) this.editor.on("destroy", onDestroy);
    });
  }
};
ExtensionManager.resolve = resolveExtensions;
ExtensionManager.sort = sortExtensions;
ExtensionManager.flatten = flattenExtensions;
var Extension = class Extension2 extends Extendable {
  constructor(..._args) {
    super(..._args);
    this.type = "extension";
  }
  /**
  * Create a new Extension instance
  * @param config - Extension configuration object or a function that returns a configuration object
  */
  static create(config = {}) {
    const resolvedConfig = typeof config === "function" ? config() : config;
    return new Extension2(resolvedConfig);
  }
  configure(options) {
    return super.configure(options);
  }
  extend(extendedConfig) {
    const resolvedConfig = typeof extendedConfig === "function" ? extendedConfig() : extendedConfig;
    return super.extend(resolvedConfig);
  }
};
var ClipboardTextSerializer = Extension.create({
  name: "clipboardTextSerializer",
  addOptions() {
    return { blockSeparator: void 0 };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("clipboardTextSerializer"),
      props: { clipboardTextSerializer: () => {
        const { editor } = this;
        const { state, schema } = editor;
        const { doc: doc2, selection } = state;
        const textSerializers = getTextSerializersFromSchema(schema);
        const { blockSeparator } = this.options;
        const options = {
          ...blockSeparator !== void 0 ? { blockSeparator } : {},
          textSerializers
        };
        return [...selection.ranges].sort((a, b) => a.$from.pos - b.$from.pos).map(({ $from, $to }) => getTextBetween(doc2, {
          from: $from.pos,
          to: $to.pos
        }, options)).join(blockSeparator !== null && blockSeparator !== void 0 ? blockSeparator : "\n\n");
      } }
    })];
  }
});
var Commands = Extension.create({
  name: "commands",
  addCommands() {
    return { ...commands_exports };
  }
});
var Delete = Extension.create({
  name: "delete",
  onUpdate({ transaction, appendedTransactions }) {
    var _this$editor$options$4, _this$editor$options$5;
    const callback = () => {
      var _this$editor$options$, _this$editor$options$2, _this$editor$options$3;
      if ((_this$editor$options$ = (_this$editor$options$2 = this.editor.options.coreExtensionOptions) === null || _this$editor$options$2 === void 0 || (_this$editor$options$2 = _this$editor$options$2.delete) === null || _this$editor$options$2 === void 0 || (_this$editor$options$3 = _this$editor$options$2.filterTransaction) === null || _this$editor$options$3 === void 0 ? void 0 : _this$editor$options$3.call(_this$editor$options$2, transaction)) !== null && _this$editor$options$ !== void 0 ? _this$editor$options$ : transaction.getMeta("y-sync$")) return;
      const nextTransaction = combineTransactionSteps(transaction.before, [transaction, ...appendedTransactions]);
      getChangedRanges(nextTransaction).forEach((change) => {
        if (nextTransaction.mapping.mapResult(change.oldRange.from).deletedAfter && nextTransaction.mapping.mapResult(change.oldRange.to).deletedBefore) nextTransaction.before.nodesBetween(change.oldRange.from, change.oldRange.to, (node, from2) => {
          const to = from2 + node.nodeSize - 2;
          const isFullyWithinRange = change.oldRange.from <= from2 && to <= change.oldRange.to;
          this.editor.emit("delete", {
            type: "node",
            node,
            from: from2,
            to,
            newFrom: nextTransaction.mapping.map(from2),
            newTo: nextTransaction.mapping.map(to),
            deletedRange: change.oldRange,
            newRange: change.newRange,
            partial: !isFullyWithinRange,
            editor: this.editor,
            transaction,
            combinedTransform: nextTransaction
          });
        });
      });
      const mapping = nextTransaction.mapping;
      nextTransaction.steps.forEach((step, index) => {
        if (step instanceof RemoveMarkStep) {
          var _nextTransaction$doc$, _nextTransaction$doc$2;
          const newStart = mapping.slice(index).map(step.from, -1);
          const newEnd = mapping.slice(index).map(step.to);
          const oldStart = mapping.invert().map(newStart, -1);
          const oldEnd = mapping.invert().map(newEnd);
          const foundBeforeMark = newStart > 0 ? (_nextTransaction$doc$ = nextTransaction.doc.nodeAt(newStart - 1)) === null || _nextTransaction$doc$ === void 0 ? void 0 : _nextTransaction$doc$.marks.some((mark) => mark.eq(step.mark)) : false;
          const foundAfterMark = (_nextTransaction$doc$2 = nextTransaction.doc.nodeAt(newEnd)) === null || _nextTransaction$doc$2 === void 0 ? void 0 : _nextTransaction$doc$2.marks.some((mark) => mark.eq(step.mark));
          this.editor.emit("delete", {
            type: "mark",
            mark: step.mark,
            from: step.from,
            to: step.to,
            deletedRange: {
              from: oldStart,
              to: oldEnd
            },
            newRange: {
              from: newStart,
              to: newEnd
            },
            partial: Boolean(foundAfterMark || foundBeforeMark),
            editor: this.editor,
            transaction,
            combinedTransform: nextTransaction
          });
        }
      });
    };
    if ((_this$editor$options$4 = (_this$editor$options$5 = this.editor.options.coreExtensionOptions) === null || _this$editor$options$5 === void 0 || (_this$editor$options$5 = _this$editor$options$5.delete) === null || _this$editor$options$5 === void 0 ? void 0 : _this$editor$options$5.async) !== null && _this$editor$options$4 !== void 0 ? _this$editor$options$4 : true) setTimeout(callback, 0);
    else callback();
  }
});
var Drop = Extension.create({
  name: "drop",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("tiptapDrop"),
      props: { handleDrop: (_, e, slice2, moved) => {
        this.editor.emit("drop", {
          editor: this.editor,
          event: e,
          slice: slice2,
          moved
        });
      } }
    })];
  }
});
var Editable = Extension.create({
  name: "editable",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("editable"),
      props: { editable: () => this.editor.options.editable }
    })];
  }
});
var focusEventsPluginKey = new PluginKey("focusEvents");
var FocusEvents = Extension.create({
  name: "focusEvents",
  addProseMirrorPlugins() {
    const { editor } = this;
    return [new Plugin({
      key: focusEventsPluginKey,
      props: { handleDOMEvents: {
        focus: (view, event) => {
          editor.isFocused = true;
          const transaction = editor.state.tr.setMeta("focus", { event }).setMeta("addToHistory", false);
          view.dispatch(transaction);
          return false;
        },
        blur: (view, event) => {
          editor.isFocused = false;
          const transaction = editor.state.tr.setMeta("blur", { event }).setMeta("addToHistory", false);
          view.dispatch(transaction);
          return false;
        }
      } }
    })];
  }
});
var Keymap = Extension.create({
  name: "keymap",
  addKeyboardShortcuts() {
    const handleBackspace = () => this.editor.commands.first(({ commands }) => [
      () => commands.undoInputRule(),
      () => commands.command(({ tr }) => {
        const { selection, doc: doc2 } = tr;
        const { empty: empty2, $anchor } = selection;
        const { pos, parent } = $anchor;
        const $parentPos = $anchor.parent.isTextblock && pos > 0 ? tr.doc.resolve(pos - 1) : $anchor;
        const parentIsIsolating = $parentPos.parent.type.spec.isolating;
        const parentPos = $anchor.pos - $anchor.parentOffset;
        const isAtStart = parentIsIsolating && $parentPos.parent.childCount === 1 ? parentPos === $anchor.pos : Selection.atStart(doc2).from === pos;
        if (!empty2 || !parent.type.isTextblock || parent.textContent.length || !isAtStart || isAtStart && $anchor.parent.type.name === "paragraph") return false;
        return commands.clearNodes();
      }),
      () => commands.deleteSelection(),
      () => commands.joinBackward(),
      () => commands.selectNodeBackward()
    ]);
    const handleDelete = () => this.editor.commands.first(({ commands }) => [
      () => commands.deleteSelection(),
      () => commands.deleteCurrentNode(),
      () => commands.joinForward(),
      () => commands.selectNodeForward()
    ]);
    const handleEnter = () => this.editor.commands.first(({ commands }) => [
      () => commands.newlineInCode(),
      () => commands.createParagraphNear(),
      () => commands.liftEmptyBlock(),
      () => commands.splitBlock()
    ]);
    const baseKeymap = {
      Enter: handleEnter,
      "Mod-Enter": () => this.editor.commands.exitCode(),
      Backspace: handleBackspace,
      "Mod-Backspace": handleBackspace,
      "Shift-Backspace": handleBackspace,
      Delete: handleDelete,
      "Mod-Delete": handleDelete,
      "Mod-a": () => this.editor.commands.selectAll()
    };
    const pcKeymap = { ...baseKeymap };
    const macKeymap = {
      ...baseKeymap,
      "Ctrl-h": handleBackspace,
      "Alt-Backspace": handleBackspace,
      "Ctrl-d": handleDelete,
      "Ctrl-Alt-Backspace": handleDelete,
      "Alt-Delete": handleDelete,
      "Alt-d": handleDelete,
      "Ctrl-a": () => this.editor.commands.selectTextblockStart(),
      "Ctrl-e": () => this.editor.commands.selectTextblockEnd()
    };
    if (isiOS() || isMacOS()) return macKeymap;
    return pcKeymap;
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("clearDocument"),
      appendTransaction: (transactions, oldState, newState) => {
        if (transactions.some((tr2) => tr2.getMeta("composition"))) return;
        const docChanges = transactions.some((transaction) => transaction.docChanged) && !oldState.doc.eq(newState.doc);
        const ignoreTr = transactions.some((transaction) => transaction.getMeta("preventClearDocument"));
        if (!docChanges || ignoreTr) return;
        const { empty: empty2, from: from2, to } = oldState.selection;
        const allFrom = Selection.atStart(oldState.doc).from;
        const allEnd = Selection.atEnd(oldState.doc).to;
        if (empty2 || !(from2 === allFrom && to === allEnd)) return;
        if (!isNodeEmpty(newState.doc)) return;
        const tr = newState.tr;
        const state = createChainableState({
          state: newState,
          transaction: tr
        });
        const { commands } = new CommandManager({
          editor: this.editor,
          state
        });
        commands.clearNodes();
        if (!tr.steps.length) return;
        return tr;
      }
    })];
  }
});
var Paste = Extension.create({
  name: "paste",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("tiptapPaste"),
      props: { handlePaste: (_view, e, slice2) => {
        this.editor.emit("paste", {
          editor: this.editor,
          event: e,
          slice: slice2
        });
      } }
    })];
  }
});
var Tabindex = Extension.create({
  name: "tabindex",
  addOptions() {
    return { value: void 0 };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("tabindex"),
      props: { attributes: () => {
        var _this$options$value;
        if (!this.editor.isEditable && this.options.value === void 0) return {};
        return { tabindex: (_this$options$value = this.options.value) !== null && _this$options$value !== void 0 ? _this$options$value : "0" };
      } }
    })];
  }
});
var TextDirection = Extension.create({
  name: "textDirection",
  addOptions() {
    return { direction: void 0 };
  },
  addGlobalAttributes() {
    if (!this.options.direction) return [];
    const { nodeExtensions } = splitExtensions(this.extensions);
    return [{
      types: nodeExtensions.filter((extension) => extension.name !== "text").map((extension) => extension.name),
      attributes: { dir: {
        default: this.options.direction,
        parseHTML: (element) => {
          const dir = element.getAttribute("dir");
          if (dir && (dir === "ltr" || dir === "rtl" || dir === "auto")) return dir;
          return this.options.direction;
        },
        renderHTML: (attributes) => {
          if (!attributes.dir) return {};
          return { dir: attributes.dir };
        }
      } }
    }];
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("textDirection"),
      props: { attributes: () => {
        const direction = this.options.direction;
        if (!direction) return {};
        return { dir: direction };
      } }
    })];
  }
});
var hasChecked = false;
function warnOnDuplicatedProseMirrorModel(schema) {
  if (hasChecked) return;
  hasChecked = true;
  let content;
  try {
    const step = ReplaceStep.fromJSON(schema, {
      from: 0,
      to: 0
    });
    if (!isProseMirrorReplaceStep(step)) return;
    content = step.slice.content;
  } catch {
    return;
  }
  if (content instanceof Fragment) return;
  console.warn("[tiptap warn]: prosemirror-model is loaded more than once. Wrapping and splitting nodes will fail. Deduplicate it in your lock file, or alias it to a single copy in your bundler.");
}
var NodePos = class NodePos2 {
  get name() {
    return this.node.type.name;
  }
  constructor(pos, editor, isBlock = false, node = null) {
    this.currentNode = null;
    this.actualDepth = null;
    this.isBlock = isBlock;
    this.resolvedPos = pos;
    this.editor = editor;
    this.currentNode = node;
  }
  get node() {
    return this.currentNode || this.resolvedPos.node();
  }
  get element() {
    return this.editor.view.domAtPos(this.pos).node;
  }
  get depth() {
    var _this$actualDepth;
    return (_this$actualDepth = this.actualDepth) !== null && _this$actualDepth !== void 0 ? _this$actualDepth : this.resolvedPos.depth;
  }
  get pos() {
    return this.resolvedPos.pos;
  }
  get content() {
    return this.node.content;
  }
  set content(content) {
    let from2 = this.from;
    let to = this.to;
    if (this.isBlock) {
      if (this.content.size === 0) {
        console.error(`You can\u2019t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`);
        return;
      }
      from2 = this.from + 1;
      to = this.to - 1;
    }
    this.editor.commands.insertContentAt({
      from: from2,
      to
    }, content);
  }
  get attributes() {
    return this.node.attrs;
  }
  get textContent() {
    return this.node.textContent;
  }
  get size() {
    return this.node.nodeSize;
  }
  get from() {
    if (this.isBlock) return this.pos;
    return this.resolvedPos.start(this.resolvedPos.depth);
  }
  get range() {
    return {
      from: this.from,
      to: this.to
    };
  }
  get to() {
    if (this.isBlock) return this.pos + this.size;
    return this.resolvedPos.end(this.resolvedPos.depth) + (this.node.isText ? 0 : 1);
  }
  get parent() {
    if (this.depth === 0) return null;
    const parentPos = this.resolvedPos.start(this.resolvedPos.depth - 1);
    const $pos = this.resolvedPos.doc.resolve(parentPos);
    return new NodePos2($pos, this.editor);
  }
  get before() {
    let $pos = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
    if ($pos.depth !== this.depth) $pos = this.resolvedPos.doc.resolve(this.from - 3);
    return new NodePos2($pos, this.editor);
  }
  get after() {
    let $pos = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
    if ($pos.depth !== this.depth) $pos = this.resolvedPos.doc.resolve(this.to + 3);
    return new NodePos2($pos, this.editor);
  }
  get children() {
    const children = [];
    this.node.content.forEach((node, offset3) => {
      const isBlock = node.isBlock && !node.isTextblock;
      const isNonTextAtom = node.isAtom && !node.isText;
      const isInline2 = node.isInline;
      const targetPos = this.pos + offset3 + (isNonTextAtom ? 0 : 1);
      if (targetPos < 0 || targetPos > this.resolvedPos.doc.nodeSize - 2) return;
      const $pos = this.resolvedPos.doc.resolve(targetPos);
      if (!isBlock && !isInline2 && $pos.depth <= this.depth) return;
      const childNodePos = new NodePos2($pos, this.editor, isBlock, isBlock || isInline2 ? node : null);
      if (isBlock) childNodePos.actualDepth = this.depth + 1;
      children.push(childNodePos);
    });
    return children;
  }
  get firstChild() {
    return this.children[0] || null;
  }
  get lastChild() {
    const children = this.children;
    return children[children.length - 1] || null;
  }
  closest(selector, attributes = {}) {
    let node = null;
    let currentNode = this.parent;
    while (currentNode && !node) {
      if (currentNode.node.type.name === selector) {
        if (Object.keys(attributes).length > 0) {
          const nodeAttributes2 = currentNode.node.attrs;
          const attrKeys = Object.keys(attributes);
          for (let index = 0; index < attrKeys.length; index += 1) {
            const key = attrKeys[index];
            if (nodeAttributes2[key] !== attributes[key]) break;
          }
        } else node = currentNode;
      }
      currentNode = currentNode.parent;
    }
    return node;
  }
  querySelector(selector, attributes = {}) {
    return this.querySelectorAll(selector, attributes, true)[0] || null;
  }
  querySelectorAll(selector, attributes = {}, firstItemOnly = false) {
    let nodes = [];
    if (!this.children || this.children.length === 0) return nodes;
    const attrKeys = Object.keys(attributes);
    this.children.forEach((childPos) => {
      if (firstItemOnly && nodes.length > 0) return;
      if (childPos.node.type.name === selector) {
        if (attrKeys.every((key) => attributes[key] === childPos.node.attrs[key])) nodes.push(childPos);
      }
      if (firstItemOnly && nodes.length > 0) return;
      nodes = nodes.concat(childPos.querySelectorAll(selector, attributes, firstItemOnly));
    });
    return nodes;
  }
  setAttribute(attributes) {
    const { tr } = this.editor.state;
    tr.setNodeMarkup(this.from, void 0, {
      ...this.node.attrs,
      ...attributes
    });
    this.editor.view.dispatch(tr);
  }
};
var style = `.ProseMirror {
  position: relative;
}

.ProseMirror {
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
}

.ProseMirror [contenteditable="false"] {
  white-space: normal;
}

.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}

.ProseMirror pre {
  white-space: pre-wrap;
}

img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
  margin: 0;
}

.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid black;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}

.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.ProseMirror-hideselection * {
  caret-color: transparent;
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}`;
var Editor = class extends EventEmitter {
  constructor(options = {}) {
    super();
    this.css = null;
    this.className = "tiptap";
    this.editorView = null;
    this.isFocused = false;
    this.destroyed = false;
    this.isInitialized = false;
    this.extensionStorage = {};
    this.instanceId = Math.random().toString(36).slice(2, 9);
    this.hasWarnedStaleDecorationRead = false;
    this.options = {
      element: typeof document !== "undefined" ? document.createElement("div") : null,
      content: "",
      injectCSS: true,
      injectNonce: void 0,
      extensions: [],
      autofocus: false,
      editable: true,
      textDirection: void 0,
      editorProps: {},
      parseOptions: {},
      coreExtensionOptions: {},
      enableInputRules: true,
      enablePasteRules: true,
      enableCoreExtensions: true,
      enableContentCheck: false,
      emitContentError: false,
      onBeforeCreate: () => null,
      onCreate: () => null,
      onMount: () => null,
      onUnmount: () => null,
      onUpdate: () => null,
      onSelectionUpdate: () => null,
      onTransaction: () => null,
      onFocus: () => null,
      onBlur: () => null,
      onDestroy: () => null,
      onContentError: ({ error }) => {
        throw error;
      },
      onPaste: () => null,
      onDrop: () => null,
      onDelete: () => null,
      enableExtensionDispatchTransaction: true
    };
    this.isCapturingTransaction = false;
    this.capturedTransaction = null;
    this.utils = {
      getUpdatedPosition,
      createMappablePosition
    };
    this.setOptions(options);
    this.createExtensionManager();
    this.createCommandManager();
    this.createSchema();
    this.on("beforeCreate", this.options.onBeforeCreate);
    this.emit("beforeCreate", { editor: this });
    this.on("mount", this.options.onMount);
    this.on("unmount", this.options.onUnmount);
    this.on("contentError", this.options.onContentError);
    this.on("create", this.options.onCreate);
    this.on("update", this.options.onUpdate);
    this.on("selectionUpdate", this.options.onSelectionUpdate);
    this.on("transaction", this.options.onTransaction);
    this.on("focus", this.options.onFocus);
    this.on("blur", this.options.onBlur);
    this.on("destroy", this.options.onDestroy);
    this.on("drop", ({ event, slice: slice2, moved }) => this.options.onDrop(event, slice2, moved));
    this.on("paste", ({ event, slice: slice2 }) => this.options.onPaste(event, slice2));
    this.on("delete", this.options.onDelete);
    const initialDoc = this.createDoc();
    if (!this.editorState) {
      const selection = resolveFocusPosition(initialDoc, this.options.autofocus);
      this.editorState = EditorState.create({
        doc: initialDoc,
        schema: this.schema,
        selection: selection || void 0
      });
    }
    warnOnDuplicatedProseMirrorModel(this.schema);
    if (this.options.element) this.mount(this.options.element);
  }
  /**
  * Attach the editor to the DOM, creating a new editor view.
  */
  mount(el) {
    if (typeof document === "undefined") throw new Error(`[tiptap error]: The editor cannot be mounted because there is no 'document' defined in this environment.`);
    this.createView(el);
    this.emit("mount", { editor: this });
    if (this.css && !document.head.contains(this.css)) document.head.appendChild(this.css);
    window.setTimeout(() => {
      if (this.isDestroyed) return;
      if (this.options.autofocus !== false && this.options.autofocus !== null) this.commands.focus(this.options.autofocus);
      this.emit("create", { editor: this });
      this.isInitialized = true;
    }, 0);
  }
  /**
  * Remove the editor from the DOM, but still allow remounting at a different point in time
  */
  unmount() {
    if (this.editorView) {
      this.editorState = this.editorView.state;
      const dom = this.editorView.dom;
      if (dom === null || dom === void 0 ? void 0 : dom.editor) delete dom.editor;
      this.editorView.destroy();
    }
    this.editorView = null;
    this.isInitialized = false;
    if (this.css && !document.querySelectorAll(`.${this.className}`).length) try {
      if (typeof this.css.remove === "function") this.css.remove();
      else if (this.css.parentNode) this.css.parentNode.removeChild(this.css);
    } catch (error) {
      console.warn("Failed to remove CSS element:", error);
    }
    this.css = null;
    this.emit("unmount", { editor: this });
  }
  /**
  * Returns the editor storage.
  */
  get storage() {
    return this.extensionStorage;
  }
  /**
  * An object of all registered commands.
  */
  get commands() {
    return this.commandManager.commands;
  }
  /**
  * Create a command chain to call multiple commands at once.
  */
  chain() {
    if (!this.commandManager) return CommandManager.createFakeChain();
    return this.commandManager.chain();
  }
  /**
  * Check if a command or a command chain can be executed. Without executing it.
  */
  can() {
    if (!this.commandManager) return CommandManager.createFallbackCan();
    return this.commandManager.can();
  }
  /**
  * Inject CSS styles.
  */
  injectCSS() {
    if (this.options.injectCSS && typeof document !== "undefined") this.css = createStyleTag(style, this.options.injectNonce);
  }
  /**
  * Update editor options.
  *
  * @param options A list of options
  */
  setOptions(options = {}) {
    this.options = {
      ...this.options,
      ...options
    };
    if (!this.editorView || !this.state || this.isDestroyed) return;
    if (this.options.editorProps) this.view.setProps({
      ...this.options.editorProps,
      attributes: this.getEditorViewAttributes()
    });
    this.view.updateState(this.state);
  }
  /**
  * Update editable state of the editor.
  */
  setEditable(editable, emitUpdate = true) {
    this.setOptions({ editable });
    if (emitUpdate) this.emit("update", {
      editor: this,
      transaction: this.state.tr,
      appendedTransactions: []
    });
  }
  /**
  * Returns whether the editor is editable.
  */
  get isEditable() {
    return this.options.editable && this.view && this.view.editable;
  }
  /**
  * Returns the editor view.
  */
  get view() {
    if (this.editorView) return this.editorView;
    return new Proxy({
      state: this.editorState,
      updateState: (state) => {
        this.editorState = state;
      },
      dispatch: (tr) => {
        this.dispatchTransaction(tr);
      },
      composing: false,
      dragging: null,
      editable: true,
      isDestroyed: false
    }, { get: (obj, key) => {
      if (this.editorView) return this.editorView[key];
      if (key === "state") return this.editorState;
      if (key in obj) return Reflect.get(obj, key);
      throw new Error(`[tiptap error]: The editor view is not available. Cannot access view['${key}']. The editor may not be mounted yet.`);
    } });
  }
  /**
  * Returns the editor state.
  */
  get state() {
    if (isDev && !this.hasWarnedStaleDecorationRead && isInDecorationApplyScope(this)) {
      this.hasWarnedStaleDecorationRead = true;
      console.warn("[tiptap warn]: `editor.state` was read while decoration `create()` was running. It returns the pre-transaction document. Use the `state` argument passed to `create()` instead. Helpers like `editor.isActive()` read `editor.state` too, so pass `state` to their standalone versions instead of calling them on the editor.");
    }
    if (this.editorView) this.editorState = this.view.state;
    return this.editorState;
  }
  /**
  * Register a ProseMirror plugin.
  *
  * @param plugin A ProseMirror plugin
  * @param handlePlugins Control how to merge the plugin into the existing plugins.
  * @returns The new editor state
  */
  registerPlugin(plugin, handlePlugins) {
    const plugins = isFunction(handlePlugins) ? handlePlugins(plugin, [...this.state.plugins]) : [...this.state.plugins, plugin];
    const state = this.state.reconfigure({ plugins });
    this.view.updateState(state);
    return state;
  }
  /**
  * Unregister a ProseMirror plugin.
  *
  * @param nameOrPluginKeyToRemove The plugins name
  * @returns The new editor state or undefined if the editor is destroyed
  */
  unregisterPlugin(nameOrPluginKeyToRemove) {
    if (this.isDestroyed) return;
    const prevPlugins = this.state.plugins;
    let plugins = prevPlugins;
    [].concat(nameOrPluginKeyToRemove).forEach((nameOrPluginKey) => {
      const name = typeof nameOrPluginKey === "string" ? `${nameOrPluginKey}$` : nameOrPluginKey.key;
      plugins = plugins.filter((plugin) => !plugin.key.startsWith(name));
    });
    if (prevPlugins.length === plugins.length) return;
    const state = this.state.reconfigure({ plugins });
    this.view.updateState(state);
    return state;
  }
  /**
  * Creates an extension manager.
  */
  createExtensionManager() {
    var _this$options$coreExt, _this$options$coreExt2;
    const allExtensions = [...this.options.enableCoreExtensions ? [
      Editable,
      ClipboardTextSerializer.configure({ blockSeparator: (_this$options$coreExt = this.options.coreExtensionOptions) === null || _this$options$coreExt === void 0 || (_this$options$coreExt = _this$options$coreExt.clipboardTextSerializer) === null || _this$options$coreExt === void 0 ? void 0 : _this$options$coreExt.blockSeparator }),
      Commands,
      FocusEvents,
      Keymap,
      Tabindex.configure({ value: (_this$options$coreExt2 = this.options.coreExtensionOptions) === null || _this$options$coreExt2 === void 0 || (_this$options$coreExt2 = _this$options$coreExt2.tabindex) === null || _this$options$coreExt2 === void 0 ? void 0 : _this$options$coreExt2.value }),
      Drop,
      Paste,
      Delete,
      TextDirection.configure({ direction: this.options.textDirection })
    ].filter((ext) => {
      if (typeof this.options.enableCoreExtensions === "object") return this.options.enableCoreExtensions[ext.name] !== false;
      return true;
    }) : [], ...this.options.extensions].filter((extension) => {
      return [
        "extension",
        "node",
        "mark"
      ].includes(extension === null || extension === void 0 ? void 0 : extension.type);
    });
    this.extensionManager = new ExtensionManager(allExtensions, this);
  }
  /**
  * Creates an command manager.
  */
  createCommandManager() {
    this.commandManager = new CommandManager({ editor: this });
  }
  /**
  * Creates a ProseMirror schema.
  */
  createSchema() {
    this.schema = this.extensionManager.schema;
  }
  /**
  * Creates the initial document.
  */
  createDoc() {
    let doc2;
    try {
      doc2 = createDocument(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
    } catch (e) {
      if (!(e instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(e.message)) throw e;
      const fallbackDoc = createDocument(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: false });
      this.editorState = EditorState.create({
        doc: fallbackDoc,
        schema: this.schema,
        selection: resolveFocusPosition(fallbackDoc, this.options.autofocus) || void 0
      });
      this.emit("contentError", {
        editor: this,
        error: e,
        disableCollaboration: () => {
          if ("collaboration" in this.storage && typeof this.storage.collaboration === "object" && this.storage.collaboration) this.storage.collaboration.isDisabled = true;
          this.options.extensions = this.options.extensions.filter((extension) => extension.name !== "collaboration");
          this.createExtensionManager();
        }
      });
      return this.editorState.doc;
    }
    return doc2;
  }
  /**
  * Returns the attributes for the editor element.
  * Merges the default `role="textbox"` with the attributes from `editorProps`,
  * so the role is kept no matter when the props are applied.
  */
  getEditorViewAttributes() {
    var _this$options$editorP;
    const attributes = (_this$options$editorP = this.options.editorProps) === null || _this$options$editorP === void 0 ? void 0 : _this$options$editorP.attributes;
    if (isFunction(attributes)) return (state) => ({
      role: "textbox",
      ...attributes(state)
    });
    return {
      role: "textbox",
      ...attributes
    };
  }
  /**
  * Creates a ProseMirror view.
  */
  createView(element) {
    const { editorProps, enableExtensionDispatchTransaction } = this.options;
    const baseDispatch = editorProps.dispatchTransaction || this.dispatchTransaction.bind(this);
    const dispatch = enableExtensionDispatchTransaction ? this.extensionManager.dispatchTransaction(baseDispatch) : baseDispatch;
    const baseTransformPastedHTML = editorProps.transformPastedHTML;
    const transformPastedHTML = this.extensionManager.transformPastedHTML(baseTransformPastedHTML);
    this.editorView = new EditorView(element, {
      ...editorProps,
      attributes: this.getEditorViewAttributes(),
      dispatchTransaction: dispatch,
      transformPastedHTML,
      state: this.editorState,
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews
    });
    const newState = this.state.reconfigure({ plugins: this.extensionManager.plugins });
    this.view.updateState(newState);
    this.prependClass();
    this.injectCSS();
    const dom = this.view.dom;
    dom.editor = this;
  }
  /**
  * Creates all node and mark views.
  */
  createNodeViews() {
    if (this.view.isDestroyed) return;
    this.view.setProps({
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews
    });
  }
  /**
  * Prepend class name to element.
  */
  prependClass() {
    this.view.dom.className = `${this.className} ${this.view.dom.className}`;
  }
  captureTransaction(fn) {
    this.isCapturingTransaction = true;
    fn();
    this.isCapturingTransaction = false;
    const tr = this.capturedTransaction;
    this.capturedTransaction = null;
    return tr;
  }
  /**
  * The callback over which to send transactions (state updates) produced by the view.
  *
  * @param transaction An editor state transaction
  */
  dispatchTransaction(transaction) {
    if (this.view.isDestroyed) return;
    if (this.isCapturingTransaction) {
      if (!this.capturedTransaction) {
        this.capturedTransaction = transaction;
        return;
      }
      transaction.steps.forEach((step) => {
        var _this$capturedTransac;
        return (_this$capturedTransac = this.capturedTransaction) === null || _this$capturedTransac === void 0 ? void 0 : _this$capturedTransac.step(step);
      });
      return;
    }
    const { state, transactions } = this.state.applyTransaction(transaction);
    const selectionHasChanged = !this.state.selection.eq(state.selection);
    const rootTrWasApplied = transactions.includes(transaction);
    const prevState = this.state;
    this.emit("beforeTransaction", {
      editor: this,
      transaction,
      nextState: state
    });
    if (!rootTrWasApplied) return;
    this.view.updateState(state);
    this.emit("transaction", {
      editor: this,
      transaction,
      appendedTransactions: transactions.slice(1)
    });
    if (selectionHasChanged) this.emit("selectionUpdate", {
      editor: this,
      transaction
    });
    const mostRecentFocusTr = transactions.findLast((tr) => tr.getMeta("focus") || tr.getMeta("blur"));
    const focus2 = mostRecentFocusTr === null || mostRecentFocusTr === void 0 ? void 0 : mostRecentFocusTr.getMeta("focus");
    const blur2 = mostRecentFocusTr === null || mostRecentFocusTr === void 0 ? void 0 : mostRecentFocusTr.getMeta("blur");
    if (focus2) this.emit("focus", {
      editor: this,
      event: focus2.event,
      transaction: mostRecentFocusTr
    });
    if (blur2) this.emit("blur", {
      editor: this,
      event: blur2.event,
      transaction: mostRecentFocusTr
    });
    if (transaction.getMeta("preventUpdate") || !transactions.some((tr) => tr.docChanged) || prevState.doc.eq(state.doc)) return;
    this.emit("update", {
      editor: this,
      transaction,
      appendedTransactions: transactions.slice(1)
    });
  }
  /**
  * Get attributes of the currently selected node or mark.
  */
  getAttributes(nameOrType) {
    return getAttributes(this.state, nameOrType);
  }
  isActive(nameOrAttributes, attributesOrUndefined) {
    const name = typeof nameOrAttributes === "string" ? nameOrAttributes : null;
    const attributes = typeof nameOrAttributes === "string" ? attributesOrUndefined : nameOrAttributes;
    return isActive(this.state, name, attributes);
  }
  /**
  * Get the document as JSON.
  */
  getJSON() {
    return this.state.doc.toJSON();
  }
  /**
  * Get the document as HTML.
  */
  getHTML() {
    return getHTMLFromFragment(this.state.doc.content, this.schema);
  }
  /**
  * Get the document as text.
  */
  getText(options) {
    const { blockSeparator = "\n\n", textSerializers = {} } = options || {};
    return getText2(this.state.doc, {
      blockSeparator,
      textSerializers: {
        ...getTextSerializersFromSchema(this.schema),
        ...textSerializers
      }
    });
  }
  /**
  * Check if there is no content.
  */
  get isEmpty() {
    return isNodeEmpty(this.state.doc);
  }
  /**
  * Destroy the editor.
  */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroy");
    this.unmount();
    this.removeAllListeners();
    this.extensionManager.destroy();
    this.extensionManager = null;
    this.schema = null;
    this.commandManager = null;
    this.extensionStorage = {};
  }
  /**
  * Check if the editor is already destroyed.
  */
  get isDestroyed() {
    var _this$editorView$isDe, _this$editorView;
    return (_this$editorView$isDe = (_this$editorView = this.editorView) === null || _this$editorView === void 0 ? void 0 : _this$editorView.isDestroyed) !== null && _this$editorView$isDe !== void 0 ? _this$editorView$isDe : true;
  }
  $node(selector, attributes) {
    var _this$$doc;
    return ((_this$$doc = this.$doc) === null || _this$$doc === void 0 ? void 0 : _this$$doc.querySelector(selector, attributes)) || null;
  }
  $nodes(selector, attributes) {
    var _this$$doc2;
    return ((_this$$doc2 = this.$doc) === null || _this$$doc2 === void 0 ? void 0 : _this$$doc2.querySelectorAll(selector, attributes)) || null;
  }
  $pos(pos) {
    const $pos = this.state.doc.resolve(pos);
    const node = pos > 0 && $pos.nodeAfter && !$pos.nodeAfter.isText && $pos.nodeAfter.isAtom ? $pos.nodeAfter : null;
    return new NodePos($pos, this, false, node);
  }
  get $doc() {
    return this.$pos(0);
  }
};
var Node3 = class Node4 extends Extendable {
  constructor(..._args) {
    super(..._args);
    this.type = "node";
  }
  /**
  * Create a new Node instance
  * @param config - Node configuration object or a function that returns a configuration object
  */
  static create(config = {}) {
    const resolvedConfig = typeof config === "function" ? config() : config;
    return new Node4(resolvedConfig);
  }
  configure(options) {
    return super.configure(options);
  }
  extend(extendedConfig) {
    const resolvedConfig = typeof extendedConfig === "function" ? extendedConfig() : extendedConfig;
    return super.extend(resolvedConfig);
  }
};
var NodeView = class {
  constructor(component, props, options) {
    this.isDragging = false;
    this.component = component;
    this.editor = props.editor;
    this.options = {
      stopEvent: null,
      ignoreMutation: null,
      ...options
    };
    this.extension = props.extension;
    this.node = props.node;
    this.decorations = props.decorations;
    this.innerDecorations = props.innerDecorations;
    this.view = props.view;
    this.HTMLAttributes = props.HTMLAttributes;
    this.getPos = () => {
      try {
        return props.getPos();
      } catch {
        return;
      }
    };
    this.mount();
  }
  mount() {
  }
  get dom() {
    return this.editor.view.dom;
  }
  get contentDOM() {
    return null;
  }
  onDragStart(event) {
    var _target$parentElement, _this$contentDOM;
    const { view } = this.editor;
    const target = event.target;
    const dragHandle = target.nodeType === 3 ? (_target$parentElement = target.parentElement) === null || _target$parentElement === void 0 ? void 0 : _target$parentElement.closest("[data-drag-handle]") : target.closest("[data-drag-handle]");
    if (!this.dom || ((_this$contentDOM = this.contentDOM) === null || _this$contentDOM === void 0 ? void 0 : _this$contentDOM.contains(target)) || !dragHandle) return;
    let x = 0;
    let y = 0;
    if (this.dom !== dragHandle) {
      var _event$offsetX, _nativeEvent, _event$offsetY, _nativeEvent2;
      const domBox = this.dom.getBoundingClientRect();
      const handleBox = dragHandle.getBoundingClientRect();
      const offsetX = (_event$offsetX = event.offsetX) !== null && _event$offsetX !== void 0 ? _event$offsetX : (_nativeEvent = event.nativeEvent) === null || _nativeEvent === void 0 ? void 0 : _nativeEvent.offsetX;
      const offsetY = (_event$offsetY = event.offsetY) !== null && _event$offsetY !== void 0 ? _event$offsetY : (_nativeEvent2 = event.nativeEvent) === null || _nativeEvent2 === void 0 ? void 0 : _nativeEvent2.offsetY;
      x = handleBox.x - domBox.x + offsetX;
      y = handleBox.y - domBox.y + offsetY;
    }
    const clonedNode = this.dom.cloneNode(true);
    try {
      const domBox = this.dom.getBoundingClientRect();
      clonedNode.style.width = `${Math.round(domBox.width)}px`;
      clonedNode.style.height = `${Math.round(domBox.height)}px`;
      clonedNode.style.boxSizing = "border-box";
      clonedNode.style.pointerEvents = "none";
    } catch {
    }
    let dragImageWrapper = null;
    try {
      var _event$dataTransfer;
      dragImageWrapper = document.createElement("div");
      dragImageWrapper.style.position = "absolute";
      dragImageWrapper.style.top = "-9999px";
      dragImageWrapper.style.left = "-9999px";
      dragImageWrapper.style.pointerEvents = "none";
      dragImageWrapper.appendChild(clonedNode);
      document.body.appendChild(dragImageWrapper);
      (_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 || _event$dataTransfer.setDragImage(clonedNode, x, y);
    } finally {
      if (dragImageWrapper) setTimeout(() => {
        try {
          dragImageWrapper === null || dragImageWrapper === void 0 || dragImageWrapper.remove();
        } catch {
        }
      }, 0);
    }
    const pos = this.getPos();
    if (typeof pos !== "number") return;
    const selection = NodeSelection.create(view.state.doc, pos);
    const transaction = view.state.tr.setSelection(selection);
    view.dispatch(transaction);
  }
  stopEvent(event) {
    var _this$contentDOM2;
    if (!this.dom) return false;
    if (typeof this.options.stopEvent === "function") return this.options.stopEvent({ event });
    const target = event.target;
    if (!(this.dom.contains(target) && !((_this$contentDOM2 = this.contentDOM) === null || _this$contentDOM2 === void 0 ? void 0 : _this$contentDOM2.contains(target)))) return false;
    const isDragEvent = event.type.startsWith("drag");
    const isDragOverEnterEvent = event.type === "dragover" || event.type === "dragenter";
    const isDropEvent = event.type === "drop";
    if (([
      "INPUT",
      "BUTTON",
      "SELECT",
      "TEXTAREA"
    ].includes(target.tagName) || target.isContentEditable) && !isDropEvent && !isDragEvent) return true;
    const { isEditable } = this.editor;
    const { isDragging } = this;
    const isDraggable = !!this.node.type.spec.draggable;
    const isSelectable = NodeSelection.isSelectable(this.node);
    const isCopyEvent = event.type === "copy";
    const isPasteEvent = event.type === "paste";
    const isCutEvent = event.type === "cut";
    const isClickEvent = event.type === "mousedown";
    if (!isDraggable && isSelectable && isDragEvent && event.target === this.dom) event.preventDefault();
    if (isDraggable && isDragEvent && !isDragging && event.target === this.dom) {
      event.preventDefault();
      return false;
    }
    if (isDraggable && isEditable && !isDragging && isClickEvent) {
      const dragHandle = target.closest("[data-drag-handle]");
      if (dragHandle && (this.dom === dragHandle || this.dom.contains(dragHandle))) {
        this.isDragging = true;
        document.addEventListener("dragend", () => {
          this.isDragging = false;
        }, { once: true });
        document.addEventListener("drop", () => {
          this.isDragging = false;
        }, { once: true });
        document.addEventListener("mouseup", () => {
          this.isDragging = false;
        }, { once: true });
      }
    }
    if (isDragging || isDragOverEnterEvent || isDropEvent || isCopyEvent || isPasteEvent || isCutEvent || isClickEvent && isSelectable) return false;
    return true;
  }
  /**
  * Called when a DOM [mutation](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) or a selection change happens within the view.
  * @return `false` if the editor should re-read the selection or re-parse the range around the mutation
  * @return `true` if it can safely be ignored.
  */
  ignoreMutation(mutation) {
    if (!this.dom) return true;
    if (!this.contentDOM) return mutation.type !== "selection";
    if (typeof this.options.ignoreMutation === "function") return this.options.ignoreMutation({ mutation });
    if (this.node.isLeaf || this.node.isAtom) return true;
    if (mutation.type === "selection") return false;
    if (this.contentDOM.contains(mutation.target) && mutation.type === "childList" && (isiOS() || isAndroid()) && this.editor.isFocused) {
      if ([...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].every((node) => node.isContentEditable)) return false;
    }
    if (this.contentDOM === mutation.target && mutation.type === "attributes") return true;
    if (this.contentDOM.contains(mutation.target)) return false;
    return true;
  }
  /**
  * Update the attributes of the prosemirror node.
  */
  updateAttributes(attributes) {
    this.editor.commands.command(({ tr }) => {
      const pos = this.getPos();
      if (typeof pos !== "number") return false;
      tr.setNodeMarkup(pos, void 0, {
        ...this.node.attrs,
        ...attributes
      });
      return true;
    });
  }
  /**
  * Delete the node.
  */
  deleteNode() {
    const from2 = this.getPos();
    if (typeof from2 !== "number") return;
    const to = from2 + this.node.nodeSize;
    this.editor.commands.deleteRange({
      from: from2,
      to
    });
  }
};

// node_modules/.pnpm/@tiptap+react@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm_lohxrbqxtwg33brminwnmd7kcm/node_modules/@tiptap/react/dist/index.js
import { Fragment as Fragment2, jsx, jsxs } from "react/jsx-runtime";

// node_modules/.pnpm/fast-equals@5.4.5/node_modules/fast-equals/dist/es/index.mjs
var { getOwnPropertyNames, getOwnPropertySymbols } = Object;
var { hasOwnProperty } = Object.prototype;
function combineComparators(comparatorA, comparatorB) {
  return function isEqual(a, b, state) {
    return comparatorA(a, b, state) && comparatorB(a, b, state);
  };
}
function createIsCircular(areItemsEqual) {
  return function isCircular(a, b, state) {
    if (!a || !b || typeof a !== "object" || typeof b !== "object") {
      return areItemsEqual(a, b, state);
    }
    const { cache } = state;
    const cachedA = cache.get(a);
    const cachedB = cache.get(b);
    if (cachedA && cachedB) {
      return cachedA === b && cachedB === a;
    }
    cache.set(a, b);
    cache.set(b, a);
    const result = areItemsEqual(a, b, state);
    cache.delete(a);
    cache.delete(b);
    return result;
  };
}
function getShortTag(value) {
  return value != null ? value[Symbol.toStringTag] : void 0;
}
function getStrictProperties(object) {
  return getOwnPropertyNames(object).concat(getOwnPropertySymbols(object));
}
var hasOwn = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  Object.hasOwn || ((object, property) => hasOwnProperty.call(object, property))
);
function sameValueZeroEqual(a, b) {
  return a === b || !a && !b && a !== a && b !== b;
}
var PREACT_VNODE = "__v";
var PREACT_OWNER = "__o";
var REACT_OWNER = "_owner";
var MAX_SCANNED_PROPERTIES = 64;
var { getOwnPropertyDescriptor, keys: keys2 } = Object;
var { propertyIsEnumerable } = Object.prototype;
var getTypedArrayTag = getOwnPropertyDescriptor(Object.getPrototypeOf(Int8Array.prototype), Symbol.toStringTag).get;
function areArrayBuffersEqual(a, b) {
  return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a), new Uint8Array(b));
}
function areArraysEqual(a, b, state) {
  let index = a.length;
  if (b.length !== index) {
    return false;
  }
  while (index-- > 0) {
    if (!state.equals(a[index], b[index], index, index, a, b, state)) {
      return false;
    }
  }
  return true;
}
function areDataViewsEqual(a, b) {
  return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
}
function areDatesEqual(a, b) {
  return sameValueZeroEqual(a.getTime(), b.getTime());
}
function areErrorsEqual(a, b, state) {
  if (a.name !== b.name || a.message !== b.message || a.stack !== b.stack) {
    return false;
  }
  const causeA = a.cause;
  const causeB = b.cause;
  if (causeA !== causeB && !state.equals(causeA, causeB, "cause", "cause", a, b, state)) {
    return false;
  }
  const errorsA = a.errors;
  const errorsB = b.errors;
  if (errorsA !== errorsB && !state.equals(errorsA, errorsB, "errors", "errors", a, b, state)) {
    return false;
  }
  const propertiesA = keys2(a);
  const propertiesB = keys2(b);
  let index = propertiesA.length;
  if (!index && !propertiesB.length) {
    return true;
  }
  let compared = 0;
  let property;
  while (index-- > 0) {
    property = propertiesA[index];
    if (property === "cause" || property === "errors") {
      continue;
    }
    if (property !== propertiesB[index] && !propertyIsEnumerable.call(b, property) || !state.equals(a[property], b[property], property, property, a, b, state)) {
      return false;
    }
    ++compared;
  }
  const remaining = propertiesB.length - compared;
  return !remaining || remaining === (propertyIsEnumerable.call(b, "cause") ? 1 : 0) + (propertyIsEnumerable.call(b, "errors") ? 1 : 0);
}
function areFunctionsEqual(a, b) {
  return a === b;
}
function areErrorsEqualStrict(a, b, state) {
  return a.name === b.name && a.message === b.message && a.stack === b.stack && areObjectsEqualStrict(a, b, state);
}
function areMapsEqual(a, b, state) {
  const size3 = a.size;
  if (size3 !== b.size) {
    return false;
  }
  if (!size3) {
    return true;
  }
  const matchedIndices = new Array(size3);
  const aIterable = a.entries();
  let aResult;
  let bResult;
  let index = 0;
  while (aResult = aIterable.next()) {
    if (aResult.done) {
      break;
    }
    const bIterable = b.entries();
    let hasMatch = false;
    let matchIndex = 0;
    while (bResult = bIterable.next()) {
      if (bResult.done) {
        break;
      }
      if (matchedIndices[matchIndex]) {
        matchIndex++;
        continue;
      }
      const aEntry = aResult.value;
      const bEntry = bResult.value;
      if (state.equals(aEntry[0], bEntry[0], index, matchIndex, a, b, state) && state.equals(aEntry[1], bEntry[1], aEntry[0], bEntry[0], a, b, state)) {
        hasMatch = matchedIndices[matchIndex] = true;
        break;
      }
      matchIndex++;
    }
    if (!hasMatch) {
      return false;
    }
    index++;
  }
  return true;
}
var areNumbersEqual = sameValueZeroEqual;
function areObjectsEqual(a, b, state) {
  const properties = keys2(a);
  const propertiesB = keys2(b);
  let index = properties.length;
  if (propertiesB.length !== index) {
    return false;
  }
  const isScannable = index <= MAX_SCANNED_PROPERTIES;
  let property;
  while (index-- > 0) {
    property = properties[index];
    if (isReactProperty(a, b, property)) {
      continue;
    }
    if (property !== propertiesB[index] && !(isScannable ? propertiesB.includes(property) : propertyIsEnumerable.call(b, property)) || !state.equals(a[property], b[property], property, property, a, b, state)) {
      return false;
    }
  }
  return true;
}
function areObjectsEqualStrict(a, b, state) {
  const properties = getStrictProperties(a);
  let index = properties.length;
  if (getStrictProperties(b).length !== index) {
    return false;
  }
  let property;
  let descriptorA;
  let descriptorB;
  while (index-- > 0) {
    property = properties[index];
    if (!isReactProperty(a, b, property) && (!hasOwn(b, property) || !state.equals(a[property], b[property], property, property, a, b, state))) {
      return false;
    }
    descriptorA = getOwnPropertyDescriptor(a, property);
    descriptorB = getOwnPropertyDescriptor(b, property);
    if ((descriptorA || descriptorB) && (!descriptorA || !descriptorB || descriptorA.configurable !== descriptorB.configurable || descriptorA.enumerable !== descriptorB.enumerable || descriptorA.writable !== descriptorB.writable)) {
      return false;
    }
  }
  return true;
}
function arePrimitiveWrappersEqual(a, b) {
  return sameValueZeroEqual(a.valueOf(), b.valueOf());
}
function areRegExpsEqual(a, b) {
  return a.source === b.source && a.flags === b.flags;
}
function areSetsEqual(a, b, state) {
  const size3 = a.size;
  if (size3 !== b.size) {
    return false;
  }
  if (!size3) {
    return true;
  }
  const matchedIndices = new Array(size3);
  const aIterable = a.values();
  let aResult;
  let bResult;
  while (aResult = aIterable.next()) {
    if (aResult.done) {
      break;
    }
    const bIterable = b.values();
    let hasMatch = false;
    let matchIndex = 0;
    while (bResult = bIterable.next()) {
      if (bResult.done) {
        break;
      }
      if (!matchedIndices[matchIndex] && state.equals(aResult.value, bResult.value, aResult.value, bResult.value, a, b, state)) {
        hasMatch = matchedIndices[matchIndex] = true;
        break;
      }
      matchIndex++;
    }
    if (!hasMatch) {
      return false;
    }
  }
  return true;
}
function areTypedArraysEqual(a, b) {
  let index = a.length;
  if (b.length !== index || a.byteOffset !== b.byteOffset) {
    return false;
  }
  const tag = getTypedArrayTag.call(a);
  if (tag === "Float64Array" || tag === "Float32Array" || tag === "Float16Array") {
    while (index-- > 0) {
      if (a[index] !== b[index] && (a[index] === a[index] || b[index] === b[index])) {
        return false;
      }
    }
    return true;
  }
  while (index-- > 0) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}
function areUrlsEqual(a, b) {
  if (a.href === b.href) {
    return true;
  }
  return a.protocol === b.protocol && a.username === b.username && a.password === b.password && a.host === b.host && a.pathname === b.pathname && a.hash === b.hash && areSearchParamsEqual(a.searchParams, b.searchParams);
}
function areSearchParamsEqual(a, b) {
  const serializedA = a.toString();
  const serializedB = b.toString();
  return serializedA === serializedB || sortSearchParams(serializedA) === sortSearchParams(serializedB);
}
function sortSearchParams(serialized) {
  return serialized.split("&").sort().join("&");
}
function isReactProperty(a, b, property) {
  return (property === REACT_OWNER || property === PREACT_OWNER || property === PREACT_VNODE) && !!(a.$$typeof || b.$$typeof);
}
var ARRAY_BUFFER_TAG = "[object ArrayBuffer]";
var ARGUMENTS_TAG = "[object Arguments]";
var BOOLEAN_TAG = "[object Boolean]";
var DATA_VIEW_TAG = "[object DataView]";
var DATE_TAG = "[object Date]";
var ERROR_TAG = "[object Error]";
var MAP_TAG = "[object Map]";
var NUMBER_TAG = "[object Number]";
var OBJECT_TAG = "[object Object]";
var REG_EXP_TAG = "[object RegExp]";
var SET_TAG = "[object Set]";
var STRING_TAG = "[object String]";
var TYPED_ARRAY_TAGS = {
  "[object Int8Array]": true,
  "[object Uint8Array]": true,
  "[object Uint8ClampedArray]": true,
  "[object Int16Array]": true,
  "[object Uint16Array]": true,
  "[object Int32Array]": true,
  "[object Uint32Array]": true,
  "[object Float16Array]": true,
  "[object Float32Array]": true,
  "[object Float64Array]": true,
  "[object BigInt64Array]": true,
  "[object BigUint64Array]": true
};
var URL_TAG = "[object URL]";
var toString = Object.prototype.toString;
function createEqualityComparator({ areArrayBuffersEqual: areArrayBuffersEqual2, areArraysEqual: areArraysEqual2, areDataViewsEqual: areDataViewsEqual2, areDatesEqual: areDatesEqual2, areErrorsEqual: areErrorsEqual2, areFunctionsEqual: areFunctionsEqual2, areMapsEqual: areMapsEqual2, areNumbersEqual: areNumbersEqual2, areObjectsEqual: areObjectsEqual2, arePrimitiveWrappersEqual: arePrimitiveWrappersEqual2, areRegExpsEqual: areRegExpsEqual2, areSetsEqual: areSetsEqual2, areTypedArraysEqual: areTypedArraysEqual2, areUrlsEqual: areUrlsEqual2, unknownTagComparators }) {
  return function comparator(a, b, state) {
    if (a === b) {
      return true;
    }
    if (a == null || b == null) {
      return false;
    }
    const type = typeof a;
    if (type !== typeof b) {
      return false;
    }
    if (type !== "object") {
      if (type === "number") {
        return areNumbersEqual2(a, b, state);
      }
      if (type === "function") {
        return areFunctionsEqual2(a, b, state);
      }
      return false;
    }
    const constructor = a.constructor;
    if (constructor !== b.constructor) {
      return false;
    }
    if (constructor === Object) {
      return areObjectsEqual2(a, b, state);
    }
    if (Array.isArray(a)) {
      return areArraysEqual2(a, b, state);
    }
    if (constructor === Date) {
      return areDatesEqual2(a, b, state);
    }
    if (constructor === RegExp) {
      return areRegExpsEqual2(a, b, state);
    }
    if (constructor === Map) {
      return areMapsEqual2(a, b, state);
    }
    if (constructor === Set) {
      return areSetsEqual2(a, b, state);
    }
    if (constructor == null) {
      return areObjectsEqual2(a, b, state);
    }
    const tag = toString.call(a);
    if (tag === DATE_TAG) {
      return areDatesEqual2(a, b, state);
    }
    if (tag === REG_EXP_TAG) {
      return areRegExpsEqual2(a, b, state);
    }
    if (tag === MAP_TAG) {
      return areMapsEqual2(a, b, state);
    }
    if (tag === SET_TAG) {
      return areSetsEqual2(a, b, state);
    }
    if (tag === OBJECT_TAG) {
      return typeof a.then !== "function" && typeof b.then !== "function" && areObjectsEqual2(a, b, state);
    }
    if (tag === URL_TAG) {
      return areUrlsEqual2(a, b, state);
    }
    if (tag === ERROR_TAG) {
      return areErrorsEqual2(a, b, state);
    }
    if (tag === ARGUMENTS_TAG) {
      return areObjectsEqual2(a, b, state);
    }
    if (TYPED_ARRAY_TAGS[tag]) {
      return areTypedArraysEqual2(a, b, state);
    }
    if (tag === ARRAY_BUFFER_TAG) {
      return areArrayBuffersEqual2(a, b, state);
    }
    if (tag === DATA_VIEW_TAG) {
      return areDataViewsEqual2(a, b, state);
    }
    if (tag === BOOLEAN_TAG || tag === NUMBER_TAG || tag === STRING_TAG) {
      return arePrimitiveWrappersEqual2(a, b, state);
    }
    if (unknownTagComparators) {
      let unknownTagComparator = unknownTagComparators[tag];
      if (!unknownTagComparator) {
        const shortTag = getShortTag(a);
        if (shortTag) {
          unknownTagComparator = unknownTagComparators[shortTag];
        }
      }
      if (unknownTagComparator) {
        return unknownTagComparator(a, b, state);
      }
    }
    return false;
  };
}
function createEqualityComparatorConfig({ circular, createCustomConfig, strict }) {
  let config = {
    areArrayBuffersEqual,
    areArraysEqual: strict ? areObjectsEqualStrict : areArraysEqual,
    areDataViewsEqual,
    areDatesEqual,
    // `name` / `message` / `stack` / `cause` / `errors` are not enumerable (unless assigned), which is why
    // errors need a comparator of their own rather than being treated as plain objects. Each variant also
    // compares the own properties that `Error` subclasses routinely carry (`status`, `code`, ...):
    // enumerable ones in loose mode, and all of them (via `areObjectsEqualStrict`) in strict mode.
    areErrorsEqual: strict ? areErrorsEqualStrict : areErrorsEqual,
    areFunctionsEqual,
    areMapsEqual: strict ? combineComparators(areMapsEqual, areObjectsEqualStrict) : areMapsEqual,
    areNumbersEqual,
    areObjectsEqual: strict ? areObjectsEqualStrict : areObjectsEqual,
    arePrimitiveWrappersEqual,
    areRegExpsEqual,
    areSetsEqual: strict ? combineComparators(areSetsEqual, areObjectsEqualStrict) : areSetsEqual,
    areTypedArraysEqual: strict ? combineComparators(areTypedArraysEqual, areObjectsEqualStrict) : areTypedArraysEqual,
    areUrlsEqual,
    unknownTagComparators: void 0
  };
  if (createCustomConfig) {
    config = Object.assign({}, config, createCustomConfig(config));
  }
  if (circular) {
    const areArraysEqual2 = createIsCircular(config.areArraysEqual);
    const areErrorsEqual2 = createIsCircular(config.areErrorsEqual);
    const areMapsEqual2 = createIsCircular(config.areMapsEqual);
    const areObjectsEqual2 = createIsCircular(config.areObjectsEqual);
    const areSetsEqual2 = createIsCircular(config.areSetsEqual);
    config = Object.assign({}, config, {
      areArraysEqual: areArraysEqual2,
      areErrorsEqual: areErrorsEqual2,
      areMapsEqual: areMapsEqual2,
      areObjectsEqual: areObjectsEqual2,
      areSetsEqual: areSetsEqual2
    });
  }
  return config;
}
function createInternalEqualityComparator(compare) {
  return function(a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, state) {
    return compare(a, b, state);
  };
}
function createIsEqual({ circular, comparator, createState, equals, strict }) {
  if (createState) {
    return function isEqual(a, b) {
      const { cache = circular ? /* @__PURE__ */ new WeakMap() : void 0, meta } = createState();
      return comparator(a, b, {
        cache,
        equals,
        meta,
        strict
      });
    };
  }
  if (circular) {
    return function isEqual(a, b) {
      return comparator(a, b, {
        cache: /* @__PURE__ */ new WeakMap(),
        equals,
        meta: void 0,
        strict
      });
    };
  }
  const state = {
    cache: void 0,
    equals,
    meta: void 0,
    strict
  };
  return function isEqual(a, b) {
    return comparator(a, b, state);
  };
}
var deepEqual = createCustomEqual();
var strictDeepEqual = createCustomEqual({ strict: true });
var circularDeepEqual = createCustomEqual({ circular: true });
var strictCircularDeepEqual = createCustomEqual({
  circular: true,
  strict: true
});
var shallowEqual = createCustomEqual({
  createInternalComparator: () => sameValueZeroEqual
});
var strictShallowEqual = createCustomEqual({
  strict: true,
  createInternalComparator: () => sameValueZeroEqual
});
var circularShallowEqual = createCustomEqual({
  circular: true,
  createInternalComparator: () => sameValueZeroEqual
});
var strictCircularShallowEqual = createCustomEqual({
  circular: true,
  createInternalComparator: () => sameValueZeroEqual,
  strict: true
});
function createCustomEqual(options = {}) {
  const { circular = false, createInternalComparator: createCustomInternalComparator, createState, strict = false } = options;
  const config = createEqualityComparatorConfig(options);
  const comparator = createEqualityComparator(config);
  const equals = createCustomInternalComparator ? createCustomInternalComparator(comparator) : createInternalEqualityComparator(comparator);
  return createIsEqual({ circular, comparator, createState, equals, strict });
}

// src/shims/use-sync-external-store-with-selector.ts
import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore as useSyncExternalStore2 } from "react";
function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  const instRef = useRef(null);
  let inst;
  if (instRef.current === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else {
    inst = instRef.current;
  }
  const [getSelection2, getServerSelection] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot;
    let memoizedSelection;
    const memoizedSelector = (nextSnapshot) => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection2 = selector(nextSnapshot);
        if (isEqual !== void 0 && inst.hasValue) {
          const currentSelection = inst.value;
          if (isEqual(currentSelection, nextSelection2)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }
        memoizedSelection = nextSelection2;
        return nextSelection2;
      }
      const prevSnapshot = memoizedSnapshot;
      const prevSelection = memoizedSelection;
      if (Object.is(prevSnapshot, nextSnapshot)) {
        return prevSelection;
      }
      const nextSelection = selector(nextSnapshot);
      if (isEqual !== void 0 && isEqual(prevSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return prevSelection;
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };
    const maybeGetServerSnapshot = getServerSnapshot === void 0 ? null : getServerSnapshot;
    const getSnapshotWithSelector = () => memoizedSelector(getSnapshot());
    const getServerSnapshotWithSelector = maybeGetServerSnapshot === null ? void 0 : () => memoizedSelector(maybeGetServerSnapshot());
    return [getSnapshotWithSelector, getServerSnapshotWithSelector];
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);
  const value = useSyncExternalStore2(subscribe, getSelection2, getServerSelection);
  useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [inst, value]);
  useDebugValue(value);
  return value;
}

// node_modules/.pnpm/@tiptap+react@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm_lohxrbqxtwg33brminwnmd7kcm/node_modules/@tiptap/react/dist/index.js
function handleMobileEnter(editor, event) {
  var _root$getSelection, _root$getSelection2;
  if (editor.isDestroyed || event.defaultPrevented || !event.cancelable || !editor.isEditable || event.inputType !== "insertParagraph" && event.inputType !== "insertLineBreak" || !isiOS() && !isAndroid()) return;
  const view = editor.view;
  const root = view.root;
  const selection = (_root$getSelection = (_root$getSelection2 = root.getSelection) === null || _root$getSelection2 === void 0 ? void 0 : _root$getSelection2.call(root)) !== null && _root$getSelection !== void 0 ? _root$getSelection : view.dom.ownerDocument.getSelection();
  const anchor = selection === null || selection === void 0 ? void 0 : selection.anchorNode;
  const element = (anchor === null || anchor === void 0 ? void 0 : anchor.nodeType) === 1 ? anchor : anchor === null || anchor === void 0 ? void 0 : anchor.parentElement;
  const contentDOM = element === null || element === void 0 ? void 0 : element.closest("[data-node-view-content-react]");
  if (!contentDOM || !view.dom.contains(contentDOM)) return;
  const lastKeyCode = view.input.lastKeyCode;
  if (lastKeyCode === 13) view.input.lastKeyCode = null;
  view.domObserver.forceFlush();
  view.domObserver.flush();
  const keyEvent2 = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    shiftKey: event.inputType === "insertLineBreak",
    bubbles: true,
    cancelable: true
  });
  if (view.someProp("handleKeyDown", (handleKeyDown3) => handleKeyDown3(view, keyEvent2))) {
    event.preventDefault();
    view.input.lastIOSEnter = 0;
    clearTimeout(view.input.lastIOSEnterFallbackTimeout);
  } else if (lastKeyCode === 13) view.input.lastKeyCode = lastKeyCode;
}
var mobileEnterPluginKey = new PluginKey("reactMobileEnter");
var mergeRefs = (...refs) => {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    });
  };
};
var Portals = ({ contentComponent }) => {
  const renderers = useSyncExternalStore(contentComponent.subscribe, contentComponent.getSnapshot, contentComponent.getServerSnapshot);
  return /* @__PURE__ */ jsx(Fragment2, { children: Object.values(renderers) });
};
function createContentComponent() {
  const subscribers = /* @__PURE__ */ new Set();
  let renderers = {};
  let isNotificationQueued = false;
  const notifySubscribers = () => {
    if (isNotificationQueued || !subscribers.size) return;
    isNotificationQueued = true;
    queueMicrotask(() => {
      isNotificationQueued = false;
      subscribers.forEach((subscriber) => subscriber());
    });
  };
  return {
    /**
    * Subscribe to the editor instance's changes.
    */
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getSnapshot() {
      return renderers;
    },
    getServerSnapshot() {
      return renderers;
    },
    /**
    * Adds a new NodeView Renderer to the editor.
    */
    setRenderer(id, renderer) {
      renderers = {
        ...renderers,
        [id]: ReactDOM.createPortal(renderer.reactElement, renderer.element, id)
      };
      notifySubscribers();
    },
    /**
    * Removes a NodeView Renderer from the editor.
    */
    removeRenderer(id) {
      const nextRenderers = { ...renderers };
      delete nextRenderers[id];
      renderers = nextRenderers;
      notifySubscribers();
    }
  };
}
var PureEditorContent = class extends React.Component {
  constructor(props) {
    super(props);
    this.editorContentRef = React.createRef();
  }
  componentDidMount() {
    this.init();
  }
  componentDidUpdate() {
    this.init();
  }
  init() {
    var _editor$view$dom;
    const editor = this.props.editor;
    if (editor && !editor.isDestroyed && ((_editor$view$dom = editor.view.dom) === null || _editor$view$dom === void 0 ? void 0 : _editor$view$dom.parentNode)) {
      if (editor.contentComponent) return;
      const element = this.editorContentRef.current;
      element.append(...editor.view.dom.parentNode.childNodes);
      editor.setOptions({ element });
      editor.contentComponent = createContentComponent();
      editor.createNodeViews();
      editor.registerPlugin(new Plugin({
        key: mobileEnterPluginKey,
        props: { handleDOMEvents: { beforeinput: (_view, event) => handleMobileEnter(editor, event) } }
      }));
      editor.isEditorContentInitialized = true;
      this.forceUpdate();
    }
  }
  componentWillUnmount() {
    const editor = this.props.editor;
    if (!editor) return;
    editor.isEditorContentInitialized = false;
    if (!editor.isDestroyed) {
      editor.unregisterPlugin(mobileEnterPluginKey);
      editor.view.setProps({ nodeViews: {} });
    }
    editor.contentComponent = null;
    try {
      var _editor$view$dom2;
      if (!((_editor$view$dom2 = editor.view.dom) === null || _editor$view$dom2 === void 0 ? void 0 : _editor$view$dom2.parentNode)) return;
      const newElement = document.createElement("div");
      newElement.append(...editor.view.dom.parentNode.childNodes);
      editor.setOptions({ element: newElement });
    } catch {
    }
  }
  render() {
    const { editor, innerRef, ...rest } = this.props;
    return /* @__PURE__ */ jsxs(Fragment2, { children: [/* @__PURE__ */ jsx("div", {
      ref: mergeRefs(innerRef, this.editorContentRef),
      ...rest
    }), (editor === null || editor === void 0 ? void 0 : editor.contentComponent) && /* @__PURE__ */ jsx(Portals, { contentComponent: editor.contentComponent })] });
  }
};
var EditorContentWithKey = forwardRef((props, ref) => {
  const key = React.useMemo(() => {
    return Math.floor(Math.random() * 4294967295).toString();
  }, [props.editor]);
  return React.createElement(PureEditorContent, {
    key,
    innerRef: ref,
    ...props
  });
});
var EditorContent = React.memo(EditorContentWithKey);
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect2;
var EditorStateManager = class {
  constructor(initialEditor) {
    this.transactionNumber = 0;
    this.lastTransactionNumber = 0;
    this.subscribers = /* @__PURE__ */ new Set();
    this.editor = initialEditor;
    this.lastSnapshot = {
      editor: initialEditor,
      transactionNumber: 0
    };
    this.getSnapshot = this.getSnapshot.bind(this);
    this.getServerSnapshot = this.getServerSnapshot.bind(this);
    this.watch = this.watch.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }
  /**
  * Get the current editor instance.
  */
  getSnapshot() {
    if (this.transactionNumber === this.lastTransactionNumber) return this.lastSnapshot;
    this.lastTransactionNumber = this.transactionNumber;
    this.lastSnapshot = {
      editor: this.editor,
      transactionNumber: this.transactionNumber
    };
    return this.lastSnapshot;
  }
  /**
  * Always disable the editor on the server-side.
  */
  getServerSnapshot() {
    return {
      editor: null,
      transactionNumber: 0
    };
  }
  /**
  * Subscribe to the editor instance's changes.
  */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
  /**
  * Watch the editor instance for changes.
  */
  watch(nextEditor) {
    this.editor = nextEditor;
    if (this.editor) {
      let lastTransaction;
      const fn = (props) => {
        if ((props === null || props === void 0 ? void 0 : props.transaction) !== void 0 && props.transaction === lastTransaction) return;
        lastTransaction = props === null || props === void 0 ? void 0 : props.transaction;
        this.transactionNumber += 1;
        this.subscribers.forEach((callback) => callback());
      };
      const currentEditor = this.editor;
      currentEditor.on("transaction", fn);
      currentEditor.on("update", fn);
      return () => {
        currentEditor.off("transaction", fn);
        currentEditor.off("update", fn);
      };
    }
  }
};
function useEditorState(options) {
  var _options$equalityFn;
  const [editorStateManager] = useState(() => new EditorStateManager(options.editor));
  const selectedState = useSyncExternalStoreWithSelector(editorStateManager.subscribe, editorStateManager.getSnapshot, editorStateManager.getServerSnapshot, options.selector, (_options$equalityFn = options.equalityFn) !== null && _options$equalityFn !== void 0 ? _options$equalityFn : circularDeepEqual);
  useIsomorphicLayoutEffect(() => {
    return editorStateManager.watch(options.editor);
  }, [options.editor, editorStateManager]);
  useDebugValue2(selectedState);
  return selectedState;
}
var isDev2 = true;
var isSSR = typeof window === "undefined";
var isNext = isSSR || Boolean(typeof window !== "undefined" && window.next);
var EditorInstanceManager = class EditorInstanceManager2 {
  constructor(options) {
    this.editor = null;
    this.subscriptions = /* @__PURE__ */ new Set();
    this.isComponentMounted = false;
    this.previousDeps = null;
    this.instanceId = "";
    this.options = options;
    this.subscriptions = /* @__PURE__ */ new Set();
    this.setEditor(this.getInitialEditor());
    this.scheduleDestroy();
    this.getEditor = this.getEditor.bind(this);
    this.getServerSnapshot = this.getServerSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.refreshEditorInstance = this.refreshEditorInstance.bind(this);
    this.scheduleDestroy = this.scheduleDestroy.bind(this);
    this.onRender = this.onRender.bind(this);
    this.createEditor = this.createEditor.bind(this);
  }
  setEditor(editor) {
    this.editor = editor;
    this.instanceId = Math.random().toString(36).slice(2, 9);
    this.subscriptions.forEach((cb) => cb());
  }
  getInitialEditor() {
    const explicit = this.options.current.immediatelyRender;
    let immediatelyRender = explicit !== null && explicit !== void 0 ? explicit : true;
    if (isSSR) {
      if (immediatelyRender && isDev2) console.warn("SSR detected. `immediatelyRender` has been set to false to avoid hydration mismatches");
      immediatelyRender = false;
    } else if (isNext && explicit === void 0) {
      immediatelyRender = false;
      if (isDev2) console.warn("Next.js detected. `immediatelyRender` defaults to false to avoid hydration mismatches. Pass `immediatelyRender: true` explicitly if you are rendering the editor only on the client.");
    }
    return immediatelyRender ? this.createEditor() : null;
  }
  /**
  * Create a new editor instance. And attach event listeners.
  */
  createEditor() {
    const optionsToApply = {
      ...this.options.current,
      onBeforeCreate: (...args) => {
        var _this$options$current, _this$options$current2;
        return (_this$options$current = (_this$options$current2 = this.options.current).onBeforeCreate) === null || _this$options$current === void 0 ? void 0 : _this$options$current.call(_this$options$current2, ...args);
      },
      onBlur: (...args) => {
        var _this$options$current3, _this$options$current4;
        return (_this$options$current3 = (_this$options$current4 = this.options.current).onBlur) === null || _this$options$current3 === void 0 ? void 0 : _this$options$current3.call(_this$options$current4, ...args);
      },
      onCreate: (...args) => {
        var _this$options$current5, _this$options$current6;
        return (_this$options$current5 = (_this$options$current6 = this.options.current).onCreate) === null || _this$options$current5 === void 0 ? void 0 : _this$options$current5.call(_this$options$current6, ...args);
      },
      onDestroy: (...args) => {
        var _this$options$current7, _this$options$current8;
        return (_this$options$current7 = (_this$options$current8 = this.options.current).onDestroy) === null || _this$options$current7 === void 0 ? void 0 : _this$options$current7.call(_this$options$current8, ...args);
      },
      onFocus: (...args) => {
        var _this$options$current9, _this$options$current10;
        return (_this$options$current9 = (_this$options$current10 = this.options.current).onFocus) === null || _this$options$current9 === void 0 ? void 0 : _this$options$current9.call(_this$options$current10, ...args);
      },
      onSelectionUpdate: (...args) => {
        var _this$options$current11, _this$options$current12;
        return (_this$options$current11 = (_this$options$current12 = this.options.current).onSelectionUpdate) === null || _this$options$current11 === void 0 ? void 0 : _this$options$current11.call(_this$options$current12, ...args);
      },
      onTransaction: (...args) => {
        var _this$options$current13, _this$options$current14;
        return (_this$options$current13 = (_this$options$current14 = this.options.current).onTransaction) === null || _this$options$current13 === void 0 ? void 0 : _this$options$current13.call(_this$options$current14, ...args);
      },
      onUpdate: (...args) => {
        var _this$options$current15, _this$options$current16;
        return (_this$options$current15 = (_this$options$current16 = this.options.current).onUpdate) === null || _this$options$current15 === void 0 ? void 0 : _this$options$current15.call(_this$options$current16, ...args);
      },
      onContentError: (...args) => {
        var _this$options$current17, _this$options$current18;
        return (_this$options$current17 = (_this$options$current18 = this.options.current).onContentError) === null || _this$options$current17 === void 0 ? void 0 : _this$options$current17.call(_this$options$current18, ...args);
      },
      onDrop: (...args) => {
        var _this$options$current19, _this$options$current20;
        return (_this$options$current19 = (_this$options$current20 = this.options.current).onDrop) === null || _this$options$current19 === void 0 ? void 0 : _this$options$current19.call(_this$options$current20, ...args);
      },
      onPaste: (...args) => {
        var _this$options$current21, _this$options$current22;
        return (_this$options$current21 = (_this$options$current22 = this.options.current).onPaste) === null || _this$options$current21 === void 0 ? void 0 : _this$options$current21.call(_this$options$current22, ...args);
      },
      onDelete: (...args) => {
        var _this$options$current23, _this$options$current24;
        return (_this$options$current23 = (_this$options$current24 = this.options.current).onDelete) === null || _this$options$current23 === void 0 ? void 0 : _this$options$current23.call(_this$options$current24, ...args);
      },
      onMount: (...args) => {
        var _this$options$current25, _this$options$current26;
        return (_this$options$current25 = (_this$options$current26 = this.options.current).onMount) === null || _this$options$current25 === void 0 ? void 0 : _this$options$current25.call(_this$options$current26, ...args);
      },
      onUnmount: (...args) => {
        var _this$options$current27, _this$options$current28;
        return (_this$options$current27 = (_this$options$current28 = this.options.current).onUnmount) === null || _this$options$current27 === void 0 ? void 0 : _this$options$current27.call(_this$options$current28, ...args);
      }
    };
    return new Editor(optionsToApply);
  }
  /**
  * Get the current editor instance.
  */
  getEditor() {
    return this.editor;
  }
  /**
  * Always disable the editor on the server-side.
  */
  getServerSnapshot() {
    return null;
  }
  /**
  * Subscribe to the editor instance's changes.
  */
  subscribe(onStoreChange) {
    this.subscriptions.add(onStoreChange);
    return () => {
      this.subscriptions.delete(onStoreChange);
    };
  }
  static compareOptions(a, b) {
    return Object.keys(a).every((key) => {
      if ([
        "onCreate",
        "onBeforeCreate",
        "onDestroy",
        "onUpdate",
        "onTransaction",
        "onFocus",
        "onBlur",
        "onSelectionUpdate",
        "onContentError",
        "onDrop",
        "onPaste"
      ].includes(key)) return true;
      if (key === "extensions" && a.extensions && b.extensions) {
        if (a.extensions.length !== b.extensions.length) return false;
        return a.extensions.every((extension, index) => {
          var _b$extensions;
          if (extension !== ((_b$extensions = b.extensions) === null || _b$extensions === void 0 ? void 0 : _b$extensions[index])) return false;
          return true;
        });
      }
      if (a[key] !== b[key]) return false;
      return true;
    });
  }
  /**
  * On each render, we will create, update, or destroy the editor instance.
  * @param deps The dependencies to watch for changes
  * @returns A cleanup function
  */
  onRender(deps) {
    return () => {
      this.isComponentMounted = true;
      clearTimeout(this.scheduledDestructionTimeout);
      if (this.editor && !this.editor.isDestroyed && deps.length === 0) {
        if (!EditorInstanceManager2.compareOptions(this.options.current, this.editor.options)) this.editor.setOptions({
          ...this.options.current,
          editable: this.editor.isEditable
        });
      } else this.refreshEditorInstance(deps);
      return () => {
        this.isComponentMounted = false;
        this.scheduleDestroy();
      };
    };
  }
  /**
  * Recreate the editor instance if the dependencies have changed.
  */
  refreshEditorInstance(deps) {
    if (this.editor && !this.editor.isDestroyed) {
      if (this.previousDeps === null) {
        this.previousDeps = deps;
        return;
      }
      if (this.previousDeps.length === deps.length && this.previousDeps.every((dep, index) => dep === deps[index])) return;
    }
    if (this.editor && !this.editor.isDestroyed) this.editor.destroy();
    this.setEditor(this.createEditor());
    this.previousDeps = deps;
  }
  /**
  * Schedule the destruction of the editor instance.
  * This will only destroy the editor if it was not mounted on the next tick.
  * This is to avoid destroying the editor instance when it's actually still mounted.
  */
  scheduleDestroy() {
    const currentInstanceId = this.instanceId;
    const currentEditor = this.editor;
    this.scheduledDestructionTimeout = setTimeout(() => {
      if (this.isComponentMounted && this.instanceId === currentInstanceId) {
        if (currentEditor) currentEditor.setOptions(this.options.current);
        return;
      }
      if (currentEditor && !currentEditor.isDestroyed) {
        currentEditor.destroy();
        if (this.instanceId === currentInstanceId) this.setEditor(null);
      }
    }, 1);
  }
};
function useEditor(options = {}, deps = []) {
  const mostRecentOptions = useRef2(options);
  mostRecentOptions.current = options;
  const [instanceManager] = useState(() => new EditorInstanceManager(mostRecentOptions));
  const editor = useSyncExternalStore(instanceManager.subscribe, instanceManager.getEditor, instanceManager.getServerSnapshot);
  useDebugValue2(editor);
  useEffect2(instanceManager.onRender(deps));
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => {
      if (options.shouldRerenderOnTransaction === false || options.shouldRerenderOnTransaction === void 0) return null;
      if (options.immediatelyRender && transactionNumber === 0) return 0;
      return transactionNumber + 1;
    }
  });
  return editor;
}
var EditorContext = createContext({ editor: null });
var EditorConsumer = EditorContext.Consumer;
var useCurrentEditor = () => useContext(EditorContext);
var ReactNodeViewContext = createContext({
  onDragStart: () => {
  },
  nodeViewContentChildren: void 0,
  nodeViewContentRef: () => {
  }
});
var useReactNodeView = () => useContext(ReactNodeViewContext);
var NodeViewWrapper = React.forwardRef((props, ref) => {
  const { onDragStart } = useReactNodeView();
  const Tag = props.as || "div";
  return /* @__PURE__ */ jsx(Tag, {
    ...props,
    ref,
    "data-node-view-wrapper": "",
    onDragStart,
    style: {
      whiteSpace: "normal",
      ...props.style
    }
  });
});
function isClassComponent(Component) {
  return !!(typeof Component === "function" && Component.prototype && Component.prototype.isReactComponent);
}
function isForwardRefComponent(Component) {
  return !!(typeof Component === "object" && Component.$$typeof && (Component.$$typeof.toString() === "Symbol(react.forward_ref)" || Component.$$typeof.description === "react.forward_ref"));
}
function isMemoComponent(Component) {
  return !!(typeof Component === "object" && Component.$$typeof && (Component.$$typeof.toString() === "Symbol(react.memo)" || Component.$$typeof.description === "react.memo"));
}
function canReceiveRef(Component) {
  if (isClassComponent(Component)) return true;
  if (isForwardRefComponent(Component)) return true;
  if (isMemoComponent(Component)) {
    const wrappedComponent = Component.type;
    if (wrappedComponent) return isClassComponent(wrappedComponent) || isForwardRefComponent(wrappedComponent);
  }
  return false;
}
function isReact19Plus() {
  try {
    if (version) return parseInt(version.split(".")[0], 10) >= 19;
  } catch {
  }
  return false;
}
var ReactRenderer = class {
  /**
  * Immediately creates element and renders the provided React component.
  */
  constructor(component, { editor, props = {}, as = "div", className = "" }) {
    this.ref = null;
    this.destroyed = false;
    this.id = Math.floor(Math.random() * 4294967295).toString();
    this.component = component;
    this.editor = editor;
    this.props = props;
    this.element = document.createElement(as);
    this.element.classList.add("react-renderer");
    if (className) this.element.classList.add(...className.split(" "));
    if (this.editor.isEditorContentInitialized) flushSync(() => {
      this.render();
    });
    else queueMicrotask(() => {
      if (this.destroyed) return;
      this.render();
    });
  }
  /**
  * Render the React component.
  */
  render() {
    var _editor$contentCompon;
    if (this.destroyed) return;
    const Component = this.component;
    const props = this.props;
    const editor = this.editor;
    const isReact19 = isReact19Plus();
    const componentCanReceiveRef = canReceiveRef(Component);
    const elementProps = { ...props };
    if (elementProps.ref && !(isReact19 || componentCanReceiveRef)) delete elementProps.ref;
    if (!elementProps.ref && (isReact19 || componentCanReceiveRef)) elementProps.ref = (ref) => {
      this.ref = ref;
    };
    this.reactElement = /* @__PURE__ */ jsx(Component, { ...elementProps });
    editor === null || editor === void 0 || (_editor$contentCompon = editor.contentComponent) === null || _editor$contentCompon === void 0 || _editor$contentCompon.setRenderer(this.id, this);
  }
  /**
  * Re-renders the React component with new props.
  * Skips the render if none of the supplied props actually changed,
  * to avoid unnecessary portal re-creation.
  */
  updateProps(props = {}) {
    if (this.destroyed) return;
    let changed = false;
    const keys3 = Object.keys(props);
    for (let i = 0; i < keys3.length; i += 1) {
      const key = keys3[i];
      if (props[key] !== this.props[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.props = {
      ...this.props,
      ...props
    };
    this.render();
  }
  /**
  * Destroy the React component.
  */
  destroy() {
    var _editor$contentCompon2;
    this.destroyed = true;
    const editor = this.editor;
    editor === null || editor === void 0 || (_editor$contentCompon2 = editor.contentComponent) === null || _editor$contentCompon2 === void 0 || _editor$contentCompon2.removeRenderer(this.id);
    try {
      if (this.element && this.element.parentNode) this.element.parentNode.removeChild(this.element);
    } catch {
    }
  }
  /**
  * Update the attributes of the element that holds the React component.
  */
  updateAttributes(attributes) {
    Object.keys(attributes).forEach((key) => {
      this.element.setAttribute(key, attributes[key]);
    });
  }
};
var ReactMarkViewContext = React.createContext({ markViewContentRef: () => {
} });
function captureDOMSelection(element) {
  var _element$ownerDocumen;
  const root = element.getRootNode();
  const selection = typeof root.getSelection === "function" ? root.getSelection() : (_element$ownerDocumen = element.ownerDocument) === null || _element$ownerDocumen === void 0 || (_element$ownerDocumen = _element$ownerDocumen.defaultView) === null || _element$ownerDocumen === void 0 ? void 0 : _element$ownerDocumen.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;
  if (!anchorNode || !focusNode) return null;
  if (!element.contains(anchorNode) || !element.contains(focusNode)) return null;
  return () => {
    try {
      selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    } catch {
    }
  };
}
function isSameAncestor($from, $to, depth) {
  return $from.node(depth) === $to.node(depth) && $from.before(depth) === $to.before(depth);
}
function getTextSelectionAncestorPositions(selection) {
  if (!isTextSelection(selection)) return [];
  const { $from, $to } = selection;
  const positions = [];
  const maxDepth = Math.min($from.depth, $to.depth);
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (!isSameAncestor($from, $to, depth)) break;
    positions.push($from.before(depth));
  }
  return positions;
}
var ReactNodeViewSelectionTracker = class {
  constructor(editor) {
    this.views = /* @__PURE__ */ new WeakMap();
    this.viewCount = 0;
    this.insideViews = /* @__PURE__ */ new Set();
    this.syncQueued = false;
    this.scheduleSync = () => {
      if (this.syncQueued) return;
      this.syncQueued = true;
      queueMicrotask(() => {
        this.syncQueued = false;
        this.sync();
      });
    };
    this.handleTransaction = () => this.scheduleSync();
    this.editor = editor;
  }
  register(view) {
    if (this.viewCount === 0) this.editor.on("transaction", this.handleTransaction);
    this.views.set(view.dom, view);
    this.viewCount += 1;
    this.scheduleSync();
  }
  unregister(view) {
    this.views.delete(view.dom);
    this.viewCount -= 1;
    this.insideViews.delete(view);
    if (this.viewCount === 0) this.editor.off("transaction", this.handleTransaction);
  }
  sync() {
    if (this.viewCount === 0 || this.editor.isDestroyed) return;
    const nextInsideViews = this.findInsideViews();
    this.updateViews(this.insideViews, nextInsideViews, false);
    this.updateViews(nextInsideViews, this.insideViews, true);
    this.insideViews = nextInsideViews;
  }
  updateViews(views, unchangedViews, selectionInside) {
    for (const view of views) if (!unchangedViews.has(view)) view.setSelectionInside(selectionInside);
  }
  findInsideViews() {
    const insideViews = /* @__PURE__ */ new Set();
    for (const position of getTextSelectionAncestorPositions(this.editor.state.selection)) {
      const dom = this.editor.view.nodeDOM(position);
      const view = dom ? this.views.get(dom) : void 0;
      if (view) insideViews.add(view);
    }
    return insideViews;
  }
};
var trackers = /* @__PURE__ */ new WeakMap();
function getReactNodeViewSelectionTracker(editor) {
  let tracker = trackers.get(editor);
  if (!tracker) {
    tracker = new ReactNodeViewSelectionTracker(editor);
    trackers.set(editor, tracker);
  }
  return tracker;
}
var ReactNodeView = class extends NodeView {
  constructor(component, props, options) {
    super(component, props, options);
    this.nodeSelected = false;
    this.handlePositionUpdate = () => {
      const newPos = this.getPos();
      if (typeof newPos !== "number" || newPos === this.currentPos) return;
      this.currentPos = newPos;
      this.renderer.updateProps({ getPos: () => this.getPos() });
      if (typeof this.options.attrs === "function") this.updateElementAttributes();
    };
    this.cachedExtensionWithSyncedStorage = null;
    if (!this.node.isLeaf) {
      if (this.options.contentDOMElementTag) this.contentDOMElement = document.createElement(this.options.contentDOMElementTag);
      else this.contentDOMElement = document.createElement(this.node.isInline ? "span" : "div");
      this.contentDOMElement.dataset.nodeViewContentReact = "";
      this.contentDOMElement.dataset.nodeViewWrapper = "";
      this.contentDOMElement.style.whiteSpace = "inherit";
      const contentTarget = this.dom.querySelector("[data-node-view-content]");
      if (contentTarget) contentTarget.appendChild(this.contentDOMElement);
      else this.dom.appendChild(this.contentDOMElement);
    }
    if (this.options.trackNodeViewPosition) this.editor.on("update", this.handlePositionUpdate);
  }
  /**
  * Returns a proxy of the extension that redirects storage access to the editor's mutable storage.
  * This preserves the original prototype chain (instanceof checks, methods like configure/extend work).
  * Cached to avoid proxy creation on every update.
  */
  get extensionWithSyncedStorage() {
    if (!this.cachedExtensionWithSyncedStorage) {
      const editor = this.editor;
      const extension = this.extension;
      this.cachedExtensionWithSyncedStorage = new Proxy(extension, { get(target, prop, receiver) {
        if (prop === "storage") {
          var _editor$storage;
          return (_editor$storage = editor.storage[extension.name]) !== null && _editor$storage !== void 0 ? _editor$storage : {};
        }
        return Reflect.get(target, prop, receiver);
      } });
    }
    return this.cachedExtensionWithSyncedStorage;
  }
  /**
  * Setup the React component.
  * Called on initialization.
  */
  mount() {
    const mountProps = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations,
      innerDecorations: this.innerDecorations,
      view: this.view,
      selected: false,
      selectionInside: false,
      extension: this.extensionWithSyncedStorage,
      HTMLAttributes: this.HTMLAttributes,
      getPos: () => this.getPos(),
      updateAttributes: (attributes = {}) => this.updateAttributes(attributes),
      deleteNode: () => this.deleteNode(),
      ref: createRef()
    };
    if (!this.component.displayName) {
      const capitalizeFirstChar = (string) => {
        return string.charAt(0).toUpperCase() + string.substring(1);
      };
      this.component.displayName = capitalizeFirstChar(this.extension.name);
    }
    const onDragStart = this.onDragStart.bind(this);
    const nodeViewContentRef = (element) => {
      if (element && this.contentDOMElement && element.firstChild !== this.contentDOMElement) {
        if (element.hasAttribute("data-node-view-wrapper")) element.removeAttribute("data-node-view-wrapper");
        const restoreSelection = captureDOMSelection(this.contentDOMElement);
        element.appendChild(this.contentDOMElement);
        restoreSelection === null || restoreSelection === void 0 || restoreSelection();
      }
    };
    const context = {
      onDragStart,
      nodeViewContentRef
    };
    const Component = this.component;
    const ReactNodeViewProvider = memo((componentProps) => {
      return /* @__PURE__ */ jsx(ReactNodeViewContext.Provider, {
        value: context,
        children: createElement(Component, componentProps)
      });
    });
    ReactNodeViewProvider.displayName = "ReactNodeView";
    let as = this.node.isInline ? "span" : "div";
    if (this.options.as) as = this.options.as;
    const { className = "" } = this.options;
    this.renderer = new ReactRenderer(ReactNodeViewProvider, {
      editor: this.editor,
      props: mountProps,
      as,
      className: `node-${this.node.type.name} ${className}`.trim()
    });
    getReactNodeViewSelectionTracker(this.editor).register(this);
    this.updateElementAttributes();
    this.currentPos = this.getPos();
  }
  /**
  * Return the DOM element.
  * This is the element that will be used to display the node view.
  */
  get dom() {
    var _this$renderer$elemen;
    if (this.renderer.element.firstElementChild && !((_this$renderer$elemen = this.renderer.element.firstElementChild) === null || _this$renderer$elemen === void 0 ? void 0 : _this$renderer$elemen.hasAttribute("data-node-view-wrapper"))) throw Error("Please use the NodeViewWrapper component for your node view.");
    return this.renderer.element;
  }
  /**
  * Return the content DOM element.
  * This is the element that will be used to display the rich-text content of the node.
  */
  get contentDOM() {
    if (this.node.isLeaf) return null;
    return this.contentDOMElement;
  }
  /**
  * On update, update the React component.
  * To prevent unnecessary updates, the `update` option can be used.
  */
  update(node, decorations, innerDecorations) {
    const rerenderComponent = (props) => {
      this.renderer.updateProps(props);
      if (typeof this.options.attrs === "function") this.updateElementAttributes();
    };
    if (node.type !== this.node.type) return false;
    if (typeof this.options.update === "function") {
      const oldNode = this.node;
      const oldDecorations = this.decorations;
      const oldInnerDecorations = this.innerDecorations;
      this.node = node;
      this.decorations = decorations;
      this.innerDecorations = innerDecorations;
      this.currentPos = this.getPos();
      return this.options.update({
        oldNode,
        oldDecorations,
        newNode: node,
        newDecorations: decorations,
        oldInnerDecorations,
        innerDecorations,
        updateProps: () => rerenderComponent({
          node,
          decorations,
          innerDecorations,
          extension: this.extensionWithSyncedStorage
        })
      });
    }
    if (!(node !== this.node)) {
      this.node = node;
      this.decorations = decorations;
      this.innerDecorations = innerDecorations;
      return true;
    }
    const newPos = this.getPos();
    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;
    this.currentPos = newPos;
    const extraProps = {
      node,
      decorations,
      innerDecorations,
      extension: this.extensionWithSyncedStorage
    };
    if (this.options.trackNodeViewPosition) extraProps.getPos = () => this.getPos();
    rerenderComponent(extraProps);
    return true;
  }
  /**
  * Select the node.
  * Add the `selected` prop and the `ProseMirror-selectednode` class.
  */
  selectNode() {
    this.nodeSelected = true;
    this.updateSelectedState(true);
  }
  /**
  * Deselect the node.
  * Remove the `selected` prop and the `ProseMirror-selectednode` class.
  */
  deselectNode() {
    this.nodeSelected = false;
    this.updateSelectedState(this.options.selectedOnTextSelection === true && this.isTextSelectionInside());
  }
  setSelectionInside(selectionInside) {
    const selected = this.nodeSelected || this.options.selectedOnTextSelection === true && selectionInside;
    this.renderer.updateProps({
      selectionInside,
      selected
    });
    this.renderer.element.classList.toggle("ProseMirror-selectednode", selected);
  }
  updateSelectedState(selected) {
    this.renderer.updateProps({ selected });
    this.renderer.element.classList.toggle("ProseMirror-selectednode", selected);
  }
  isTextSelectionInside() {
    const pos = this.getPos();
    return typeof pos === "number" && getTextSelectionAncestorPositions(this.editor.state.selection).includes(pos);
  }
  /**
  * Destroy the React component instance.
  */
  destroy() {
    this.renderer.destroy();
    getReactNodeViewSelectionTracker(this.editor).unregister(this);
    if (this.options.trackNodeViewPosition) this.editor.off("update", this.handlePositionUpdate);
    this.contentDOMElement = null;
  }
  /**
  * Update the attributes of the top-level element that holds the React component.
  * Applying the attributes defined in the `attrs` option.
  */
  updateElementAttributes() {
    if (this.options.attrs) {
      let attrsObj = {};
      if (typeof this.options.attrs === "function") {
        const extensionAttributes = this.editor.extensionManager.attributes;
        const HTMLAttributes = getRenderedAttributes(this.node, extensionAttributes);
        attrsObj = this.options.attrs({
          node: this.node,
          HTMLAttributes
        });
      } else attrsObj = this.options.attrs;
      this.renderer.updateAttributes(attrsObj);
    }
  }
};
function ReactNodeViewRenderer(component, options) {
  return (props) => {
    if (!props.editor.contentComponent) return {
      dom: document.createElement("span"),
      contentDOM: null,
      update: () => false,
      destroy: () => {
      },
      selectNode: () => {
      },
      deselectNode: () => {
      },
      stopEvent: () => false,
      ignoreMutation: () => true
    };
    return new ReactNodeView(component, props, options);
  };
}
var TiptapContext = createContext({ get editor() {
  throw new Error("useTiptap must be used within a <Tiptap> provider");
} });
TiptapContext.displayName = "TiptapContext";
var useTiptap = () => useContext(TiptapContext);
function TiptapWrapper({ children, ...props }) {
  const resolvedEditor = "editor" in props ? props.editor : props.instance;
  if (!resolvedEditor) throw new Error("Tiptap: An editor instance is required. Pass a non-null `editor` prop.");
  const tiptapContextValue = useMemo2(() => ({ editor: resolvedEditor }), [resolvedEditor]);
  const legacyContextValue = useMemo2(() => ({ editor: resolvedEditor }), [resolvedEditor]);
  return /* @__PURE__ */ jsx(EditorContext.Provider, {
    value: legacyContextValue,
    children: /* @__PURE__ */ jsx(TiptapContext.Provider, {
      value: tiptapContextValue,
      children
    })
  });
}
TiptapWrapper.displayName = "Tiptap";
function TiptapContent({ ...rest }) {
  const { editor } = useTiptap();
  return /* @__PURE__ */ jsx(EditorContent, {
    editor,
    ...rest
  });
}
TiptapContent.displayName = "Tiptap.Content";
var Tiptap = Object.assign(TiptapWrapper, {
  /**
  * The Tiptap Content component that renders the EditorContent with the editor instance from the context.
  * @see TiptapContent
  */
  Content: TiptapContent
});

// src/react/node-views.tsx
import { BlockChromeFallback, defaultSkinRegistry, SelectionChrome } from "@schemastud/seam";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var BASE_PROSE_NODE_NAMES = /* @__PURE__ */ new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "hr",
  "br",
  "text"
]);
function createNodeViewRegistry() {
  const components = /* @__PURE__ */ new Map();
  return {
    registerNodeView(nodeTypeName, component) {
      components.set(nodeTypeName, component);
    },
    resolveNodeView(nodeTypeName) {
      return components.get(nodeTypeName);
    }
  };
}
function needsGenericNodeView(entry) {
  if (BASE_PROSE_NODE_NAMES.has(entry.name)) {
    return false;
  }
  const properties = entry.attrsSchema?.properties ?? {};
  return Object.keys(properties).some((name) => name !== NODE_ID_ATTR) || !BASE_PROSE_NODE_NAMES.has(entry.name);
}
function resolveNodeViewComponents(manifests, registry, skins) {
  const skinRegistry = skins ?? defaultSkinRegistry;
  const resolved = /* @__PURE__ */ new Map();
  for (const manifest of manifests) {
    for (const entry of manifest.nodes) {
      const registered = registry?.resolveNodeView(entry.name);
      if (registered !== void 0) {
        resolved.set(entry.name, { component: registered, attrsSchema: entry.attrsSchema });
        continue;
      }
      if (manifest["x-prose"]?.[entry.name]) continue;
      if (needsGenericNodeView(entry)) {
        resolved.set(entry.name, {
          component: GenericNodeView,
          attrsSchema: entry.attrsSchema,
          skin: skinRegistry.resolveSkin(entry.name)
        });
      }
    }
  }
  return resolved;
}
function tiptapNodeView(resolved) {
  const { component: Component, attrsSchema, skin } = resolved;
  function BlockdocNodeViewAdapter({ node, editor, getPos, updateAttributes: updateAttributes2, selected }) {
    const { nodeViewContentRef } = useReactNodeView();
    const contentRef = node.isLeaf ? null : nodeViewContentRef ?? null;
    return /* @__PURE__ */ jsx2(NodeViewWrapper, { as: node.isInline ? "span" : "div", className: "blockdoc-node-view", children: /* @__PURE__ */ jsx2(
      Component,
      {
        node,
        view: editor.view,
        getPos,
        updateAttrs: (attrs) => updateAttributes2({ ...attrs, [NODE_ID_ATTR]: node.attrs[NODE_ID_ATTR] }),
        attrsSchema,
        contentRef,
        skin,
        selected
      }
    ) });
  }
  BlockdocNodeViewAdapter.displayName = `BlockdocNodeView(${Component.displayName ?? Component.name ?? "Component"})`;
  return BlockdocNodeViewAdapter;
}
function GenericNodeView({ node, attrsSchema, contentRef, skin, selected }) {
  const Skin = skin ?? BlockChromeFallback;
  const nodeId = String(node.attrs[NODE_ID_ATTR] ?? "");
  const skinNode = { type: node.type.name, attrs: node.attrs };
  const skinContext = { attrsSchema };
  return /* @__PURE__ */ jsxs2(SelectionChrome, { nodeId, localSelected: selected ?? false, children: [
    /* @__PURE__ */ jsx2("div", { "data-blockdoc-node": node.type.name, contentEditable: false, children: Skin(skinNode, skinContext) }),
    contentRef !== null && /* @__PURE__ */ jsx2("div", { ref: contentRef, "data-blockdoc-content": true, style: { padding: "8px 10px" } })
  ] });
}

// src/react/manifest-extensions.ts
function createManifestExtensions(manifests, options = {}) {
  const manifestList = Array.isArray(manifests) ? manifests : [manifests];
  const { doc: doc2, nodeEntries, markEntries } = collectManifestEntries(manifestList);
  const allCategories = allBlockCategories(nodeEntries);
  const admits = options.docAdmits ?? doc2.admitsChildCategories;
  const nodeViews = resolveNodeViewComponents(manifestList, options.nodeViews, options.skins);
  const extensions = [
    Node3.create({
      name: "doc",
      topNode: true,
      content: contentExpressionFor(
        { admitsChildCategories: admits, childConstraints: doc2.childConstraints },
        allCategories
      )
    })
  ];
  for (const entry of nodeEntries) {
    extensions.push(nodeExtensionFor(entry, allCategories, nodeViews.get(entry.name)));
  }
  extensions.push(Node3.create({ name: "text", group: "inline" }));
  for (const entry of markEntries) {
    extensions.push(markExtensionFor(entry));
  }
  return extensions;
}
function nodeAttributes(entry) {
  const attributes = {};
  for (const [name, spec] of Object.entries(attrsFromSchema(entry.attrsSchema, true))) {
    attributes[name] = name === NODE_ID_ATTR ? {
      default: spec.default,
      parseHTML: (element) => element.getAttribute("data-node-id"),
      renderHTML: (attrs) => {
        const id = attrs[NODE_ID_ATTR];
        return typeof id === "string" && id !== "" ? { "data-node-id": id } : {};
      }
    } : {
      default: spec.default,
      // Parse rules may still set the attr from the tag; null here
      // defers to them / the default.
      parseHTML: () => null,
      renderHTML: () => ({})
    };
  }
  return attributes;
}
var INTRINSIC_HTML_ELEMENTS = /* @__PURE__ */ new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li"
]);
function nodeDOM(entry, hasContent) {
  switch (entry.name) {
    case "pre":
      return {
        parseHTML: () => [{ tag: "pre", preserveWhitespace: "full" }],
        renderHTML: ({ HTMLAttributes }) => ["pre", HTMLAttributes, ["code", 0]]
      };
    case "hr":
      return {
        parseHTML: () => [{ tag: "hr" }],
        renderHTML: ({ HTMLAttributes }) => ["hr", HTMLAttributes]
      };
    case "br":
      return {
        parseHTML: () => [{ tag: "br" }],
        renderHTML: () => ["br"]
      };
  }
  if (INTRINSIC_HTML_ELEMENTS.has(entry.name)) {
    return {
      parseHTML: () => [{ tag: entry.name }],
      renderHTML: ({ HTMLAttributes }) => [entry.name, HTMLAttributes, 0]
    };
  }
  const tag = entry.group === "inline" ? "span" : "div";
  return {
    parseHTML: () => [{ tag: `${tag}[data-node-type="${entry.name}"]` }],
    renderHTML: ({ HTMLAttributes }) => hasContent ? [tag, mergeAttributes({ "data-node-type": entry.name }, HTMLAttributes), 0] : [tag, mergeAttributes({ "data-node-type": entry.name }, HTMLAttributes)]
  };
}
function nodeExtensionFor(entry, allCategories, nodeView) {
  const groups = groupsFor(entry);
  const content = contentExpressionFor(entry, allCategories);
  return Node3.create({
    name: entry.name,
    ...groups.length > 0 ? { group: groups.join(" ") } : {},
    ...entry.group === "inline" ? { inline: true } : {},
    ...content !== void 0 ? { content } : {},
    addAttributes() {
      return nodeAttributes(entry);
    },
    ...nodeDOM(entry, content !== void 0),
    ...nodeView !== void 0 ? {
      addNodeView() {
        return ReactNodeViewRenderer(tiptapNodeView(nodeView));
      }
    } : {}
  });
}
function markDOM(entry) {
  switch (entry.name) {
    case "strong":
      return {
        parseHTML: () => [{ tag: "strong" }, { tag: "b" }],
        renderHTML: () => ["strong", 0]
      };
    case "em":
      return {
        parseHTML: () => [{ tag: "em" }, { tag: "i" }],
        renderHTML: () => ["em", 0]
      };
    case "code":
      return {
        parseHTML: () => [{ tag: "code" }],
        renderHTML: () => ["code", 0]
      };
    case "a":
    case "link":
      return {
        parseHTML: () => [{ tag: "a[href]" }],
        renderHTML: ({ mark }) => ["a", { href: String(mark.attrs.href ?? "") }, 0]
      };
    case "annotation":
      return {
        parseHTML: () => [{ tag: "span[data-annotation-id]" }],
        renderHTML: ({ mark }) => {
          const id = mark.attrs[NODE_ID_ATTR];
          return [
            "span",
            typeof id === "string" && id !== "" ? { "data-annotation-id": id } : { "data-annotation": "" },
            0
          ];
        }
      };
    default:
      return {
        parseHTML: () => [{ tag: `span[data-mark="${entry.name}"]` }],
        renderHTML: () => ["span", { "data-mark": entry.name }, 0]
      };
  }
}
function markAttributes(entry) {
  const attributes = {};
  for (const [name, spec] of Object.entries(attrsFromSchema(entry.attrsSchema, false))) {
    if ((entry.name === "link" || entry.name === "a") && name === "href") {
      attributes[name] = {
        default: spec.default,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: () => ({})
      };
      continue;
    }
    if (entry.name === "annotation" && name === NODE_ID_ATTR) {
      attributes[name] = {
        default: spec.default,
        parseHTML: (element) => element.getAttribute("data-annotation-id"),
        renderHTML: () => ({})
      };
      continue;
    }
    attributes[name] = {
      default: spec.default,
      parseHTML: () => null,
      renderHTML: () => ({})
    };
  }
  return attributes;
}
function markExtensionFor(entry) {
  const hasAttrs = Object.keys(attrsFromSchema(entry.attrsSchema, false)).length > 0;
  return Mark2.create({
    name: entry.name,
    // Rule 8: pass through when present — including '' (overlap-allowing).
    ...entry.excludes !== void 0 ? { excludes: entry.excludes } : {},
    ...hasAttrs ? {
      addAttributes() {
        return markAttributes(entry);
      }
    } : {},
    ...markDOM(entry)
  });
}

// src/react/selection.ts
function selectionNodeId(state) {
  if (state.selection instanceof NodeSelection) {
    const id = state.selection.node.attrs[NODE_ID_ATTR];
    if (typeof id === "string" && id !== "") {
      return id;
    }
  }
  const $from = state.selection.$from;
  for (let depth = $from.depth; depth > 0; depth--) {
    const id = $from.node(depth).attrs[NODE_ID_ATTR];
    if (typeof id === "string" && id !== "") {
      return id;
    }
  }
  return null;
}
function selectionForNodeId(doc2, id) {
  if (id !== null) {
    let found = null;
    doc2.descendants((node, pos) => {
      if (found !== null) {
        return false;
      }
      if (node.attrs[NODE_ID_ATTR] === id) {
        found = pos;
        return false;
      }
      return true;
    });
    if (found !== null) {
      return Selection.near(doc2.resolve(found + 1));
    }
  }
  return Selection.atStart(doc2);
}
function findNodeById(doc2, id) {
  let result = null;
  doc2.descendants((node, pos) => {
    if (result !== null) {
      return false;
    }
    if (node.attrs[NODE_ID_ATTR] === id) {
      result = { node, pos };
      return false;
    }
    return true;
  });
  return result;
}

// node_modules/.pnpm/prosemirror-inputrules@1.5.1/node_modules/prosemirror-inputrules/dist/index.js
var InputRule = class {
  /**
  Create an input rule. The rule applies when the user typed
  something and the text directly in front of the cursor matches
  `match`, which should end with `$`.
  
  The `handler` can be a string, in which case the matched text, or
  the first matched group in the regexp, is replaced by that
  string.
  
  Or a it can be a function, which will be called with the match
  array produced by
  [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
  as well as the start and end of the matched range, and which can
  return a [transaction](https://prosemirror.net/docs/ref/#state.Transaction) that describes the
  rule's effect, or null to indicate the input was not handled.
  */
  constructor(match, handler, options = {}) {
    this.match = match;
    this.match = match;
    this.handler = typeof handler == "string" ? stringHandler(handler) : handler;
    this.undoable = options.undoable !== false;
    this.inCode = options.inCode || false;
    this.inCodeMark = options.inCodeMark !== false;
  }
};
function stringHandler(string) {
  return function(state, match, start, end) {
    let insert = string;
    if (match[1]) {
      let offset3 = match[0].lastIndexOf(match[1]);
      insert += match[0].slice(offset3 + match[1].length);
      start += offset3;
      let cutOff = start - end;
      if (cutOff > 0) {
        insert = match[0].slice(offset3 - cutOff, offset3) + insert;
        start = end;
      }
    }
    return state.tr.insertText(insert, start, end);
  };
}
var MAX_MATCH = 500;
function inputRules({ rules }) {
  let plugin = new Plugin({
    state: {
      init() {
        return null;
      },
      apply(tr, prev) {
        let stored = tr.getMeta(this);
        if (stored)
          return stored;
        return tr.selectionSet || tr.docChanged ? null : prev;
      }
    },
    props: {
      handleTextInput(view, from2, to, text) {
        return run2(view, from2, to, text, rules, plugin);
      },
      handleDOMEvents: {
        compositionend: (view) => {
          setTimeout(() => {
            let { $cursor } = view.state.selection;
            if ($cursor)
              run2(view, $cursor.pos, $cursor.pos, "", rules, plugin);
          });
        }
      }
    },
    isInputRules: true
  });
  return plugin;
}
function run2(view, from2, to, text, rules, plugin) {
  if (view.composing)
    return false;
  let state = view.state, $from = state.doc.resolve(from2);
  let textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - MAX_MATCH), $from.parentOffset, null, "\uFFFC") + text;
  for (let i = 0; i < rules.length; i++) {
    let rule = rules[i];
    if (!rule.inCodeMark && $from.marks().some((m) => m.type.spec.code))
      continue;
    if ($from.parent.type.spec.code) {
      if (!rule.inCode)
        continue;
    } else if (rule.inCode === "only") {
      continue;
    }
    let match = rule.match.exec(textBefore);
    if (!match || match[0].length < text.length)
      continue;
    let startPos = from2 - (match[0].length - text.length);
    if (!rule.inCodeMark) {
      let hasMark = false;
      state.doc.nodesBetween(startPos, $from.pos, (node) => {
        if (node.isInline && node.marks.some((m) => m.type.spec.code))
          hasMark = true;
      });
      if (hasMark)
        continue;
    }
    let tr = rule.handler(state, match, startPos, to);
    if (!tr)
      continue;
    if (rule.undoable)
      tr.setMeta(plugin, { transform: tr, from: from2, to, text });
    view.dispatch(tr);
    return true;
  }
  return false;
}
var emDash = new InputRule(/--$/, "\u2014", { inCodeMark: false });
var ellipsis = new InputRule(/\.\.\.$/, "\u2026", { inCodeMark: false });
var openDoubleQuote = new InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "\u201C", { inCodeMark: false });
var closeDoubleQuote = new InputRule(/"$/, "\u201D", { inCodeMark: false });
var openSingleQuote = new InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "\u2018", { inCodeMark: false });
var closeSingleQuote = new InputRule(/'$/, "\u2019", { inCodeMark: false });
function wrappingInputRule(regexp, nodeType, getAttrs = null, joinPredicate) {
  return new InputRule(regexp, (state, match, start, end) => {
    let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
    let tr = state.tr.delete(start, end);
    let $start = tr.doc.resolve(start), range = $start.blockRange(), wrapping = range && findWrapping(range, nodeType, attrs);
    if (!wrapping)
      return null;
    tr.wrap(range, wrapping);
    let before = tr.doc.resolve(start - 1).nodeBefore;
    if (before && before.type == nodeType && canJoin(tr.doc, start - 1) && (!joinPredicate || joinPredicate(match, before)))
      tr.join(start - 1);
    return tr;
  });
}
function textblockTypeInputRule(regexp, nodeType, getAttrs = null) {
  return new InputRule(regexp, (state, match, start, end) => {
    let $start = state.doc.resolve(start);
    let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
    if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType))
      return null;
    return state.tr.delete(start, end).setBlockType(start, start, nodeType, attrs);
  });
}

// src/react/prose-shortcuts.ts
function proseShortcuts(schema, manifests) {
  const roles = Object.assign({}, ...manifests.map((m) => m["x-prose"] ?? {}));
  if (!Object.keys(roles).length) return [];
  const rules = [];
  for (let level = 1; level <= 6; level++) {
    const name = `h${level}`;
    if (roles[name] === "block" && schema.nodes[name]) rules.push(textblockTypeInputRule(new RegExp(`^(#{${level}})\\s$`), schema.nodes[name]));
  }
  for (const [name, pattern] of [["blockquote", /^>\s$/], ["ul", /^[-+*]\s$/], ["ol", /^\d+\.\s$/]]) {
    if (roles[name] === "container" && schema.nodes[name]) rules.push(wrappingInputRule(pattern, schema.nodes[name]));
  }
  for (const [name, pattern] of [["strong", /\*\*([^*]+)\*\*$/], ["em", /\*([^*]+)\*$/], ["code", /`([^`]+)`$/]]) {
    if (roles[name] !== "mark" || !schema.marks[name]) continue;
    rules.push(new InputRule(pattern, (state, match, start, end) => {
      const tr = state.tr.insertText(match[1], start, end);
      tr.addMark(start, start + match[1].length, schema.marks[name].create());
      tr.removeStoredMark(schema.marks[name]);
      return tr;
    }));
  }
  const list = schema.nodes.li;
  return [inputRules({ rules }), ...roles.li === "container" && list ? [keymap({ Enter: splitListItem(list), Tab: sinkListItem(list), "Shift-Tab": liftListItem(list) })] : []];
}

// node_modules/.pnpm/@floating-ui+utils@0.2.12/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var sides = ["top", "right", "bottom", "left"];
var alignments = ["start", "end"];
var placements = /* @__PURE__ */ sides.reduce((acc, side) => acc.concat(side, side + "-" + alignments[0], side + "-" + alignments[1]), []);
var min = Math.min;
var max = Math.max;
var round = Math.round;
var createCoords = (v) => ({
  x: v,
  y: v
});
var oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide2(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  const firstChar = placement[0];
  return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
var lrPlacement = ["left", "right"];
var rlPlacement = ["right", "left"];
var tbPlacement = ["top", "bottom"];
var btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide2(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  const side = getSide2(placement);
  return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
  var _padding$top, _padding$right, _padding$bottom, _padding$left;
  return {
    top: (_padding$top = padding.top) != null ? _padding$top : 0,
    right: (_padding$right = padding.right) != null ? _padding$right : 0,
    bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
    left: (_padding$left = padding.left) != null ? _padding$left : 0
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x,
    y,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}

// node_modules/.pnpm/@floating-ui+core@1.8.0/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide2(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  const alignment = getAlignment(placement);
  if (alignment) {
    coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
  }
  return coords;
}
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) && await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
var MAX_RESET_COUNT = 50;
var computePosition = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const platformWithDetectOverflow = platform2.detectOverflow ? platform2 : {
    ...platform2,
    detectOverflow
  };
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let resetCount = 0;
  const middlewareData = {};
  for (let i = 0; i < middleware.length; i++) {
    const currentMiddleware = middleware[i];
    if (!currentMiddleware) {
      continue;
    }
    const {
      name,
      fn
    } = currentMiddleware;
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platformWithDetectOverflow,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData[name] = {
      ...middlewareData[name],
      ...data
    };
    if (reset && resetCount < MAX_RESET_COUNT) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
var arrow = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset3 = clamp(minPadding, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset3 && rects.reference[length] / 2 - (center < minPadding ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < minPadding ? center - minPadding : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset3,
        centerOffset: center - offset3 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
function getPlacementList(alignment, autoAlignment, allowedPlacements) {
  const allowedPlacementsSortedByAlignment = alignment ? [...allowedPlacements.filter((placement) => getAlignment(placement) === alignment), ...allowedPlacements.filter((placement) => getAlignment(placement) !== alignment)] : allowedPlacements.filter((placement) => getSide2(placement) === placement);
  return allowedPlacementsSortedByAlignment.filter((placement) => {
    if (alignment) {
      return getAlignment(placement) === alignment || (autoAlignment ? getOppositeAlignmentPlacement(placement) !== placement : false);
    }
    return true;
  });
}
var autoPlacement = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "autoPlacement",
    options,
    async fn(state) {
      var _middlewareData$autoP, _middlewareData$autoP2, _placementsThatFitOnE;
      const {
        rects,
        middlewareData,
        placement,
        platform: platform2,
        elements
      } = state;
      const {
        crossAxis = false,
        alignment,
        allowedPlacements = placements,
        autoAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      const placements$1 = alignment !== void 0 || allowedPlacements === placements ? getPlacementList(alignment || null, autoAlignment, allowedPlacements) : allowedPlacements;
      const currentIndex = ((_middlewareData$autoP = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP.index) || 0;
      const currentPlacement = placements$1[currentIndex];
      if (currentPlacement == null) {
        return {};
      }
      if (placement !== currentPlacement) {
        return {
          reset: {
            placement: placements$1[0]
          }
        };
      }
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const alignmentSides = getAlignmentSides(currentPlacement, rects, await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)));
      const currentOverflows = [overflow[getSide2(currentPlacement)], overflow[alignmentSides[0]], overflow[alignmentSides[1]]];
      const allOverflows = [...((_middlewareData$autoP2 = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP2.overflows) || [], {
        placement: currentPlacement,
        overflows: currentOverflows
      }];
      const nextPlacement = placements$1[currentIndex + 1];
      if (nextPlacement) {
        return {
          data: {
            index: currentIndex + 1,
            overflows: allOverflows
          },
          reset: {
            placement: nextPlacement
          }
        };
      }
      const placementsSortedByMostSpace = allOverflows.map((d) => {
        const alignment2 = getAlignment(d.placement);
        return [d.placement, alignment2 && crossAxis ? (
          // Check along the mainAxis and main crossAxis side.
          d.overflows.slice(0, 2).reduce((acc, v) => acc + v, 0)
        ) : (
          // Check only the mainAxis.
          d.overflows[0]
        ), d.overflows];
      }).sort((a, b) => a[1] - b[1]);
      const placementsThatFitOnEachSide = placementsSortedByMostSpace.filter((d) => d[2].slice(
        0,
        // Aligned placements should not check their opposite crossAxis
        // side.
        getAlignment(d[0]) ? 2 : 3
      ).every((v) => v <= 0));
      const resetPlacement = ((_placementsThatFitOnE = placementsThatFitOnEachSide[0]) == null ? void 0 : _placementsThatFitOnE[0]) || placementsSortedByMostSpace[0][0];
      if (resetPlacement !== placement) {
        return {
          data: {
            index: currentIndex + 1,
            overflows: allOverflows
          },
          reset: {
            placement: resetPlacement
          }
        };
      }
      return {};
    }
  };
};
var flip = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide2(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide2(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements2 = [initialPlacement, ...fallbackPlacements];
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements2[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
function getSideOffsets(overflow, rect) {
  return {
    top: overflow.top - rect.height,
    right: overflow.right - rect.width,
    bottom: overflow.bottom - rect.height,
    left: overflow.left - rect.width
  };
}
function isAnySideFullyClipped(overflow) {
  return sides.some((side) => overflow[side] >= 0);
}
var hide = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "hide",
    options,
    async fn(state) {
      const {
        rects,
        platform: platform2
      } = state;
      const {
        strategy = "referenceHidden",
        ...detectOverflowOptions
      } = evaluate(options, state);
      switch (strategy) {
        case "referenceHidden": {
          const overflow = await platform2.detectOverflow(state, {
            ...detectOverflowOptions,
            elementContext: "reference"
          });
          const offsets = getSideOffsets(overflow, rects.reference);
          return {
            data: {
              referenceHiddenOffsets: offsets,
              referenceHidden: isAnySideFullyClipped(offsets)
            }
          };
        }
        case "escaped": {
          const overflow = await platform2.detectOverflow(state, {
            ...detectOverflowOptions,
            altBoundary: true
          });
          const offsets = getSideOffsets(overflow, rects.floating);
          return {
            data: {
              escapedOffsets: offsets,
              escaped: isAnySideFullyClipped(offsets)
            }
          };
        }
        default: {
          return {};
        }
      }
    }
  };
};
function getBoundingRect(rects) {
  const minX = min(...rects.map((rect) => rect.left));
  const minY = min(...rects.map((rect) => rect.top));
  const maxX = max(...rects.map((rect) => rect.right));
  const maxY = max(...rects.map((rect) => rect.bottom));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
function getRectsByLine(rects) {
  const sortedRects = rects.slice().sort((a, b) => a.y - b.y);
  const groups = [];
  let prevRect = null;
  for (let i = 0; i < sortedRects.length; i++) {
    const rect = sortedRects[i];
    if (!prevRect || rect.y - prevRect.y > prevRect.height / 2) {
      groups.push([rect]);
    } else {
      groups[groups.length - 1].push(rect);
    }
    prevRect = rect;
  }
  return groups.map((rect) => rectToClientRect(getBoundingRect(rect)));
}
var inline = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "inline",
    options,
    async fn(state) {
      const {
        placement,
        elements,
        rects,
        platform: platform2,
        strategy
      } = state;
      const {
        padding = 2,
        x,
        y
      } = evaluate(options, state);
      const nativeClientRects = Array.from(await (platform2.getClientRects == null ? void 0 : platform2.getClientRects(elements.reference)) || []);
      if (!nativeClientRects.length) {
        return {};
      }
      const clientRects = getRectsByLine(nativeClientRects);
      const fallback = rectToClientRect(getBoundingRect(nativeClientRects));
      const paddingObject = getPaddingObject(padding);
      function getBoundingClientRect2() {
        if (clientRects.length === 2 && (clientRects[0].left > clientRects[1].right || clientRects[1].left > clientRects[0].right) && x != null && y != null) {
          return clientRects.find((rect) => x > rect.left - paddingObject.left && x < rect.right + paddingObject.right && y > rect.top - paddingObject.top && y < rect.bottom + paddingObject.bottom) || fallback;
        }
        if (clientRects.length >= 2) {
          if (getSideAxis(placement) === "y") {
            const firstRect = clientRects[0];
            const lastRect = clientRects[clientRects.length - 1];
            const isTop = getSide2(placement) === "top";
            const top2 = firstRect.top;
            const bottom2 = lastRect.bottom;
            const left = isTop ? firstRect.left : lastRect.left;
            const right = isTop ? firstRect.right : lastRect.right;
            return rectToClientRect({
              x: left,
              y: top2,
              width: right - left,
              height: bottom2 - top2
            });
          }
          const isLeftSide = getSide2(placement) === "left";
          const maxRight = max(...clientRects.map((rect) => rect.right));
          const minLeft = min(...clientRects.map((rect) => rect.left));
          const measureRects = clientRects.filter((rect) => isLeftSide ? rect.left === minLeft : rect.right === maxRight);
          const top = measureRects[0].top;
          const bottom = measureRects[measureRects.length - 1].bottom;
          return rectToClientRect({
            x: minLeft,
            y: top,
            width: maxRight - minLeft,
            height: bottom - top
          });
        }
        return fallback;
      }
      const resetRects = await platform2.getElementRects({
        reference: {
          getBoundingClientRect: getBoundingClientRect2
        },
        floating: elements.floating,
        strategy
      });
      if (rects.reference.x !== resetRects.reference.x || rects.reference.y !== resetRects.reference.y || rects.reference.width !== resetRects.reference.width || rects.reference.height !== resetRects.reference.height) {
        return {
          reset: {
            rects: resetRects
          }
        };
      }
      return {};
    }
  };
};
var originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide2(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
var offset = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
var shift2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement,
        platform: platform2
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x2,
              y: y2
            } = _ref;
            return {
              x: x2,
              y: y2
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(placement);
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
      if (checkMainAxis) {
        mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
      }
      if (checkCrossAxis) {
        crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
var size = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      const {
        placement,
        rects,
        platform: platform2,
        elements
      } = state;
      const {
        apply: apply2 = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const side = getSide2(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const shiftData = state.middlewareData.shift;
      const noShift = !shiftData;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if (shiftData != null && shiftData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if (shiftData != null && shiftData.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        if (isYAxis) {
          availableWidth = width - 2 * max(overflow.left, overflow.right);
        } else {
          availableHeight = height - 2 * max(overflow.top, overflow.bottom);
        }
      }
      await apply2({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform2.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};

// node_modules/.pnpm/@floating-ui+utils@0.2.12/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle2(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
  return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
  try {
    if (element.matches(":popover-open")) {
      return true;
    }
  } catch (_e) {
  }
  try {
    return element.matches(":modal");
  } catch (_e) {
    return false;
  }
}
var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
var containRe = /paint|layout|strict|content/;
var isNotNone = (value) => !!value && value !== "none";
var isWebKitValue;
function isContainingBlock(elementOrCss) {
  const css = isElement(elementOrCss) ? getComputedStyle2(elementOrCss) : elementOrCss;
  return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (isWebKitValue == null) {
    isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
  }
  return isWebKitValue;
}
function isLastTraversableNode(node) {
  return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle2(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode2 = getParentNode(node);
  if (isLastTraversableNode(parentNode2)) {
    return (node.ownerDocument || node).body;
  }
  if (isHTMLElement(parentNode2) && isOverflowElement(parentNode2)) {
    return parentNode2;
  }
  return getNearestOverflowAncestor(parentNode2);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  } else {
    return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
  }
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}

// node_modules/.pnpm/@floating-ui+dom@1.8.0/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getCssDimensions(element) {
  const css = getComputedStyle2(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}
var noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect2 = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect2.left + visualOffsets.x) / scale.x;
  let y = (clientRect2.top + visualOffsets.y) / scale.y;
  let width = clientRect2.width / scale.x;
  let height = clientRect2.height / scale.y;
  if (domElement && offsetParent) {
    const win = getWindow(domElement);
    const offsetWin = isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle2(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}
function getWindowScrollBarX(element, rect) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y = htmlRect.top + scroll.scrollTop;
  return {
    x,
    y
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element) {
  return element.getClientRects ? Array.from(element.getClientRects()) : [];
}
function getDocumentRect(html) {
  const scroll = getNodeScroll(html);
  const body = html.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(html);
  const y = -scroll.scrollTop;
  if (getComputedStyle2(body).direction === "rtl") {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}
var SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy, rootBoundary) {
  if (rootBoundary === void 0) {
    rootBoundary = "viewport";
  }
  const isLayoutViewport = rootBoundary === "layoutViewport";
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
    if (isLayoutViewport) {
      if (!layoutRelativeClientCoords) {
        x = -visualViewport.offsetLeft;
        y = -visualViewport.offsetTop;
      }
    } else {
      width = visualViewport.width;
      height = visualViewport.height;
      if (layoutRelativeClientCoords) {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc2 = html.ownerDocument;
    const body = doc2.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc2.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
    if (gutter <= SCROLLBAR_MAX) {
      width -= gutter;
    }
  }
  return {
    width,
    height,
    x,
    y
  };
}
function getInnerBoundingClientRect(element, strategy) {
  const clientRect2 = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect2.top + element.clientTop;
  const left = clientRect2.left + element.clientLeft;
  const scale = getScale(element);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") {
    rect = getViewportRect(element, strategy, clippingAncestor);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect);
}
function getClippingElementAncestors(element, cache) {
  const cachedResult2 = cache.get(element);
  if (cachedResult2) {
    return cachedResult2;
  }
  let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let lastKeptComputedStyle = null;
  const elementIsFixed = getComputedStyle2(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle2(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
    const shouldDropCurrentNode = !currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static");
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      lastKeptComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
  let top = firstRect.top;
  let right = firstRect.right;
  let bottom = firstRect.bottom;
  let left = firstRect.left;
  for (let i = 1; i < clippingAncestors.length; i++) {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
    top = max(rect.top, top);
    right = min(rect.right, right);
    bottom = min(rect.bottom, bottom);
    left = max(rect.left, left);
  }
  return {
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };
}
function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  if (!isOffsetParentAnElement && documentElement) {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}
function isStaticPositioned(element) {
  return getComputedStyle2(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}
var getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element) {
  return getComputedStyle2(element).direction === "rtl";
}
var platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
var offset2 = offset;
var autoPlacement2 = autoPlacement;
var shift3 = shift2;
var flip2 = flip;
var size2 = size;
var hide2 = hide;
var arrow2 = arrow;
var inline2 = inline;
var computePosition2 = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = options != null ? options : {};
  const platformWithCache = {
    ...platform,
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

// node_modules/.pnpm/prosemirror-tables@1.8.5/node_modules/prosemirror-tables/dist/index.js
var readFromCache;
var addToCache;
if (typeof WeakMap != "undefined") {
  let cache = /* @__PURE__ */ new WeakMap();
  readFromCache = (key) => cache.get(key);
  addToCache = (key, value) => {
    cache.set(key, value);
    return value;
  };
} else {
  const cache = [];
  const cacheSize = 10;
  let cachePos = 0;
  readFromCache = (key) => {
    for (let i = 0; i < cache.length; i += 2) if (cache[i] == key) return cache[i + 1];
  };
  addToCache = (key, value) => {
    if (cachePos == cacheSize) cachePos = 0;
    cache[cachePos++] = key;
    return cache[cachePos++] = value;
  };
}
var TableMap = class {
  constructor(width, height, map2, problems) {
    this.width = width;
    this.height = height;
    this.map = map2;
    this.problems = problems;
  }
  findCell(pos) {
    for (let i = 0; i < this.map.length; i++) {
      const curPos = this.map[i];
      if (curPos != pos) continue;
      const left = i % this.width;
      const top = i / this.width | 0;
      let right = left + 1;
      let bottom = top + 1;
      for (let j = 1; right < this.width && this.map[i + j] == curPos; j++) right++;
      for (let j = 1; bottom < this.height && this.map[i + this.width * j] == curPos; j++) bottom++;
      return {
        left,
        top,
        right,
        bottom
      };
    }
    throw new RangeError(`No cell with offset ${pos} found`);
  }
  colCount(pos) {
    for (let i = 0; i < this.map.length; i++) if (this.map[i] == pos) return i % this.width;
    throw new RangeError(`No cell with offset ${pos} found`);
  }
  nextCell(pos, axis, dir) {
    const { left, right, top, bottom } = this.findCell(pos);
    if (axis == "horiz") {
      if (dir < 0 ? left == 0 : right == this.width) return null;
      return this.map[top * this.width + (dir < 0 ? left - 1 : right)];
    } else {
      if (dir < 0 ? top == 0 : bottom == this.height) return null;
      return this.map[left + this.width * (dir < 0 ? top - 1 : bottom)];
    }
  }
  rectBetween(a, b) {
    const { left: leftA, right: rightA, top: topA, bottom: bottomA } = this.findCell(a);
    const { left: leftB, right: rightB, top: topB, bottom: bottomB } = this.findCell(b);
    return {
      left: Math.min(leftA, leftB),
      top: Math.min(topA, topB),
      right: Math.max(rightA, rightB),
      bottom: Math.max(bottomA, bottomB)
    };
  }
  cellsInRect(rect) {
    const result = [];
    const seen = {};
    for (let row = rect.top; row < rect.bottom; row++) for (let col = rect.left; col < rect.right; col++) {
      const index = row * this.width + col;
      const pos = this.map[index];
      if (seen[pos]) continue;
      seen[pos] = true;
      if (col == rect.left && col && this.map[index - 1] == pos || row == rect.top && row && this.map[index - this.width] == pos) continue;
      result.push(pos);
    }
    return result;
  }
  positionAt(row, col, table) {
    for (let i = 0, rowStart = 0; ; i++) {
      const rowEnd = rowStart + table.child(i).nodeSize;
      if (i == row) {
        let index = col + row * this.width;
        const rowEndIndex = (row + 1) * this.width;
        while (index < rowEndIndex && this.map[index] < rowStart) index++;
        return index == rowEndIndex ? rowEnd - 1 : this.map[index];
      }
      rowStart = rowEnd;
    }
  }
  static get(table) {
    return readFromCache(table) || addToCache(table, computeMap(table));
  }
};
function computeMap(table) {
  if (table.type.spec.tableRole != "table") throw new RangeError("Not a table node: " + table.type.name);
  const width = findWidth(table), height = table.childCount;
  const map2 = [];
  let mapPos = 0;
  let problems = null;
  const colWidths = [];
  for (let i = 0, e = width * height; i < e; i++) map2[i] = 0;
  for (let row = 0, pos = 0; row < height; row++) {
    const rowNode = table.child(row);
    pos++;
    for (let i = 0; ; i++) {
      while (mapPos < map2.length && map2[mapPos] != 0) mapPos++;
      if (i == rowNode.childCount) break;
      const cellNode = rowNode.child(i);
      const { colspan, rowspan, colwidth } = cellNode.attrs;
      for (let h = 0; h < rowspan; h++) {
        if (h + row >= height) {
          (problems || (problems = [])).push({
            type: "overlong_rowspan",
            pos,
            n: rowspan - h
          });
          break;
        }
        const start = mapPos + h * width;
        for (let w = 0; w < colspan; w++) {
          if (map2[start + w] == 0) map2[start + w] = pos;
          else (problems || (problems = [])).push({
            type: "collision",
            row,
            pos,
            n: colspan - w
          });
          const colW = colwidth && colwidth[w];
          if (colW) {
            const widthIndex = (start + w) % width * 2, prev = colWidths[widthIndex];
            if (prev == null || prev != colW && colWidths[widthIndex + 1] == 1) {
              colWidths[widthIndex] = colW;
              colWidths[widthIndex + 1] = 1;
            } else if (prev == colW) colWidths[widthIndex + 1]++;
          }
        }
      }
      mapPos += colspan;
      pos += cellNode.nodeSize;
    }
    const expectedPos = (row + 1) * width;
    let missing = 0;
    while (mapPos < expectedPos) if (map2[mapPos++] == 0) missing++;
    if (missing) (problems || (problems = [])).push({
      type: "missing",
      row,
      n: missing
    });
    pos++;
  }
  if (width === 0 || height === 0) (problems || (problems = [])).push({ type: "zero_sized" });
  const tableMap = new TableMap(width, height, map2, problems);
  let badWidths = false;
  for (let i = 0; !badWidths && i < colWidths.length; i += 2) if (colWidths[i] != null && colWidths[i + 1] < height) badWidths = true;
  if (badWidths) findBadColWidths(tableMap, colWidths, table);
  return tableMap;
}
function findWidth(table) {
  let width = -1;
  let hasRowSpan = false;
  for (let row = 0; row < table.childCount; row++) {
    const rowNode = table.child(row);
    let rowWidth = 0;
    if (hasRowSpan) for (let j = 0; j < row; j++) {
      const prevRow = table.child(j);
      for (let i = 0; i < prevRow.childCount; i++) {
        const cell = prevRow.child(i);
        if (j + cell.attrs.rowspan > row) rowWidth += cell.attrs.colspan;
      }
    }
    for (let i = 0; i < rowNode.childCount; i++) {
      const cell = rowNode.child(i);
      rowWidth += cell.attrs.colspan;
      if (cell.attrs.rowspan > 1) hasRowSpan = true;
    }
    if (width == -1) width = rowWidth;
    else if (width != rowWidth) width = Math.max(width, rowWidth);
  }
  return width;
}
function findBadColWidths(map2, colWidths, table) {
  if (!map2.problems) map2.problems = [];
  const seen = {};
  for (let i = 0; i < map2.map.length; i++) {
    const pos = map2.map[i];
    if (seen[pos]) continue;
    seen[pos] = true;
    const node = table.nodeAt(pos);
    if (!node) throw new RangeError(`No cell with offset ${pos} found`);
    let updated = null;
    const attrs = node.attrs;
    for (let j = 0; j < attrs.colspan; j++) {
      const colWidth = colWidths[(i + j) % map2.width * 2];
      if (colWidth != null && (!attrs.colwidth || attrs.colwidth[j] != colWidth)) (updated || (updated = freshColWidth(attrs)))[j] = colWidth;
    }
    if (updated) map2.problems.unshift({
      type: "colwidth mismatch",
      pos,
      colwidth: updated
    });
  }
}
function freshColWidth(attrs) {
  if (attrs.colwidth) return attrs.colwidth.slice();
  const result = [];
  for (let i = 0; i < attrs.colspan; i++) result.push(0);
  return result;
}
function tableNodeTypes(schema) {
  let result = schema.cached.tableNodeTypes;
  if (!result) {
    result = schema.cached.tableNodeTypes = {};
    for (const name in schema.nodes) {
      const type = schema.nodes[name], role = type.spec.tableRole;
      if (role) result[role] = type;
    }
  }
  return result;
}
var tableEditingKey = new PluginKey("selectingCells");
function cellAround($pos) {
  for (let d = $pos.depth - 1; d > 0; d--) if ($pos.node(d).type.spec.tableRole == "row") return $pos.node(0).resolve($pos.before(d + 1));
  return null;
}
function isInTable(state) {
  const $head = state.selection.$head;
  for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "row") return true;
  return false;
}
function selectionCell(state) {
  const sel = state.selection;
  if ("$anchorCell" in sel && sel.$anchorCell) return sel.$anchorCell.pos > sel.$headCell.pos ? sel.$anchorCell : sel.$headCell;
  else if ("node" in sel && sel.node && sel.node.type.spec.tableRole == "cell") return sel.$anchor;
  const $cell = cellAround(sel.$head) || cellNear(sel.$head);
  if ($cell) return $cell;
  throw new RangeError(`No cell found around position ${sel.head}`);
}
function cellNear($pos) {
  for (let after = $pos.nodeAfter, pos = $pos.pos; after; after = after.firstChild, pos++) {
    const role = after.type.spec.tableRole;
    if (role == "cell" || role == "header_cell") return $pos.doc.resolve(pos);
  }
  for (let before = $pos.nodeBefore, pos = $pos.pos; before; before = before.lastChild, pos--) {
    const role = before.type.spec.tableRole;
    if (role == "cell" || role == "header_cell") return $pos.doc.resolve(pos - before.nodeSize);
  }
}
function pointsAtCell($pos) {
  return $pos.parent.type.spec.tableRole == "row" && !!$pos.nodeAfter;
}
function inSameTable($cellA, $cellB) {
  return $cellA.depth == $cellB.depth && $cellA.pos >= $cellB.start(-1) && $cellA.pos <= $cellB.end(-1);
}
function nextCell($pos, axis, dir) {
  const table = $pos.node(-1);
  const map2 = TableMap.get(table);
  const tableStart = $pos.start(-1);
  const moved = map2.nextCell($pos.pos - tableStart, axis, dir);
  return moved == null ? null : $pos.node(0).resolve(tableStart + moved);
}
function removeColSpan(attrs, pos, n = 1) {
  const result = {
    ...attrs,
    colspan: attrs.colspan - n
  };
  if (result.colwidth) {
    result.colwidth = result.colwidth.slice();
    result.colwidth.splice(pos, n);
    if (!result.colwidth.some((w) => w > 0)) result.colwidth = null;
  }
  return result;
}
var CellSelection = class CellSelection2 extends Selection {
  constructor($anchorCell, $headCell = $anchorCell) {
    const table = $anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = $anchorCell.start(-1);
    const rect = map2.rectBetween($anchorCell.pos - tableStart, $headCell.pos - tableStart);
    const doc2 = $anchorCell.node(0);
    const cells = map2.cellsInRect(rect).filter((p) => p != $headCell.pos - tableStart);
    cells.unshift($headCell.pos - tableStart);
    const ranges = cells.map((pos) => {
      const cell = table.nodeAt(pos);
      if (!cell) throw new RangeError(`No cell with offset ${pos} found`);
      const from2 = tableStart + pos + 1;
      return new SelectionRange(doc2.resolve(from2), doc2.resolve(from2 + cell.content.size));
    });
    super(ranges[0].$from, ranges[0].$to, ranges);
    this.$anchorCell = $anchorCell;
    this.$headCell = $headCell;
  }
  map(doc2, mapping) {
    const $anchorCell = doc2.resolve(mapping.map(this.$anchorCell.pos));
    const $headCell = doc2.resolve(mapping.map(this.$headCell.pos));
    if (pointsAtCell($anchorCell) && pointsAtCell($headCell) && inSameTable($anchorCell, $headCell)) {
      const tableChanged = this.$anchorCell.node(-1) != $anchorCell.node(-1);
      if (tableChanged && this.isRowSelection()) return CellSelection2.rowSelection($anchorCell, $headCell);
      else if (tableChanged && this.isColSelection()) return CellSelection2.colSelection($anchorCell, $headCell);
      else return new CellSelection2($anchorCell, $headCell);
    }
    return TextSelection.between($anchorCell, $headCell);
  }
  content() {
    const table = this.$anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = this.$anchorCell.start(-1);
    const rect = map2.rectBetween(this.$anchorCell.pos - tableStart, this.$headCell.pos - tableStart);
    const seen = {};
    const rows = [];
    for (let row = rect.top; row < rect.bottom; row++) {
      const rowContent = [];
      for (let index = row * map2.width + rect.left, col = rect.left; col < rect.right; col++, index++) {
        const pos = map2.map[index];
        if (seen[pos]) continue;
        seen[pos] = true;
        const cellRect = map2.findCell(pos);
        let cell = table.nodeAt(pos);
        if (!cell) throw new RangeError(`No cell with offset ${pos} found`);
        const extraLeft = rect.left - cellRect.left;
        const extraRight = cellRect.right - rect.right;
        if (extraLeft > 0 || extraRight > 0) {
          let attrs = cell.attrs;
          if (extraLeft > 0) attrs = removeColSpan(attrs, 0, extraLeft);
          if (extraRight > 0) attrs = removeColSpan(attrs, attrs.colspan - extraRight, extraRight);
          if (cellRect.left < rect.left) {
            cell = cell.type.createAndFill(attrs);
            if (!cell) throw new RangeError(`Could not create cell with attrs ${JSON.stringify(attrs)}`);
          } else cell = cell.type.create(attrs, cell.content);
        }
        if (cellRect.top < rect.top || cellRect.bottom > rect.bottom) {
          const attrs = {
            ...cell.attrs,
            rowspan: Math.min(cellRect.bottom, rect.bottom) - Math.max(cellRect.top, rect.top)
          };
          if (cellRect.top < rect.top) cell = cell.type.createAndFill(attrs);
          else cell = cell.type.create(attrs, cell.content);
        }
        rowContent.push(cell);
      }
      rows.push(table.child(row).copy(Fragment.from(rowContent)));
    }
    const fragment = this.isColSelection() && this.isRowSelection() ? table : rows;
    return new Slice(Fragment.from(fragment), 1, 1);
  }
  replace(tr, content = Slice.empty) {
    const mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      const { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      tr.replace(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
    }
    const sel = Selection.findFrom(tr.doc.resolve(tr.mapping.slice(mapFrom).map(this.to)), -1);
    if (sel) tr.setSelection(sel);
  }
  replaceWith(tr, node) {
    this.replace(tr, new Slice(Fragment.from(node), 0, 0));
  }
  forEachCell(f) {
    const table = this.$anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = this.$anchorCell.start(-1);
    const cells = map2.cellsInRect(map2.rectBetween(this.$anchorCell.pos - tableStart, this.$headCell.pos - tableStart));
    for (let i = 0; i < cells.length; i++) f(table.nodeAt(cells[i]), tableStart + cells[i]);
  }
  isColSelection() {
    const anchorTop = this.$anchorCell.index(-1);
    const headTop = this.$headCell.index(-1);
    if (Math.min(anchorTop, headTop) > 0) return false;
    const anchorBottom = anchorTop + this.$anchorCell.nodeAfter.attrs.rowspan;
    const headBottom = headTop + this.$headCell.nodeAfter.attrs.rowspan;
    return Math.max(anchorBottom, headBottom) == this.$headCell.node(-1).childCount;
  }
  static colSelection($anchorCell, $headCell = $anchorCell) {
    const table = $anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = $anchorCell.start(-1);
    const anchorRect = map2.findCell($anchorCell.pos - tableStart);
    const headRect = map2.findCell($headCell.pos - tableStart);
    const doc2 = $anchorCell.node(0);
    if (anchorRect.top <= headRect.top) {
      if (anchorRect.top > 0) $anchorCell = doc2.resolve(tableStart + map2.map[anchorRect.left]);
      if (headRect.bottom < map2.height) $headCell = doc2.resolve(tableStart + map2.map[map2.width * (map2.height - 1) + headRect.right - 1]);
    } else {
      if (headRect.top > 0) $headCell = doc2.resolve(tableStart + map2.map[headRect.left]);
      if (anchorRect.bottom < map2.height) $anchorCell = doc2.resolve(tableStart + map2.map[map2.width * (map2.height - 1) + anchorRect.right - 1]);
    }
    return new CellSelection2($anchorCell, $headCell);
  }
  isRowSelection() {
    const table = this.$anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = this.$anchorCell.start(-1);
    const anchorLeft = map2.colCount(this.$anchorCell.pos - tableStart);
    const headLeft = map2.colCount(this.$headCell.pos - tableStart);
    if (Math.min(anchorLeft, headLeft) > 0) return false;
    const anchorRight = anchorLeft + this.$anchorCell.nodeAfter.attrs.colspan;
    const headRight = headLeft + this.$headCell.nodeAfter.attrs.colspan;
    return Math.max(anchorRight, headRight) == map2.width;
  }
  eq(other) {
    return other instanceof CellSelection2 && other.$anchorCell.pos == this.$anchorCell.pos && other.$headCell.pos == this.$headCell.pos;
  }
  static rowSelection($anchorCell, $headCell = $anchorCell) {
    const table = $anchorCell.node(-1);
    const map2 = TableMap.get(table);
    const tableStart = $anchorCell.start(-1);
    const anchorRect = map2.findCell($anchorCell.pos - tableStart);
    const headRect = map2.findCell($headCell.pos - tableStart);
    const doc2 = $anchorCell.node(0);
    if (anchorRect.left <= headRect.left) {
      if (anchorRect.left > 0) $anchorCell = doc2.resolve(tableStart + map2.map[anchorRect.top * map2.width]);
      if (headRect.right < map2.width) $headCell = doc2.resolve(tableStart + map2.map[map2.width * (headRect.top + 1) - 1]);
    } else {
      if (headRect.left > 0) $headCell = doc2.resolve(tableStart + map2.map[headRect.top * map2.width]);
      if (anchorRect.right < map2.width) $anchorCell = doc2.resolve(tableStart + map2.map[map2.width * (anchorRect.top + 1) - 1]);
    }
    return new CellSelection2($anchorCell, $headCell);
  }
  toJSON() {
    return {
      type: "cell",
      anchor: this.$anchorCell.pos,
      head: this.$headCell.pos
    };
  }
  static fromJSON(doc2, json) {
    return new CellSelection2(doc2.resolve(json.anchor), doc2.resolve(json.head));
  }
  static create(doc2, anchorCell, headCell = anchorCell) {
    return new CellSelection2(doc2.resolve(anchorCell), doc2.resolve(headCell));
  }
  getBookmark() {
    return new CellBookmark(this.$anchorCell.pos, this.$headCell.pos);
  }
};
CellSelection.prototype.visible = false;
Selection.jsonID("cell", CellSelection);
var CellBookmark = class CellBookmark2 {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new CellBookmark2(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc2) {
    const $anchorCell = doc2.resolve(this.anchor), $headCell = doc2.resolve(this.head);
    if ($anchorCell.parent.type.spec.tableRole == "row" && $headCell.parent.type.spec.tableRole == "row" && $anchorCell.index() < $anchorCell.parent.childCount && $headCell.index() < $headCell.parent.childCount && inSameTable($anchorCell, $headCell)) return new CellSelection($anchorCell, $headCell);
    else return Selection.near($headCell, 1);
  }
};
var fixTablesKey = new PluginKey("fix-tables");
function selectedRect(state) {
  const sel = state.selection;
  const $pos = selectionCell(state);
  const table = $pos.node(-1);
  const tableStart = $pos.start(-1);
  const map2 = TableMap.get(table);
  return {
    ...sel instanceof CellSelection ? map2.rectBetween(sel.$anchorCell.pos - tableStart, sel.$headCell.pos - tableStart) : map2.findCell($pos.pos - tableStart),
    tableStart,
    map: map2,
    table
  };
}
function deprecated_toggleHeader(type) {
  return function(state, dispatch) {
    if (!isInTable(state)) return false;
    if (dispatch) {
      const types = tableNodeTypes(state.schema);
      const rect = selectedRect(state), tr = state.tr;
      const cells = rect.map.cellsInRect(type == "column" ? {
        left: rect.left,
        top: 0,
        right: rect.right,
        bottom: rect.map.height
      } : type == "row" ? {
        left: 0,
        top: rect.top,
        right: rect.map.width,
        bottom: rect.bottom
      } : rect);
      const nodes = cells.map((pos) => rect.table.nodeAt(pos));
      for (let i = 0; i < cells.length; i++) if (nodes[i].type == types.header_cell) tr.setNodeMarkup(rect.tableStart + cells[i], types.cell, nodes[i].attrs);
      if (tr.steps.length === 0) for (let i = 0; i < cells.length; i++) tr.setNodeMarkup(rect.tableStart + cells[i], types.header_cell, nodes[i].attrs);
      dispatch(tr);
    }
    return true;
  };
}
function isHeaderEnabledByType(type, rect, types) {
  const cellPositions = rect.map.cellsInRect({
    left: 0,
    top: 0,
    right: type == "row" ? rect.map.width : 1,
    bottom: type == "column" ? rect.map.height : 1
  });
  for (let i = 0; i < cellPositions.length; i++) {
    const cell = rect.table.nodeAt(cellPositions[i]);
    if (cell && cell.type !== types.header_cell) return false;
  }
  return true;
}
function toggleHeader(type, options) {
  options = options || { useDeprecatedLogic: false };
  if (options.useDeprecatedLogic) return deprecated_toggleHeader(type);
  return function(state, dispatch) {
    if (!isInTable(state)) return false;
    if (dispatch) {
      const types = tableNodeTypes(state.schema);
      const rect = selectedRect(state), tr = state.tr;
      const isHeaderRowEnabled = isHeaderEnabledByType("row", rect, types);
      const isHeaderColumnEnabled = isHeaderEnabledByType("column", rect, types);
      const selectionStartsAt = (type === "column" ? isHeaderRowEnabled : type === "row" ? isHeaderColumnEnabled : false) ? 1 : 0;
      const cellsRect = type == "column" ? {
        left: 0,
        top: selectionStartsAt,
        right: 1,
        bottom: rect.map.height
      } : type == "row" ? {
        left: selectionStartsAt,
        top: 0,
        right: rect.map.width,
        bottom: 1
      } : rect;
      const newType = type == "column" ? isHeaderColumnEnabled ? types.cell : types.header_cell : type == "row" ? isHeaderRowEnabled ? types.cell : types.header_cell : types.cell;
      rect.map.cellsInRect(cellsRect).forEach((relativeCellPos) => {
        const cellPos = relativeCellPos + rect.tableStart;
        const cell = tr.doc.nodeAt(cellPos);
        if (cell) tr.setNodeMarkup(cellPos, newType, cell.attrs);
      });
      dispatch(tr);
    }
    return true;
  };
}
var toggleHeaderRow = toggleHeader("row", { useDeprecatedLogic: true });
var toggleHeaderColumn = toggleHeader("column", { useDeprecatedLogic: true });
var toggleHeaderCell = toggleHeader("cell", { useDeprecatedLogic: true });
function deleteCellSelection(state, dispatch) {
  const sel = state.selection;
  if (!(sel instanceof CellSelection)) return false;
  if (dispatch) {
    const tr = state.tr;
    const baseContent = tableNodeTypes(state.schema).cell.createAndFill().content;
    sel.forEachCell((cell, pos) => {
      if (!cell.content.eq(baseContent)) tr.replace(tr.mapping.map(pos + 1), tr.mapping.map(pos + cell.nodeSize - 1), new Slice(baseContent, 0, 0));
    });
    if (tr.docChanged) dispatch(tr);
  }
  return true;
}
var handleKeyDown = keydownHandler({
  ArrowLeft: arrow3("horiz", -1),
  ArrowRight: arrow3("horiz", 1),
  ArrowUp: arrow3("vert", -1),
  ArrowDown: arrow3("vert", 1),
  "Shift-ArrowLeft": shiftArrow("horiz", -1),
  "Shift-ArrowRight": shiftArrow("horiz", 1),
  "Shift-ArrowUp": shiftArrow("vert", -1),
  "Shift-ArrowDown": shiftArrow("vert", 1),
  Backspace: deleteCellSelection,
  "Mod-Backspace": deleteCellSelection,
  Delete: deleteCellSelection,
  "Mod-Delete": deleteCellSelection
});
function maybeSetSelection(state, dispatch, selection) {
  if (selection.eq(state.selection)) return false;
  if (dispatch) dispatch(state.tr.setSelection(selection).scrollIntoView());
  return true;
}
function arrow3(axis, dir) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const sel = state.selection;
    if (sel instanceof CellSelection) return maybeSetSelection(state, dispatch, Selection.near(sel.$headCell, dir));
    if (axis != "horiz" && !sel.empty) return false;
    const end = atEndOfCell(view, axis, dir);
    if (end == null) return false;
    if (axis == "horiz") return maybeSetSelection(state, dispatch, Selection.near(state.doc.resolve(sel.head + dir), dir));
    else {
      const $cell = state.doc.resolve(end);
      const $next = nextCell($cell, axis, dir);
      let newSel;
      if ($next) newSel = Selection.near($next, 1);
      else if (dir < 0) newSel = Selection.near(state.doc.resolve($cell.before(-1)), -1);
      else newSel = Selection.near(state.doc.resolve($cell.after(-1)), 1);
      return maybeSetSelection(state, dispatch, newSel);
    }
  };
}
function shiftArrow(axis, dir) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const sel = state.selection;
    let cellSel;
    if (sel instanceof CellSelection) cellSel = sel;
    else {
      const end = atEndOfCell(view, axis, dir);
      if (end == null) return false;
      cellSel = new CellSelection(state.doc.resolve(end));
    }
    const $head = nextCell(cellSel.$headCell, axis, dir);
    if (!$head) return false;
    return maybeSetSelection(state, dispatch, new CellSelection(cellSel.$anchorCell, $head));
  };
}
function atEndOfCell(view, axis, dir) {
  if (!(view.state.selection instanceof TextSelection)) return null;
  const { $head } = view.state.selection;
  for (let d = $head.depth - 1; d >= 0; d--) {
    const parent = $head.node(d);
    if ((dir < 0 ? $head.index(d) : $head.indexAfter(d)) != (dir < 0 ? 0 : parent.childCount)) return null;
    if (parent.type.spec.tableRole == "cell" || parent.type.spec.tableRole == "header_cell") {
      const cellPos = $head.before(d);
      const dirStr = axis == "vert" ? dir > 0 ? "down" : "up" : dir > 0 ? "right" : "left";
      return view.endOfTextblock(dirStr) ? cellPos : null;
    }
  }
  return null;
}
var columnResizingPluginKey = new PluginKey("tableColumnResizing");

// node_modules/.pnpm/@tiptap+extension-bubble-menu@3.32.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm@3.32.0/node_modules/@tiptap/extension-bubble-menu/dist/index.js
function combineDOMRects(rect1, rect2) {
  const top = Math.min(rect1.top, rect2.top);
  const bottom = Math.max(rect1.bottom, rect2.bottom);
  const left = Math.min(rect1.left, rect2.left);
  const width = Math.max(rect1.right, rect2.right) - left;
  const height = bottom - top;
  return new DOMRect(left, top, width, height);
}
var BubbleMenuView = class {
  get middlewares() {
    const middlewares = [];
    if (this.floatingUIOptions.flip) middlewares.push(flip2(typeof this.floatingUIOptions.flip !== "boolean" ? this.floatingUIOptions.flip : void 0));
    if (this.floatingUIOptions.shift) middlewares.push(shift3(typeof this.floatingUIOptions.shift !== "boolean" ? this.floatingUIOptions.shift : void 0));
    if (this.floatingUIOptions.offset) middlewares.push(offset2(typeof this.floatingUIOptions.offset !== "boolean" ? this.floatingUIOptions.offset : void 0));
    if (this.floatingUIOptions.arrow) middlewares.push(arrow2(this.floatingUIOptions.arrow));
    if (this.floatingUIOptions.size) middlewares.push(size2(typeof this.floatingUIOptions.size !== "boolean" ? this.floatingUIOptions.size : void 0));
    if (this.floatingUIOptions.autoPlacement) middlewares.push(autoPlacement2(typeof this.floatingUIOptions.autoPlacement !== "boolean" ? this.floatingUIOptions.autoPlacement : void 0));
    if (this.floatingUIOptions.hide) middlewares.push(hide2(typeof this.floatingUIOptions.hide !== "boolean" ? this.floatingUIOptions.hide : void 0));
    if (this.floatingUIOptions.inline) middlewares.push(inline2(typeof this.floatingUIOptions.inline !== "boolean" ? this.floatingUIOptions.inline : void 0));
    return middlewares;
  }
  get virtualElement() {
    var _this$getReferencedVi, _this$view;
    const { selection } = this.editor.state;
    const referencedVirtualElement = (_this$getReferencedVi = this.getReferencedVirtualElement) === null || _this$getReferencedVi === void 0 ? void 0 : _this$getReferencedVi.call(this);
    if (referencedVirtualElement) return referencedVirtualElement;
    if (!((_this$view = this.view) === null || _this$view === void 0 || (_this$view = _this$view.dom) === null || _this$view === void 0 ? void 0 : _this$view.parentNode)) return;
    const domRect = posToDOMRect(this.view, selection.from, selection.to);
    let virtualElement = {
      getBoundingClientRect: () => domRect,
      getClientRects: () => [domRect]
    };
    if (selection instanceof NodeSelection) {
      let node = this.view.nodeDOM(selection.from);
      const nodeViewWrapper = node.dataset.nodeViewWrapper ? node : node.querySelector("[data-node-view-wrapper]");
      if (nodeViewWrapper) node = nodeViewWrapper;
      if (node) virtualElement = {
        getBoundingClientRect: () => node.getBoundingClientRect(),
        getClientRects: () => [node.getBoundingClientRect()]
      };
    }
    if (selection instanceof CellSelection) {
      const { $anchorCell, $headCell } = selection;
      const from2 = $anchorCell ? $anchorCell.pos : $headCell.pos;
      const to = $headCell ? $headCell.pos : $anchorCell.pos;
      const fromDOM = this.view.nodeDOM(from2);
      const toDOM = this.view.nodeDOM(to);
      if (!fromDOM || !toDOM) return;
      const clientRect2 = fromDOM === toDOM ? fromDOM.getBoundingClientRect() : combineDOMRects(fromDOM.getBoundingClientRect(), toDOM.getBoundingClientRect());
      virtualElement = {
        getBoundingClientRect: () => clientRect2,
        getClientRects: () => [clientRect2]
      };
    }
    return virtualElement;
  }
  constructor({ editor, element, view, pluginKey = "bubbleMenu", updateDelay = 250, resizeDelay = 60, shouldShow, appendTo, getReferencedVirtualElement, options }) {
    var _options$scrollTarget;
    this.preventHide = false;
    this.isVisible = false;
    this.scrollTarget = window;
    this.floatingUIOptions = {
      strategy: "absolute",
      placement: "top",
      offset: 8,
      flip: {},
      shift: {},
      arrow: false,
      size: false,
      autoPlacement: false,
      hide: false,
      inline: false,
      onShow: void 0,
      onHide: void 0,
      onUpdate: void 0,
      onDestroy: void 0
    };
    this.shouldShow = ({ view: view2, state, from: from2, to }) => {
      const { doc: doc2, selection } = state;
      const { empty: empty2 } = selection;
      const isEmptyTextBlock = !doc2.textBetween(from2, to).length && isTextSelection(state.selection);
      const isChildOfMenu = this.element.contains(document.activeElement);
      if (!(view2.hasFocus() || isChildOfMenu) || empty2 || isEmptyTextBlock || !this.editor.isEditable) return false;
      return true;
    };
    this.mousedownHandler = () => {
      this.preventHide = true;
    };
    this.dragstartHandler = () => {
      this.hide();
    };
    this.resizeHandler = () => {
      if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = window.setTimeout(() => {
        this.updatePosition();
      }, this.resizeDelay);
    };
    this.focusHandler = () => {
      setTimeout(() => this.update(this.editor.view));
    };
    this.blurHandler = ({ event }) => {
      var _this$element$parentN;
      if (this.editor.isDestroyed) {
        this.destroy();
        return;
      }
      if (this.preventHide) {
        this.preventHide = false;
        return;
      }
      if ((event === null || event === void 0 ? void 0 : event.relatedTarget) && ((_this$element$parentN = this.element.parentNode) === null || _this$element$parentN === void 0 ? void 0 : _this$element$parentN.contains(event.relatedTarget))) return;
      if ((event === null || event === void 0 ? void 0 : event.relatedTarget) === this.editor.view.dom) return;
      this.hide();
    };
    this.handleDebouncedUpdate = (view2, oldState) => {
      const selectionChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.selection.eq(view2.state.selection));
      const docChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.doc.eq(view2.state.doc));
      if (!selectionChanged && !docChanged) return;
      if (this.updateDebounceTimer) clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = window.setTimeout(() => {
        this.updateHandler(view2, selectionChanged, docChanged, oldState);
      }, this.updateDelay);
    };
    this.updateHandler = (view2, selectionChanged, docChanged, oldState) => {
      const { composing } = view2;
      if (composing || !selectionChanged && !docChanged) return;
      if (!this.getShouldShow(oldState)) {
        this.hide();
        return;
      }
      this.show();
      this.updatePosition();
    };
    this.transactionHandler = ({ transaction: tr }) => {
      const meta = tr.getMeta(this.pluginKey);
      if (meta === "updatePosition") this.updatePosition();
      else if (meta && typeof meta === "object" && meta.type === "updateOptions") this.updateOptions(meta.options);
      else if (meta === "hide") this.hide();
      else if (meta === "show") {
        this.updatePosition();
        this.show();
      }
    };
    this.editor = editor;
    this.element = element;
    this.view = view;
    this.pluginKey = pluginKey;
    this.updateDelay = updateDelay;
    this.resizeDelay = resizeDelay;
    this.appendTo = appendTo;
    this.scrollTarget = (_options$scrollTarget = options === null || options === void 0 ? void 0 : options.scrollTarget) !== null && _options$scrollTarget !== void 0 ? _options$scrollTarget : window;
    this.getReferencedVirtualElement = getReferencedVirtualElement;
    this.floatingUIOptions = {
      ...this.floatingUIOptions,
      ...options
    };
    this.element.tabIndex = 0;
    if (shouldShow) this.shouldShow = shouldShow;
    this.element.addEventListener("mousedown", this.mousedownHandler, { capture: true });
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);
    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
    this.editor.on("transaction", this.transactionHandler);
    window.addEventListener("resize", this.resizeHandler);
    this.scrollTarget.addEventListener("scroll", this.resizeHandler);
    this.update(view, view.state);
    if (this.getShouldShow()) {
      this.show();
      this.updatePosition();
    }
  }
  updatePosition() {
    if (!this.isVisible) return;
    const virtualElement = this.virtualElement;
    if (!virtualElement) return;
    computePosition2(virtualElement, this.element, {
      placement: this.floatingUIOptions.placement,
      strategy: this.floatingUIOptions.strategy,
      middleware: this.middlewares
    }).then(({ x, y, strategy, middlewareData }) => {
      var _middlewareData$hide, _middlewareData$hide2;
      if (!this.isVisible || this.editor.isDestroyed || !this.element.isConnected) return;
      if (((_middlewareData$hide = middlewareData.hide) === null || _middlewareData$hide === void 0 ? void 0 : _middlewareData$hide.referenceHidden) || ((_middlewareData$hide2 = middlewareData.hide) === null || _middlewareData$hide2 === void 0 ? void 0 : _middlewareData$hide2.escaped)) {
        this.element.style.visibility = "hidden";
        return;
      }
      this.element.style.visibility = "visible";
      this.element.style.width = "max-content";
      this.element.style.position = strategy;
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      if (this.isVisible && this.floatingUIOptions.onUpdate) this.floatingUIOptions.onUpdate();
    });
  }
  update(view, oldState) {
    const { state } = view;
    const hasValidSelection = state.selection.from !== state.selection.to;
    if (this.updateDelay > 0 && hasValidSelection) {
      this.handleDebouncedUpdate(view, oldState);
      return;
    }
    const selectionChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.selection.eq(view.state.selection));
    const docChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.doc.eq(view.state.doc));
    this.updateHandler(view, selectionChanged, docChanged, oldState);
  }
  getShouldShow(oldState) {
    var _this$shouldShow;
    const { state } = this.view;
    const { selection } = state;
    const { ranges } = selection;
    const from2 = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    return ((_this$shouldShow = this.shouldShow) === null || _this$shouldShow === void 0 ? void 0 : _this$shouldShow.call(this, {
      editor: this.editor,
      element: this.element,
      view: this.view,
      state,
      oldState,
      from: from2,
      to
    })) || false;
  }
  show() {
    var _ref;
    if (this.isVisible) return;
    this.element.style.visibility = "visible";
    this.element.style.opacity = "1";
    const appendToElement = typeof this.appendTo === "function" ? this.appendTo() : this.appendTo;
    (_ref = appendToElement !== null && appendToElement !== void 0 ? appendToElement : this.view.dom.parentElement) === null || _ref === void 0 || _ref.appendChild(this.element);
    if (this.floatingUIOptions.onShow) this.floatingUIOptions.onShow();
    this.isVisible = true;
  }
  hide() {
    if (!this.isVisible) return;
    this.element.style.visibility = "hidden";
    this.element.style.opacity = "0";
    this.element.remove();
    if (this.floatingUIOptions.onHide) this.floatingUIOptions.onHide();
    this.isVisible = false;
  }
  updateOptions(newProps) {
    if (newProps.updateDelay !== void 0) this.updateDelay = newProps.updateDelay;
    if (newProps.resizeDelay !== void 0) this.resizeDelay = newProps.resizeDelay;
    if (newProps.appendTo !== void 0) this.appendTo = newProps.appendTo;
    if (newProps.getReferencedVirtualElement !== void 0) this.getReferencedVirtualElement = newProps.getReferencedVirtualElement;
    if (newProps.shouldShow !== void 0) {
      if (newProps.shouldShow) this.shouldShow = newProps.shouldShow;
    }
    if (newProps.options !== void 0) {
      var _newProps$options$scr;
      const newScrollTarget = (_newProps$options$scr = newProps.options.scrollTarget) !== null && _newProps$options$scr !== void 0 ? _newProps$options$scr : window;
      if (newScrollTarget !== this.scrollTarget) {
        this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
        this.scrollTarget = newScrollTarget;
        this.scrollTarget.addEventListener("scroll", this.resizeHandler);
      }
      this.floatingUIOptions = {
        ...this.floatingUIOptions,
        ...newProps.options
      };
    }
  }
  destroy() {
    this.hide();
    this.element.removeEventListener("mousedown", this.mousedownHandler, { capture: true });
    this.view.dom.removeEventListener("dragstart", this.dragstartHandler);
    window.removeEventListener("resize", this.resizeHandler);
    this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
    this.editor.off("focus", this.focusHandler);
    this.editor.off("blur", this.blurHandler);
    this.editor.off("transaction", this.transactionHandler);
    if (this.floatingUIOptions.onDestroy) this.floatingUIOptions.onDestroy();
  }
};
var BubbleMenuPlugin = (options) => {
  return new Plugin({
    key: typeof options.pluginKey === "string" ? new PluginKey(options.pluginKey) : options.pluginKey,
    view: (view) => new BubbleMenuView({
      view,
      ...options
    })
  });
};
var BubbleMenu = Extension.create({
  name: "bubbleMenu",
  addOptions() {
    return {
      element: null,
      pluginKey: "bubbleMenu",
      updateDelay: void 0,
      appendTo: void 0,
      shouldShow: null
    };
  },
  addProseMirrorPlugins() {
    if (!this.options.element) return [];
    return [BubbleMenuPlugin({
      pluginKey: this.options.pluginKey,
      editor: this.editor,
      element: this.options.element,
      updateDelay: this.options.updateDelay,
      options: this.options.options,
      appendTo: this.options.appendTo,
      getReferencedVirtualElement: this.options.getReferencedVirtualElement,
      shouldShow: this.options.shouldShow
    })];
  }
});

// node_modules/.pnpm/@tiptap+react@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm_lohxrbqxtwg33brminwnmd7kcm/node_modules/@tiptap/react/dist/menus/index.js
import React2, { useEffect as useEffect3, useLayoutEffect as useLayoutEffect2, useRef as useRef3, useState as useState2 } from "react";
import { createPortal } from "react-dom";

// node_modules/.pnpm/@tiptap+extension-floating-menu@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm@3.32.0/node_modules/@tiptap/extension-floating-menu/dist/index.js
var FloatingMenuView = class {
  getTextContent(node) {
    return getText2(node, { textSerializers: getTextSerializersFromSchema(this.editor.schema) });
  }
  get middlewares() {
    const middlewares = [];
    if (this.floatingUIOptions.flip) middlewares.push(flip2(typeof this.floatingUIOptions.flip !== "boolean" ? this.floatingUIOptions.flip : void 0));
    if (this.floatingUIOptions.shift) middlewares.push(shift3(typeof this.floatingUIOptions.shift !== "boolean" ? this.floatingUIOptions.shift : void 0));
    if (this.floatingUIOptions.offset) middlewares.push(offset2(typeof this.floatingUIOptions.offset !== "boolean" ? this.floatingUIOptions.offset : void 0));
    if (this.floatingUIOptions.arrow) middlewares.push(arrow2(this.floatingUIOptions.arrow));
    if (this.floatingUIOptions.size) middlewares.push(size2(typeof this.floatingUIOptions.size !== "boolean" ? this.floatingUIOptions.size : void 0));
    if (this.floatingUIOptions.autoPlacement) middlewares.push(autoPlacement2(typeof this.floatingUIOptions.autoPlacement !== "boolean" ? this.floatingUIOptions.autoPlacement : void 0));
    if (this.floatingUIOptions.hide) middlewares.push(hide2(typeof this.floatingUIOptions.hide !== "boolean" ? this.floatingUIOptions.hide : void 0));
    if (this.floatingUIOptions.inline) middlewares.push(inline2(typeof this.floatingUIOptions.inline !== "boolean" ? this.floatingUIOptions.inline : void 0));
    return middlewares;
  }
  constructor({ editor, element, view, pluginKey = "floatingMenu", updateDelay = 250, resizeDelay = 60, options, appendTo, shouldShow }) {
    var _options$scrollTarget;
    this.preventHide = false;
    this.isVisible = false;
    this.scrollTarget = window;
    this.shouldShow = ({ view: view2, state }) => {
      const { selection } = state;
      const { $anchor, empty: empty2 } = selection;
      const isRootDepth = $anchor.depth === 1;
      const isEmptyTextBlock = $anchor.parent.isTextblock && !$anchor.parent.type.spec.code && !$anchor.parent.textContent && $anchor.parent.childCount === 0 && !this.getTextContent($anchor.parent);
      if (!view2.hasFocus() || !empty2 || !isRootDepth || !isEmptyTextBlock || !this.editor.isEditable) return false;
      return true;
    };
    this.floatingUIOptions = {
      strategy: "absolute",
      placement: "right",
      offset: 8,
      flip: {},
      shift: {},
      arrow: false,
      size: false,
      autoPlacement: false,
      hide: false,
      inline: false
    };
    this.updateHandler = (view2, selectionChanged, docChanged, oldState) => {
      const { composing } = view2;
      if (composing || !selectionChanged && !docChanged) return;
      if (!this.getShouldShow(oldState)) {
        this.hide();
        return;
      }
      this.updatePosition();
      this.show();
    };
    this.mousedownHandler = () => {
      this.preventHide = true;
    };
    this.focusHandler = () => {
      setTimeout(() => this.update(this.editor.view));
    };
    this.blurHandler = ({ event }) => {
      var _this$element$parentN;
      if (this.preventHide) {
        this.preventHide = false;
        return;
      }
      if ((event === null || event === void 0 ? void 0 : event.relatedTarget) && ((_this$element$parentN = this.element.parentNode) === null || _this$element$parentN === void 0 ? void 0 : _this$element$parentN.contains(event.relatedTarget))) return;
      if ((event === null || event === void 0 ? void 0 : event.relatedTarget) === this.editor.view.dom) return;
      this.hide();
    };
    this.transactionHandler = ({ transaction: tr }) => {
      const meta = tr.getMeta(this.pluginKey);
      if (meta === "updatePosition") this.updatePosition();
      else if (meta && typeof meta === "object" && meta.type === "updateOptions") this.updateOptions(meta.options);
      else if (meta === "hide") this.hide();
      else if (meta === "show") {
        this.updatePosition();
        this.show();
      }
    };
    this.resizeHandler = () => {
      if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = window.setTimeout(() => {
        this.updatePosition();
      }, this.resizeDelay);
    };
    this.editor = editor;
    this.element = element;
    this.view = view;
    this.pluginKey = pluginKey;
    this.updateDelay = updateDelay;
    this.resizeDelay = resizeDelay;
    this.appendTo = appendTo;
    this.scrollTarget = (_options$scrollTarget = options === null || options === void 0 ? void 0 : options.scrollTarget) !== null && _options$scrollTarget !== void 0 ? _options$scrollTarget : window;
    this.floatingUIOptions = {
      ...this.floatingUIOptions,
      ...options
    };
    this.element.tabIndex = 0;
    if (shouldShow) this.shouldShow = shouldShow;
    this.element.addEventListener("mousedown", this.mousedownHandler, { capture: true });
    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
    this.editor.on("transaction", this.transactionHandler);
    window.addEventListener("resize", this.resizeHandler);
    this.scrollTarget.addEventListener("scroll", this.resizeHandler);
    this.update(view, view.state);
    if (this.getShouldShow()) {
      this.show();
      this.updatePosition();
    }
  }
  getShouldShow(oldState) {
    var _this$shouldShow;
    const { state } = this.view;
    const { selection } = state;
    const { ranges } = selection;
    const from2 = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    return (_this$shouldShow = this.shouldShow) === null || _this$shouldShow === void 0 ? void 0 : _this$shouldShow.call(this, {
      editor: this.editor,
      view: this.view,
      state,
      oldState,
      from: from2,
      to
    });
  }
  updateOptions(newProps) {
    if (newProps.updateDelay !== void 0) this.updateDelay = newProps.updateDelay;
    if (newProps.resizeDelay !== void 0) this.resizeDelay = newProps.resizeDelay;
    if (newProps.appendTo !== void 0) this.appendTo = newProps.appendTo;
    if (newProps.shouldShow !== void 0) {
      if (newProps.shouldShow) this.shouldShow = newProps.shouldShow;
    }
    if (newProps.options !== void 0) {
      var _newProps$options$scr;
      const newScrollTarget = (_newProps$options$scr = newProps.options.scrollTarget) !== null && _newProps$options$scr !== void 0 ? _newProps$options$scr : window;
      if (newScrollTarget !== this.scrollTarget) {
        this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
        this.scrollTarget = newScrollTarget;
        this.scrollTarget.addEventListener("scroll", this.resizeHandler);
      }
      this.floatingUIOptions = {
        ...this.floatingUIOptions,
        ...newProps.options
      };
    }
  }
  updatePosition() {
    var _this$view;
    if (!((_this$view = this.view) === null || _this$view === void 0 || (_this$view = _this$view.dom) === null || _this$view === void 0 ? void 0 : _this$view.parentNode)) return;
    const { selection } = this.editor.state;
    const domRect = posToDOMRect(this.view, selection.from, selection.to);
    computePosition2({
      getBoundingClientRect: () => domRect,
      getClientRects: () => [domRect]
    }, this.element, {
      placement: this.floatingUIOptions.placement,
      strategy: this.floatingUIOptions.strategy,
      middleware: this.middlewares
    }).then(({ x, y, strategy, middlewareData }) => {
      var _middlewareData$hide, _middlewareData$hide2;
      if (((_middlewareData$hide = middlewareData.hide) === null || _middlewareData$hide === void 0 ? void 0 : _middlewareData$hide.referenceHidden) || ((_middlewareData$hide2 = middlewareData.hide) === null || _middlewareData$hide2 === void 0 ? void 0 : _middlewareData$hide2.escaped)) {
        this.element.style.visibility = "hidden";
        return;
      }
      this.element.style.visibility = "visible";
      this.element.style.width = "max-content";
      this.element.style.position = strategy;
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      if (this.isVisible && this.floatingUIOptions.onUpdate) this.floatingUIOptions.onUpdate();
    });
  }
  update(view, oldState) {
    const selectionChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.selection.eq(view.state.selection));
    const docChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.doc.eq(view.state.doc));
    this.updateHandler(view, selectionChanged, docChanged, oldState);
  }
  show() {
    var _ref;
    if (this.isVisible) return;
    this.element.style.visibility = "visible";
    this.element.style.opacity = "1";
    const appendToElement = typeof this.appendTo === "function" ? this.appendTo() : this.appendTo;
    (_ref = appendToElement !== null && appendToElement !== void 0 ? appendToElement : this.view.dom.parentElement) === null || _ref === void 0 || _ref.appendChild(this.element);
    if (this.floatingUIOptions.onShow) this.floatingUIOptions.onShow();
    this.isVisible = true;
  }
  hide() {
    if (!this.isVisible) return;
    this.element.style.visibility = "hidden";
    this.element.style.opacity = "0";
    this.element.remove();
    if (this.floatingUIOptions.onHide) this.floatingUIOptions.onHide();
    this.isVisible = false;
  }
  destroy() {
    this.hide();
    this.element.removeEventListener("mousedown", this.mousedownHandler, { capture: true });
    window.removeEventListener("resize", this.resizeHandler);
    this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
    this.editor.off("focus", this.focusHandler);
    this.editor.off("blur", this.blurHandler);
    this.editor.off("transaction", this.transactionHandler);
    if (this.floatingUIOptions.onDestroy) this.floatingUIOptions.onDestroy();
  }
};
var FloatingMenuPlugin = (options) => {
  return new Plugin({
    key: typeof options.pluginKey === "string" ? new PluginKey(options.pluginKey) : options.pluginKey,
    view: (view) => new FloatingMenuView({
      view,
      ...options
    })
  });
};
var FloatingMenu = Extension.create({
  name: "floatingMenu",
  addOptions() {
    return {
      element: null,
      options: {},
      pluginKey: "floatingMenu",
      updateDelay: void 0,
      resizeDelay: void 0,
      appendTo: void 0,
      shouldShow: null
    };
  },
  addCommands() {
    return { updateFloatingMenuPosition: () => ({ tr, dispatch }) => {
      if (dispatch) tr.setMeta(this.options.pluginKey, "updatePosition");
      return true;
    } };
  },
  addProseMirrorPlugins() {
    if (!this.options.element) return [];
    return [FloatingMenuPlugin({
      pluginKey: this.options.pluginKey,
      editor: this.editor,
      element: this.options.element,
      updateDelay: this.options.updateDelay,
      resizeDelay: this.options.resizeDelay,
      options: this.options.options,
      appendTo: this.options.appendTo,
      shouldShow: this.options.shouldShow
    })];
  }
});

// node_modules/.pnpm/@tiptap+react@3.32.0_@floating-ui+dom@1.8.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm_lohxrbqxtwg33brminwnmd7kcm/node_modules/@tiptap/react/dist/menus/index.js
function getAutoPluginKey(pluginKey, defaultName) {
  return pluginKey !== null && pluginKey !== void 0 ? pluginKey : new PluginKey(defaultName);
}
var useIsomorphicLayoutEffect2 = typeof window !== "undefined" ? useLayoutEffect2 : useEffect3;
var PLUGIN_MANAGED_STYLE_PROPERTIES = /* @__PURE__ */ new Set([
  "left",
  "opacity",
  "position",
  "top",
  "visibility",
  "width"
]);
var UNITLESS_STYLE_PROPERTIES = /* @__PURE__ */ new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "columnCount",
  "columns",
  "fillOpacity",
  "flex",
  "flexGrow",
  "flexShrink",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "tabSize",
  "widows",
  "zIndex",
  "zoom"
]);
var ATTRIBUTE_EXCLUSIONS = /* @__PURE__ */ new Set([
  "children",
  "className",
  "style"
]);
var DIRECT_PROPERTY_KEYS = /* @__PURE__ */ new Set(["tabIndex"]);
var FORWARDED_ATTRIBUTE_KEYS = /* @__PURE__ */ new Set([
  "accessKey",
  "autoCapitalize",
  "contentEditable",
  "contextMenu",
  "dir",
  "draggable",
  "enterKeyHint",
  "hidden",
  "id",
  "lang",
  "nonce",
  "role",
  "slot",
  "spellCheck",
  "tabIndex",
  "title",
  "translate"
]);
var SPECIAL_EVENT_NAMES = {
  Blur: "focusout",
  DoubleClick: "dblclick",
  Focus: "focusin",
  MouseEnter: "mouseenter",
  MouseLeave: "mouseleave"
};
function isEventProp(key, value) {
  return /^on[A-Z]/.test(key) && typeof value === "function";
}
function toAttributeName(key) {
  if (key.startsWith("aria-") || key.startsWith("data-")) return key;
  return key;
}
function isForwardedAttributeKey(key) {
  return key.startsWith("aria-") || key.startsWith("data-") || FORWARDED_ATTRIBUTE_KEYS.has(key);
}
function toStylePropertyName(key) {
  if (key.startsWith("--")) return key;
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
function toEventConfig(key) {
  var _SPECIAL_EVENT_NAMES$;
  const useCapture = key.endsWith("Capture");
  const reactEventName = (useCapture ? key.slice(0, -7) : key).slice(2);
  return {
    eventName: (_SPECIAL_EVENT_NAMES$ = SPECIAL_EVENT_NAMES[reactEventName]) !== null && _SPECIAL_EVENT_NAMES$ !== void 0 ? _SPECIAL_EVENT_NAMES$ : reactEventName.toLowerCase(),
    options: useCapture ? { capture: true } : void 0
  };
}
function createSyntheticEvent(element, nativeEvent) {
  let defaultPrevented = nativeEvent.defaultPrevented;
  let propagationStopped = false;
  const syntheticEvent = Object.create(nativeEvent);
  Object.defineProperties(syntheticEvent, {
    nativeEvent: { value: nativeEvent },
    currentTarget: { value: element },
    target: { value: nativeEvent.target },
    persist: { value: () => void 0 },
    isDefaultPrevented: { value: () => defaultPrevented },
    isPropagationStopped: { value: () => propagationStopped },
    preventDefault: { value: () => {
      defaultPrevented = true;
      nativeEvent.preventDefault();
    } },
    stopPropagation: { value: () => {
      propagationStopped = true;
      nativeEvent.stopPropagation();
    } }
  });
  return syntheticEvent;
}
function isDirectPropertyKey(key) {
  return DIRECT_PROPERTY_KEYS.has(key);
}
function setDirectProperty(element, key, value) {
  if (key === "tabIndex") {
    element.tabIndex = Number(value);
    return;
  }
  element[key] = value;
}
function clearDirectProperty(element, key) {
  if (key === "tabIndex") {
    element.removeAttribute("tabindex");
    return;
  }
  const propertyValue = element[key];
  if (typeof propertyValue === "boolean") {
    element[key] = false;
    return;
  }
  if (typeof propertyValue === "number") {
    element[key] = 0;
    return;
  }
  element[key] = "";
}
function toStyleValue(styleName, value) {
  if (typeof value !== "number" || value === 0 || styleName.startsWith("--") || UNITLESS_STYLE_PROPERTIES.has(styleName)) return String(value);
  return `${value}px`;
}
function removeStyleProperty(element, styleName) {
  if (PLUGIN_MANAGED_STYLE_PROPERTIES.has(styleName)) return;
  element.style.removeProperty(toStylePropertyName(styleName));
}
function applyStyleProperty(element, styleName, value) {
  if (PLUGIN_MANAGED_STYLE_PROPERTIES.has(styleName)) return;
  element.style.setProperty(toStylePropertyName(styleName), toStyleValue(styleName, value));
}
function syncAttributes(element, prevProps, nextProps) {
  (/* @__PURE__ */ new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])).forEach((key) => {
    if (ATTRIBUTE_EXCLUSIONS.has(key) || !isForwardedAttributeKey(key) || isEventProp(key, prevProps[key]) || isEventProp(key, nextProps[key])) return;
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];
    if (prevValue === nextValue) return;
    const attributeName = toAttributeName(key);
    if (nextValue == null || nextValue === false) {
      if (isDirectPropertyKey(key)) clearDirectProperty(element, key);
      element.removeAttribute(attributeName);
      return;
    }
    if (nextValue === true) {
      if (isDirectPropertyKey(key)) setDirectProperty(element, key, true);
      element.setAttribute(attributeName, "");
      return;
    }
    if (isDirectPropertyKey(key)) {
      setDirectProperty(element, key, nextValue);
      return;
    }
    element.setAttribute(attributeName, String(nextValue));
  });
}
function syncClassName(element, prevClassName, nextClassName) {
  if (prevClassName === nextClassName) return;
  if (nextClassName) {
    element.className = nextClassName;
    return;
  }
  element.removeAttribute("class");
}
function syncStyles(element, prevStyle, nextStyle) {
  const previousStyle = prevStyle !== null && prevStyle !== void 0 ? prevStyle : {};
  const currentStyle = nextStyle !== null && nextStyle !== void 0 ? nextStyle : {};
  (/* @__PURE__ */ new Set([...Object.keys(previousStyle), ...Object.keys(currentStyle)])).forEach((styleName) => {
    const prevValue = previousStyle[styleName];
    const nextValue = currentStyle[styleName];
    if (prevValue === nextValue) return;
    if (nextValue == null) {
      removeStyleProperty(element, styleName);
      return;
    }
    applyStyleProperty(element, styleName, nextValue);
  });
}
function syncEventListeners(element, prevListeners, nextProps) {
  prevListeners.forEach(({ eventName, listener, options }) => {
    element.removeEventListener(eventName, listener, options);
  });
  const nextListeners = [];
  Object.entries(nextProps).forEach(([key, value]) => {
    if (!isEventProp(key, value)) return;
    const { eventName, options } = toEventConfig(key);
    const listener = (event) => {
      value(createSyntheticEvent(element, event));
    };
    element.addEventListener(eventName, listener, options);
    nextListeners.push({
      eventName,
      listener,
      options
    });
  });
  return nextListeners;
}
function useMenuElementProps(element, props) {
  const previousPropsRef = useRef3({});
  const listenersRef = useRef3([]);
  useIsomorphicLayoutEffect2(() => {
    const previousProps = previousPropsRef.current;
    syncClassName(element, previousProps.className, props.className);
    syncStyles(element, previousProps.style, props.style);
    syncAttributes(element, previousProps, props);
    listenersRef.current = syncEventListeners(element, listenersRef.current, props);
    previousPropsRef.current = props;
    return () => {
      listenersRef.current.forEach(({ eventName, listener, options }) => {
        element.removeEventListener(eventName, listener, options);
      });
      listenersRef.current = [];
    };
  }, [element, props]);
}
var BubbleMenu2 = React2.forwardRef(({ pluginKey, editor, updateDelay, resizeDelay, appendTo, shouldShow = null, getReferencedVirtualElement, options, children, ...restProps }, ref) => {
  const menuEl = useRef3(document.createElement("div"));
  const resolvedPluginKey = useRef3(getAutoPluginKey(pluginKey, "bubbleMenu")).current;
  useMenuElementProps(menuEl.current, restProps);
  if (typeof ref === "function") ref(menuEl.current);
  else if (ref) ref.current = menuEl.current;
  const { editor: currentEditor } = useCurrentEditor();
  const pluginEditor = editor || currentEditor;
  const bubbleMenuPluginProps = {
    updateDelay,
    resizeDelay,
    appendTo,
    pluginKey: resolvedPluginKey,
    shouldShow,
    getReferencedVirtualElement,
    options
  };
  const bubbleMenuPluginPropsRef = useRef3(bubbleMenuPluginProps);
  bubbleMenuPluginPropsRef.current = bubbleMenuPluginProps;
  const [pluginInitialized, setPluginInitialized] = useState2(false);
  const skipFirstUpdateRef = useRef3(true);
  useEffect3(() => {
    if (pluginEditor === null || pluginEditor === void 0 ? void 0 : pluginEditor.isDestroyed) return;
    if (!pluginEditor) {
      console.warn("BubbleMenu component is not rendered inside of an editor component or does not have editor prop.");
      return;
    }
    const bubbleMenuElement = menuEl.current;
    bubbleMenuElement.style.visibility = "hidden";
    bubbleMenuElement.style.position = "absolute";
    const plugin = BubbleMenuPlugin({
      ...bubbleMenuPluginPropsRef.current,
      editor: pluginEditor,
      element: bubbleMenuElement
    });
    pluginEditor.registerPlugin(plugin);
    const createdPluginKey = bubbleMenuPluginPropsRef.current.pluginKey;
    skipFirstUpdateRef.current = true;
    setPluginInitialized(true);
    return () => {
      setPluginInitialized(false);
      pluginEditor.unregisterPlugin(createdPluginKey);
      window.requestAnimationFrame(() => {
        if (bubbleMenuElement.parentNode) bubbleMenuElement.parentNode.removeChild(bubbleMenuElement);
      });
    };
  }, [pluginEditor]);
  useEffect3(() => {
    if (!pluginInitialized || !pluginEditor || pluginEditor.isDestroyed) return;
    if (skipFirstUpdateRef.current) {
      skipFirstUpdateRef.current = false;
      return;
    }
    pluginEditor.view.dispatch(pluginEditor.state.tr.setMeta(resolvedPluginKey, {
      type: "updateOptions",
      options: bubbleMenuPluginPropsRef.current
    }));
  }, [
    pluginInitialized,
    pluginEditor,
    updateDelay,
    resizeDelay,
    shouldShow,
    options,
    appendTo,
    getReferencedVirtualElement,
    resolvedPluginKey
  ]);
  return createPortal(children, menuEl.current);
});
var FloatingMenu2 = React2.forwardRef(({ pluginKey, editor, updateDelay, resizeDelay, appendTo, shouldShow = null, options, children, ...restProps }, ref) => {
  const menuEl = useRef3(document.createElement("div"));
  const resolvedPluginKey = useRef3(getAutoPluginKey(pluginKey, "floatingMenu")).current;
  useMenuElementProps(menuEl.current, restProps);
  if (typeof ref === "function") ref(menuEl.current);
  else if (ref) ref.current = menuEl.current;
  const { editor: currentEditor } = useCurrentEditor();
  const pluginEditor = editor || currentEditor;
  const floatingMenuPluginProps = {
    updateDelay,
    resizeDelay,
    appendTo,
    pluginKey: resolvedPluginKey,
    shouldShow,
    options
  };
  const floatingMenuPluginPropsRef = useRef3(floatingMenuPluginProps);
  floatingMenuPluginPropsRef.current = floatingMenuPluginProps;
  const [pluginInitialized, setPluginInitialized] = useState2(false);
  const skipFirstUpdateRef = useRef3(true);
  useEffect3(() => {
    if (pluginEditor === null || pluginEditor === void 0 ? void 0 : pluginEditor.isDestroyed) return;
    if (!pluginEditor) {
      console.warn("FloatingMenu component is not rendered inside of an editor component or does not have editor prop.");
      return;
    }
    const floatingMenuElement = menuEl.current;
    floatingMenuElement.style.visibility = "hidden";
    floatingMenuElement.style.position = "absolute";
    const plugin = FloatingMenuPlugin({
      ...floatingMenuPluginPropsRef.current,
      editor: pluginEditor,
      element: floatingMenuElement
    });
    pluginEditor.registerPlugin(plugin);
    const createdPluginKey = floatingMenuPluginPropsRef.current.pluginKey;
    skipFirstUpdateRef.current = true;
    setPluginInitialized(true);
    return () => {
      setPluginInitialized(false);
      pluginEditor.unregisterPlugin(createdPluginKey);
      window.requestAnimationFrame(() => {
        if (floatingMenuElement.parentNode) floatingMenuElement.parentNode.removeChild(floatingMenuElement);
      });
    };
  }, [pluginEditor]);
  useEffect3(() => {
    if (!pluginInitialized || !pluginEditor || pluginEditor.isDestroyed) return;
    if (skipFirstUpdateRef.current) {
      skipFirstUpdateRef.current = false;
      return;
    }
    pluginEditor.view.dispatch(pluginEditor.state.tr.setMeta(resolvedPluginKey, {
      type: "updateOptions",
      options: floatingMenuPluginPropsRef.current
    }));
  }, [
    pluginInitialized,
    pluginEditor,
    updateDelay,
    resizeDelay,
    shouldShow,
    options,
    appendTo,
    resolvedPluginKey
  ]);
  return createPortal(children, menuEl.current);
});

// node_modules/.pnpm/prosemirror-dropcursor@1.8.4/node_modules/prosemirror-dropcursor/dist/index.js
function dropCursor(options = {}) {
  return new Plugin({
    view(editorView) {
      return new DropCursorView(editorView, options);
    }
  });
}
var DropCursorView = class {
  constructor(editorView, options) {
    var _a;
    this.editorView = editorView;
    this.cursorPos = null;
    this.element = null;
    this.timeout = -1;
    this.lastDragEvent = null;
    this.width = (_a = options.width) !== null && _a !== void 0 ? _a : 1;
    this.color = options.color === false ? void 0 : options.color || "black";
    this.class = options.class;
    this.handlers = ["dragover", "dragend", "drop", "dragleave"].map((name) => {
      let handler = (e) => {
        this[name](e);
      };
      editorView.dom.addEventListener(name, handler);
      return { name, handler };
    });
  }
  destroy() {
    this.setCursor(null);
    this.handlers.forEach(({ name, handler }) => this.editorView.dom.removeEventListener(name, handler));
  }
  update(editorView, prevState) {
    if (this.cursorPos != null && prevState.doc != editorView.state.doc) {
      if (this.lastDragEvent) {
        let target = this.computeTarget(this.lastDragEvent);
        if (target == this.cursorPos)
          this.updateOverlay();
        else
          this.setCursor(target);
      } else {
        this.updateOverlay();
      }
    }
  }
  setCursor(pos) {
    if (pos == this.cursorPos)
      return;
    this.cursorPos = pos;
    if (pos == null) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    } else {
      this.updateOverlay();
    }
  }
  updateOverlay() {
    let $pos = this.editorView.state.doc.resolve(this.cursorPos);
    let isBlock = !$pos.parent.inlineContent, rect;
    let editorDOM = this.editorView.dom, editorRect = editorDOM.getBoundingClientRect();
    let scaleX = editorRect.width / editorDOM.offsetWidth, scaleY = editorRect.height / editorDOM.offsetHeight;
    if (isBlock) {
      let before = $pos.nodeBefore, after = $pos.nodeAfter;
      if (before || after) {
        let node = this.editorView.nodeDOM(this.cursorPos - (before ? before.nodeSize : 0));
        if (node) {
          let nodeRect = node.getBoundingClientRect();
          let top = before ? nodeRect.bottom : nodeRect.top;
          if (before && after)
            top = (top + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2;
          let halfWidth = this.width / 2 * scaleY;
          rect = { left: nodeRect.left, right: nodeRect.right, top: top - halfWidth, bottom: top + halfWidth };
        }
      }
    }
    if (!rect) {
      let coords = this.editorView.coordsAtPos(this.cursorPos);
      let halfWidth = this.width / 2 * scaleX;
      rect = { left: coords.left - halfWidth, right: coords.left + halfWidth, top: coords.top, bottom: coords.bottom };
    }
    let parent = this.editorView.dom.offsetParent;
    if (!this.element) {
      this.element = parent.appendChild(document.createElement("div"));
      if (this.class)
        this.element.className = this.class;
      this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;";
      if (this.color) {
        this.element.style.backgroundColor = this.color;
      }
    }
    this.element.classList.toggle("prosemirror-dropcursor-block", isBlock);
    this.element.classList.toggle("prosemirror-dropcursor-inline", !isBlock);
    let parentLeft, parentTop;
    if (!parent || parent == document.body && getComputedStyle(parent).position == "static") {
      parentLeft = -pageXOffset;
      parentTop = -pageYOffset;
    } else {
      let rect2 = parent.getBoundingClientRect();
      let parentScaleX = rect2.width / parent.offsetWidth, parentScaleY = rect2.height / parent.offsetHeight;
      parentLeft = rect2.left - parent.scrollLeft * parentScaleX;
      parentTop = rect2.top - parent.scrollTop * parentScaleY;
    }
    this.element.style.left = (rect.left - parentLeft) / scaleX + "px";
    this.element.style.top = (rect.top - parentTop) / scaleY + "px";
    this.element.style.width = (rect.right - rect.left) / scaleX + "px";
    this.element.style.height = (rect.bottom - rect.top) / scaleY + "px";
  }
  scheduleRemoval(timeout) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.setCursor(null), timeout);
  }
  computeTarget(event) {
    let pos = this.editorView.posAtCoords({ left: event.clientX, top: event.clientY });
    let node = pos && pos.inside >= 0 && this.editorView.state.doc.nodeAt(pos.inside);
    let disableDropCursor = node && node.type.spec.disableDropCursor;
    let disabled = typeof disableDropCursor == "function" ? disableDropCursor(this.editorView, pos, event) : disableDropCursor;
    if (!pos || disabled)
      return null;
    let target = pos.pos;
    if (this.editorView.dragging && this.editorView.dragging.slice) {
      let point = dropPoint(this.editorView.state.doc, target, this.editorView.dragging.slice);
      if (point != null)
        target = point;
    }
    return target;
  }
  dragover(event) {
    if (!this.editorView.editable)
      return;
    this.lastDragEvent = event;
    let target = this.computeTarget(event);
    if (target != null) {
      this.setCursor(target);
      this.scheduleRemoval(5e3);
    }
  }
  dragend() {
    this.scheduleRemoval(20);
  }
  drop() {
    this.scheduleRemoval(20);
  }
  dragleave(event) {
    if (!this.editorView.dom.contains(event.relatedTarget))
      this.setCursor(null);
  }
};

// node_modules/.pnpm/prosemirror-gapcursor@1.4.1/node_modules/prosemirror-gapcursor/dist/index.js
var GapCursor = class _GapCursor extends Selection {
  /**
  Create a gap cursor.
  */
  constructor($pos) {
    super($pos, $pos);
  }
  map(doc2, mapping) {
    let $pos = doc2.resolve(mapping.map(this.head));
    return _GapCursor.valid($pos) ? new _GapCursor($pos) : Selection.near($pos);
  }
  content() {
    return Slice.empty;
  }
  eq(other) {
    return other instanceof _GapCursor && other.head == this.head;
  }
  toJSON() {
    return { type: "gapcursor", pos: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for GapCursor.fromJSON");
    return new _GapCursor(doc2.resolve(json.pos));
  }
  /**
  @internal
  */
  getBookmark() {
    return new GapBookmark(this.anchor);
  }
  /**
  @internal
  */
  static valid($pos) {
    let parent = $pos.parent;
    if (parent.inlineContent || !closedBefore($pos) || !closedAfter($pos))
      return false;
    let override = parent.type.spec.allowGapCursor;
    if (override != null)
      return override;
    let deflt = parent.contentMatchAt($pos.index()).defaultType;
    return deflt && deflt.isTextblock;
  }
  /**
  @internal
  */
  static findGapCursorFrom($pos, dir, mustMove = false) {
    search: for (; ; ) {
      if (!mustMove && _GapCursor.valid($pos))
        return $pos;
      let pos = $pos.pos, next = null;
      for (let d = $pos.depth; ; d--) {
        let parent = $pos.node(d);
        if (dir > 0 ? $pos.indexAfter(d) < parent.childCount : $pos.index(d) > 0) {
          next = parent.child(dir > 0 ? $pos.indexAfter(d) : $pos.index(d) - 1);
          break;
        } else if (d == 0) {
          return null;
        }
        pos += dir;
        let $cur = $pos.doc.resolve(pos);
        if (_GapCursor.valid($cur))
          return $cur;
      }
      for (; ; ) {
        let inside = dir > 0 ? next.firstChild : next.lastChild;
        if (!inside) {
          if (next.isAtom && !next.isText && !NodeSelection.isSelectable(next)) {
            $pos = $pos.doc.resolve(pos + next.nodeSize * dir);
            mustMove = false;
            continue search;
          }
          break;
        }
        next = inside;
        pos += dir;
        let $cur = $pos.doc.resolve(pos);
        if (_GapCursor.valid($cur))
          return $cur;
      }
      return null;
    }
  }
};
GapCursor.prototype.visible = false;
GapCursor.findFrom = GapCursor.findGapCursorFrom;
Selection.jsonID("gapcursor", GapCursor);
var GapBookmark = class _GapBookmark {
  constructor(pos) {
    this.pos = pos;
  }
  map(mapping) {
    return new _GapBookmark(mapping.map(this.pos));
  }
  resolve(doc2) {
    let $pos = doc2.resolve(this.pos);
    return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos);
  }
};
function needsGap(type) {
  return type.isAtom || type.spec.isolating || type.spec.createGapCursor;
}
function closedBefore($pos) {
  for (let d = $pos.depth; d >= 0; d--) {
    let index = $pos.index(d), parent = $pos.node(d);
    if (index == 0) {
      if (parent.type.spec.isolating)
        return true;
      continue;
    }
    for (let before = parent.child(index - 1); ; before = before.lastChild) {
      if (before.childCount == 0 && !before.inlineContent || needsGap(before.type))
        return true;
      if (before.inlineContent)
        return false;
    }
  }
  return true;
}
function closedAfter($pos) {
  for (let d = $pos.depth; d >= 0; d--) {
    let index = $pos.indexAfter(d), parent = $pos.node(d);
    if (index == parent.childCount) {
      if (parent.type.spec.isolating)
        return true;
      continue;
    }
    for (let after = parent.child(index); ; after = after.firstChild) {
      if (after.childCount == 0 && !after.inlineContent || needsGap(after.type))
        return true;
      if (after.inlineContent)
        return false;
    }
  }
  return true;
}
function gapCursor() {
  return new Plugin({
    props: {
      decorations: drawGapCursor,
      createSelectionBetween(_view, $anchor, $head) {
        return $anchor.pos == $head.pos && GapCursor.valid($head) ? new GapCursor($head) : null;
      },
      handleClick,
      handleKeyDown: handleKeyDown2,
      handleDOMEvents: { beforeinput }
    }
  });
}
var handleKeyDown2 = keydownHandler({
  "ArrowLeft": arrow4("horiz", -1),
  "ArrowRight": arrow4("horiz", 1),
  "ArrowUp": arrow4("vert", -1),
  "ArrowDown": arrow4("vert", 1)
});
function arrow4(axis, dir) {
  const dirStr = axis == "vert" ? dir > 0 ? "down" : "up" : dir > 0 ? "right" : "left";
  return function(state, dispatch, view) {
    let sel = state.selection;
    let $start = dir > 0 ? sel.$to : sel.$from, mustMove = sel.empty;
    if (sel instanceof TextSelection) {
      if (!view.endOfTextblock(dirStr) || $start.depth == 0)
        return false;
      mustMove = false;
      $start = state.doc.resolve(dir > 0 ? $start.after() : $start.before());
    }
    let $found = GapCursor.findGapCursorFrom($start, dir, mustMove);
    if (!$found)
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(new GapCursor($found)));
    return true;
  };
}
function handleClick(view, pos, event) {
  if (!view || !view.editable)
    return false;
  let $pos = view.state.doc.resolve(pos);
  if (!GapCursor.valid($pos))
    return false;
  let clickPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (clickPos && clickPos.inside > -1 && NodeSelection.isSelectable(view.state.doc.nodeAt(clickPos.inside)))
    return false;
  view.dispatch(view.state.tr.setSelection(new GapCursor($pos)));
  return true;
}
function beforeinput(view, event) {
  if (event.inputType != "insertCompositionText" || !(view.state.selection instanceof GapCursor))
    return false;
  let { $from } = view.state.selection;
  let insert = $from.parent.contentMatchAt($from.index()).findWrapping(view.state.schema.nodes.text);
  if (!insert)
    return false;
  let frag = Fragment.empty;
  for (let i = insert.length - 1; i >= 0; i--)
    frag = Fragment.from(insert[i].createAndFill(null, frag));
  let tr = view.state.tr.replace($from.pos, $from.pos, new Slice(frag, 0, 0));
  tr.setSelection(TextSelection.near(tr.doc.resolve($from.pos + 1)));
  view.dispatch(tr);
  return false;
}
function drawGapCursor(state) {
  if (!(state.selection instanceof GapCursor))
    return null;
  let node = document.createElement("div");
  node.className = "ProseMirror-gapcursor";
  return DecorationSet.create(state.doc, [Decoration.widget(state.selection.head, node, { key: "gapcursor" })]);
}

// node_modules/.pnpm/@tiptap+extensions@3.32.0_@tiptap+core@3.32.0_@tiptap+pm@3.32.0__@tiptap+pm@3.32.0/node_modules/@tiptap/extensions/dist/index.js
var CharacterCount = Extension.create({
  name: "characterCount",
  addOptions() {
    return {
      limit: null,
      autoTrim: true,
      mode: "textSize",
      textCounter: (text) => text.length,
      wordCounter: (text) => text.split(" ").filter((word) => word !== "").length
    };
  },
  addStorage() {
    return {
      characters: () => 0,
      words: () => 0
    };
  },
  onBeforeCreate() {
    this.storage.characters = (options) => {
      const node = (options === null || options === void 0 ? void 0 : options.node) || this.editor.state.doc;
      if (((options === null || options === void 0 ? void 0 : options.mode) || this.options.mode) === "textSize") {
        const text = node.textBetween(0, node.content.size, void 0, " ");
        return this.options.textCounter(text);
      }
      return node.nodeSize;
    };
    this.storage.words = (options) => {
      const node = (options === null || options === void 0 ? void 0 : options.node) || this.editor.state.doc;
      const text = node.textBetween(0, node.content.size, " ", " ");
      return this.options.wordCounter(text);
    };
  },
  addProseMirrorPlugins() {
    let initialEvaluationDone = false;
    return [new Plugin({
      key: new PluginKey("characterCount"),
      appendTransaction: (transactions, oldState, newState) => {
        if (initialEvaluationDone) return;
        const limit = this.options.limit;
        const autoTrim = this.options.autoTrim;
        if (limit === null || limit === void 0 || limit === 0 || autoTrim === false) {
          initialEvaluationDone = true;
          return;
        }
        const initialContentSize = this.storage.characters({ node: newState.doc });
        if (initialContentSize > limit) {
          const over = initialContentSize - limit;
          const from2 = 0;
          const to = over;
          console.warn(`[CharacterCount] Initial content exceeded limit of ${limit} characters. Content was automatically trimmed.`);
          const tr = newState.tr.deleteRange(from2, to);
          initialEvaluationDone = true;
          return tr;
        }
        initialEvaluationDone = true;
      },
      filterTransaction: (transaction, state) => {
        const limit = this.options.limit;
        if (!transaction.docChanged || limit === 0 || limit === null || limit === void 0) return true;
        const oldSize = this.storage.characters({ node: state.doc });
        const newSize = this.storage.characters({ node: transaction.doc });
        if (newSize <= limit) return true;
        if (oldSize > limit && newSize > limit && newSize <= oldSize) return true;
        if (oldSize > limit && newSize > limit && newSize > oldSize) return false;
        if (!transaction.getMeta("paste")) return false;
        const pos = transaction.selection.$head.pos;
        const from2 = pos - (newSize - limit);
        const to = pos;
        transaction.deleteRange(from2, to);
        if (this.storage.characters({ node: transaction.doc }) > limit) return false;
        return true;
      }
    })];
  }
});
var Dropcursor = Extension.create({
  name: "dropCursor",
  addOptions() {
    return {
      color: "currentColor",
      width: 1,
      class: void 0
    };
  },
  addProseMirrorPlugins() {
    return [dropCursor(this.options)];
  }
});
var Focus = Extension.create({
  name: "focus",
  addOptions() {
    return {
      className: "has-focus",
      mode: "all"
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("focus"),
      props: { decorations: ({ doc: doc2, selection }) => {
        const { isEditable, isFocused } = this.editor;
        const { anchor } = selection;
        const decorations = [];
        if (!isEditable || !isFocused) return DecorationSet.create(doc2, []);
        let maxLevels = 0;
        if (this.options.mode === "deepest") doc2.descendants((node, pos) => {
          if (node.isText) return;
          if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
          maxLevels += 1;
        });
        let currentLevel = 0;
        doc2.descendants((node, pos) => {
          if (node.isText) return false;
          if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
          currentLevel += 1;
          if (this.options.mode === "deepest" && maxLevels - currentLevel > 0 || this.options.mode === "shallowest" && currentLevel > 1) return this.options.mode === "deepest";
          decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: this.options.className }));
        });
        return DecorationSet.create(doc2, decorations);
      } }
    })];
  }
});
var Gapcursor = Extension.create({
  name: "gapCursor",
  addProseMirrorPlugins() {
    return [gapCursor()];
  },
  extendNodeSchema(extension) {
    var _callOrReturn;
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    };
    return { allowGapCursor: (_callOrReturn = callOrReturn(getExtensionField(extension, "allowGapCursor", context))) !== null && _callOrReturn !== void 0 ? _callOrReturn : null };
  }
});
var DEFAULT_DATA_ATTRIBUTE = "placeholder";
var PLUGIN_KEY = new PluginKey("tiptap__placeholder");
function createPlaceholderDecoration(options) {
  const { editor, placeholder, dataAttribute, pos, node, isEmptyDoc, hasAnchor, classes: { emptyNode, emptyEditor } } = options;
  const classes = [emptyNode];
  if (isEmptyDoc) classes.push(emptyEditor);
  return Decoration.node(pos, pos + node.nodeSize, {
    class: classes.join(" "),
    [dataAttribute]: typeof placeholder === "function" ? placeholder({
      editor,
      node,
      pos,
      hasAnchor
    }) : placeholder
  });
}
function resolveEmptyNodeClass(emptyNodeClass, props) {
  return typeof emptyNodeClass === "function" ? emptyNodeClass(props) : emptyNodeClass;
}
function scanRangeForDecorations({ editor, options, dataAttribute, doc: doc2, selection, from: from2, to }) {
  const { anchor } = selection;
  const decorations = [];
  const isEmptyDoc = editor.isEmpty;
  doc2.nodesBetween(from2, to, (node, pos) => {
    const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
    const isEmpty = !node.isLeaf && isNodeEmpty(node);
    if (!node.type.isTextblock) return options.includeChildren;
    if ((hasAnchor || !options.showOnlyCurrent) && isEmpty) decorations.push(createPlaceholderDecoration({
      editor,
      isEmptyDoc,
      dataAttribute,
      hasAnchor,
      placeholder: options.placeholder,
      classes: {
        emptyEditor: options.emptyEditorClass,
        emptyNode: resolveEmptyNodeClass(options.emptyNodeClass, {
          editor,
          node,
          pos,
          hasAnchor
        })
      },
      node,
      pos
    }));
    return options.includeChildren;
  });
  return decorations;
}
function buildPlaceholderDecorations({ editor, options, dataAttribute, doc: doc2, selection }) {
  if (!(editor.isEditable || !options.showOnlyWhenEditable)) return null;
  const { anchor } = selection;
  const decorations = [];
  const isEmptyDoc = editor.isEmpty;
  if (options.showOnlyCurrent && !options.includeChildren) {
    const resolved = doc2.resolve(anchor);
    const node = resolved.depth > 0 ? resolved.node(1) : resolved.nodeAfter;
    const nodeStart = resolved.depth > 0 ? resolved.before(1) : anchor;
    if (node && node.type.isTextblock && isNodeEmpty(node)) {
      const hasAnchor = anchor >= nodeStart && anchor <= nodeStart + node.nodeSize;
      decorations.push(createPlaceholderDecoration({
        editor,
        isEmptyDoc,
        dataAttribute,
        hasAnchor,
        placeholder: options.placeholder,
        classes: {
          emptyEditor: options.emptyEditorClass,
          emptyNode: resolveEmptyNodeClass(options.emptyNodeClass, {
            editor,
            node,
            pos: nodeStart,
            hasAnchor
          })
        },
        node,
        pos: nodeStart
      }));
    }
  } else decorations.push(...scanRangeForDecorations({
    editor,
    options,
    dataAttribute,
    doc: doc2,
    selection,
    from: 0,
    to: doc2.content.size
  }));
  return DecorationSet.create(doc2, decorations);
}
function resolveTopLevelRange(doc2, pos) {
  const resolved = doc2.resolve(pos);
  if (resolved.depth === 0) {
    var _resolved$nodeAfter;
    const node = (_resolved$nodeAfter = resolved.nodeAfter) !== null && _resolved$nodeAfter !== void 0 ? _resolved$nodeAfter : resolved.nodeBefore;
    if (!node) return {
      from: pos,
      to: pos
    };
    const nodePos = resolved.nodeAfter ? pos : pos - node.nodeSize;
    return {
      from: nodePos,
      to: nodePos + node.nodeSize
    };
  }
  const topLevelPos = resolved.before(1);
  return {
    from: topLevelPos,
    to: topLevelPos + resolved.node(1).nodeSize
  };
}
function toContentRelativeRange(doc2, range) {
  return {
    from: Math.max(0, range.from - 1),
    to: Math.min(doc2.content.size, range.to - 1)
  };
}
function getTopLevelBlocksInRange(doc2, from2, to) {
  const ranges = [];
  doc2.forEach((node, offset3) => {
    const nodeStart = offset3;
    const nodeEnd = nodeStart + node.nodeSize;
    const absNodeStart = nodeStart + 1;
    const absNodeEnd = nodeEnd + 1;
    if (absNodeStart < to && absNodeEnd > from2) ranges.push({
      from: nodeStart,
      to: nodeEnd
    });
  });
  return ranges;
}
function mergeRanges(ranges) {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.from <= last.to) last.to = Math.max(last.to, current.to);
    else merged.push({ ...current });
  }
  return merged;
}
function collectBlocksForChange(doc2, change) {
  const ranges = getTopLevelBlocksInRange(doc2, change.from, change.to);
  ranges.push(toContentRelativeRange(doc2, resolveTopLevelRange(doc2, change.from)));
  if (change.to > change.from) ranges.push(toContentRelativeRange(doc2, resolveTopLevelRange(doc2, Math.min(change.to, doc2.content.size + 1) - 1)));
  else if (change.from < doc2.content.size + 1) ranges.push(toContentRelativeRange(doc2, resolveTopLevelRange(doc2, Math.min(change.from + 1, doc2.content.size))));
  return ranges;
}
function collectRescanRanges(tr, oldState, newState) {
  const ranges = [];
  if (tr.docChanged) {
    const changes = getChangedRanges(tr);
    for (const change of changes) ranges.push(...collectBlocksForChange(newState.doc, change.newRange));
  }
  if (tr.selectionSet) {
    ranges.push(toContentRelativeRange(newState.doc, resolveTopLevelRange(newState.doc, tr.mapping.map(oldState.selection.anchor))));
    ranges.push(toContentRelativeRange(newState.doc, resolveTopLevelRange(newState.doc, newState.selection.anchor)));
  }
  return mergeRanges(ranges);
}
function clampRange(from2, to, doc2) {
  const clampedFrom = Math.max(0, Math.min(from2, doc2.content.size));
  return {
    from: clampedFrom,
    to: Math.max(clampedFrom, Math.min(to, doc2.content.size))
  };
}
function updateDecorationsInRanges({ decorations, ranges, editor, options, dataAttribute, doc: doc2, selection }) {
  let next = decorations;
  for (const range of ranges) {
    const { from: from2, to } = clampRange(range.from, range.to, doc2);
    const existing = next.find(from2, to).filter((decoration) => decoration.from >= from2 && decoration.to <= to);
    if (existing.length) next = next.remove(existing);
    const newDecos = scanRangeForDecorations({
      editor,
      options,
      dataAttribute,
      doc: doc2,
      selection,
      from: from2,
      to
    });
    if (newDecos.length) next = next.add(doc2, newDecos);
  }
  return next;
}
function createPlaceholderStateField({ editor, options, dataAttribute }) {
  return {
    init(_config, state) {
      const decorations = buildPlaceholderDecorations({
        editor,
        options,
        dataAttribute,
        doc: state.doc,
        selection: state.selection
      });
      return decorations !== null && decorations !== void 0 ? decorations : DecorationSet.empty;
    },
    apply(tr, prev, oldState, newState) {
      if (!tr.docChanged && !tr.selectionSet) return prev;
      return updateDecorationsInRanges({
        decorations: prev.map(tr.mapping, tr.doc),
        ranges: collectRescanRanges(tr, oldState, newState),
        editor,
        options,
        dataAttribute,
        doc: newState.doc,
        selection: newState.selection
      });
    }
  };
}
function preparePlaceholderAttribute(attr) {
  return attr.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/^[0-9-]+/, "").replace(/^-+/, "").toLowerCase();
}
function createPlaceholderPlugin({ editor, options }) {
  const dataAttribute = options.dataAttribute ? `data-${preparePlaceholderAttribute(options.dataAttribute)}` : `data-${DEFAULT_DATA_ATTRIBUTE}`;
  const useResolvedPath = options.showOnlyCurrent && !options.includeChildren;
  return new Plugin({
    key: PLUGIN_KEY,
    ...useResolvedPath ? {} : { state: createPlaceholderStateField({
      editor,
      options,
      dataAttribute
    }) },
    props: { decorations: useResolvedPath ? ({ doc: doc2, selection }) => buildPlaceholderDecorations({
      editor,
      options,
      dataAttribute,
      doc: doc2,
      selection
    }) : (state) => {
      var _PLUGIN_KEY$getState;
      if (options.showOnlyWhenEditable && !editor.isEditable) return DecorationSet.empty;
      return (_PLUGIN_KEY$getState = PLUGIN_KEY.getState(state)) !== null && _PLUGIN_KEY$getState !== void 0 ? _PLUGIN_KEY$getState : DecorationSet.empty;
    } }
  });
}
var Placeholder = Extension.create({
  name: "placeholder",
  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      dataAttribute: DEFAULT_DATA_ATTRIBUTE,
      placeholder: "Write something \u2026",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false
    };
  },
  addProseMirrorPlugins() {
    return [createPlaceholderPlugin({
      editor: this.editor,
      options: this.options
    })];
  }
});
function shouldSyncDomSelection(state, editor) {
  return !state.selection.empty && !isNodeSelection(state.selection) && editor.isEditable;
}
function shouldPreserveSelection(state, editor) {
  return shouldSyncDomSelection(state, editor) && !editor.isFocused && !editor.view.dragging;
}
function clearDomSelection() {
  var _window$getSelection;
  (_window$getSelection = window.getSelection()) === null || _window$getSelection === void 0 || _window$getSelection.removeAllRanges();
}
function restoreDomSelection(view) {
  view.focus();
}
var Selection2 = Extension.create({
  name: "selection",
  addOptions() {
    return { className: "selection" };
  },
  addProseMirrorPlugins() {
    const { editor, options } = this;
    return [new Plugin({
      key: new PluginKey("selection"),
      props: {
        decorations(state) {
          if (!shouldPreserveSelection(state, editor)) return null;
          return DecorationSet.create(state.doc, [Decoration.inline(state.selection.from, state.selection.to, { class: options.className })]);
        },
        handleDOMEvents: {
          blur(view) {
            if (!shouldSyncDomSelection(view.state, editor)) return false;
            clearDomSelection();
            return false;
          },
          focus(view) {
            if (!shouldSyncDomSelection(view.state, editor)) return false;
            requestAnimationFrame(() => {
              if (!editor.isDestroyed && view.hasFocus()) restoreDomSelection(view);
            });
            return false;
          }
        }
      }
    })];
  }
});
function nodeEqualsType({ types, node }) {
  return node && Array.isArray(types) && types.includes(node.type) || (node === null || node === void 0 ? void 0 : node.type) === types;
}
var TrailingNode = Extension.create({
  name: "trailingNode",
  addOptions() {
    return {
      node: void 0,
      notAfter: []
    };
  },
  addProseMirrorPlugins() {
    var _this$editor$schema$t;
    const plugin = new PluginKey(this.name);
    const defaultNode = this.options.node || ((_this$editor$schema$t = this.editor.schema.topNodeType.contentMatch.defaultType) === null || _this$editor$schema$t === void 0 ? void 0 : _this$editor$schema$t.name) || "paragraph";
    const disabledNodes = Object.entries(this.editor.schema.nodes).map(([, value]) => value).filter((node) => (this.options.notAfter || []).concat(defaultNode).includes(node.name));
    return [new Plugin({
      key: plugin,
      appendTransaction: (transactions, __, state) => {
        const { doc: doc2, tr, schema } = state;
        const shouldInsertNodeAtEnd = plugin.getState(state);
        const endPosition = doc2.content.size;
        const type = schema.nodes[defaultNode];
        if (transactions.some((transaction) => transaction.getMeta("skipTrailingNode"))) return;
        if (!shouldInsertNodeAtEnd) return;
        return tr.insert(endPosition, type.create());
      },
      state: {
        init: (_, state) => {
          const lastNode = state.tr.doc.lastChild;
          return !nodeEqualsType({
            node: lastNode,
            types: disabledNodes
          });
        },
        apply: (tr, value) => {
          if (!tr.docChanged) return value;
          if (tr.getMeta("__uniqueIDTransaction")) return value;
          const lastNode = tr.doc.lastChild;
          return !nodeEqualsType({
            node: lastNode,
            types: disabledNodes
          });
        }
      }
    })];
  }
});
var UndoRedo = Extension.create({
  name: "undoRedo",
  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500
    };
  },
  addCommands() {
    return {
      undo: () => ({ state, dispatch }) => {
        return undo(state, dispatch);
      },
      redo: () => ({ state, dispatch }) => {
        return redo(state, dispatch);
      }
    };
  },
  addProseMirrorPlugins() {
    return [history(this.options)];
  },
  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Mod-\u044F": () => this.editor.commands.undo(),
      "Shift-Mod-\u044F": () => this.editor.commands.redo()
    };
  }
});

// src/react/BlockdocEditor.tsx
import { forwardRef as forwardRef2, useCallback, useEffect as useEffect4, useImperativeHandle, useMemo as useMemo3, useRef as useRef4, useState as useState3 } from "react";
import { Fragment as Fragment3, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function isDocJson(value) {
  return value != null && typeof value.type === "string";
}
function withoutIdentity(record) {
  const { [NODE_ID_ATTR]: _id, ...rest } = record;
  return rest;
}
function attrsSchemaWithoutIdentity(attrsSchema) {
  if (attrsSchema?.properties === void 0) {
    return attrsSchema;
  }
  return {
    ...attrsSchema,
    properties: withoutIdentity(attrsSchema.properties)
  };
}
function insertPaletteNode(editor, type) {
  const node = type.createAndFill({ [NODE_ID_ATTR]: generateNodeId() });
  if (node === null) {
    return;
  }
  try {
    editor.view.dispatch(editor.state.tr.replaceSelectionWith(node).scrollIntoView());
    editor.view.focus();
  } catch {
  }
}
var buttonStyle = {
  font: "inherit",
  fontSize: 12,
  padding: "2px 8px",
  border: "1px solid var(--stud-line-strong)",
  borderRadius: 4,
  background: "var(--stud-surface)",
  cursor: "pointer"
};
var BUBBLE_TOGGLE_MARKS = [
  ["strong", "B"],
  ["em", "I"],
  ["code", "</>"]
];
function markIsActive(editor, name) {
  return editor.schema.marks[name] !== void 0 && editor.isActive(name);
}
var BlockdocEditor = forwardRef2(function BlockdocEditor2({
  manifests,
  value,
  onChange,
  commitPolicy,
  commitBus,
  onSelectionChange,
  nodeViews,
  extraPlugins,
  docSource,
  idPlugin,
  palette = true,
  history: history2 = true,
  className
}, ref) {
  const manifestList = useMemo3(() => Array.isArray(manifests) ? manifests : [manifests], [manifests]);
  const controllerRef = useRef4(null);
  const suppressCommitsRef = useRef4(false);
  const onChangeRef = useRef4(onChange);
  onChangeRef.current = onChange;
  const commitPolicyRef = useRef4(commitPolicy);
  commitPolicyRef.current = commitPolicy;
  const extraPluginsRef = useRef4(extraPlugins);
  extraPluginsRef.current = extraPlugins;
  const idPluginRef = useRef4(idPlugin);
  idPluginRef.current = idPlugin;
  const onSelectionChangeRef = useRef4(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const lastSelectionNodeIdRef = useRef4(null);
  const noteSelection = useCallback((state) => {
    const id = selectionNodeId(state);
    if (id !== lastSelectionNodeIdRef.current) {
      lastSelectionNodeIdRef.current = id;
      onSelectionChangeRef.current?.(id);
    }
  }, []);
  const source = useMemo3(() => docSource ?? valueDocSource(value ?? null), [docSource, value]);
  const sourceRef = useRef4(source);
  sourceRef.current = source;
  const externalApplyGenerationRef = useRef4(0);
  const intakeSeededEditorRef = useRef4(null);
  const extensions = useMemo3(
    () => [
      ...createManifestExtensions(manifestList, { nodeViews }),
      ...history2 ? [UndoRedo] : [],
      // GUARDRAIL (ADR-0072): our plugins stay raw PM plugins — one-layer
      // portability in both directions.
      Extension.create({
        name: "blockdocPlugins",
        addProseMirrorPlugins() {
          return [
            ...proseShortcuts(this.editor.schema, manifestList),
            (idPluginRef.current ?? nodeIdPlugin)(),
            annotationIntegrityPlugin(),
            ...extraPluginsRef.current?.({ schema: this.editor.schema }) ?? []
          ];
        }
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifestList, nodeViews, history2]
  );
  const initialValue = sourceRef.current.get();
  const editor = useEditor(
    {
      extensions,
      // EP-07c read-compat: normalize a pre-migration document's old node names
      // to the current JSX tags before the schema sees it (removed post-migration).
      content: isDocJson(initialValue) ? normalizeLegacyNodeNames(initialValue) : null,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      onCreate: ({ editor: created }) => noteSelection(created.state),
      onTransaction: ({ editor: current }) => noteSelection(current.state),
      onUpdate: () => {
        if (!suppressCommitsRef.current) {
          controllerRef.current?.noteChange();
        }
      },
      onBlur: () => controllerRef.current?.noteBlur()
    },
    [extensions]
  );
  useEffect4(() => {
    if (editor === null) {
      return;
    }
    const controller = new CommitController(
      () => editor.state.doc.toJSON(),
      (doc2) => onChangeRef.current?.(doc2),
      commitPolicyRef.current ?? {},
      sourceRef.current.get()
    );
    controllerRef.current = controller;
    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      controller.dispose();
    };
  }, [editor]);
  useEffect4(() => {
    if (editor === null) {
      return;
    }
    const applyExternalValue = (doc2) => {
      const controller = controllerRef.current;
      if (controller === null || editor.isDestroyed) {
        return;
      }
      if (controller.receiveExternalValue(doc2) === "ignore") {
        return;
      }
      if (JSON.stringify(doc2 ?? null) === JSON.stringify(editor.state.doc.toJSON())) {
        controller.noteRebuilt(doc2);
        return;
      }
      const survivingId = selectionNodeId(editor.state);
      suppressCommitsRef.current = true;
      try {
        editor.chain().command(({ tr }) => {
          tr.setMeta("addToHistory", false);
          return true;
        }).setContent(isDocJson(doc2) ? normalizeLegacyNodeNames(doc2) : null, { emitUpdate: false }).command(({ tr }) => {
          tr.setSelection(selectionForNodeId(tr.doc, survivingId));
          return true;
        }).run();
      } finally {
        suppressCommitsRef.current = false;
      }
      controller.noteRebuilt(doc2);
      noteSelection(editor.state);
    };
    const scheduleExternalApply = () => {
      const generation = ++externalApplyGenerationRef.current;
      queueMicrotask(() => {
        if (generation !== externalApplyGenerationRef.current) {
          return;
        }
        applyExternalValue(sourceRef.current.get());
      });
    };
    if (intakeSeededEditorRef.current === editor) {
      scheduleExternalApply();
    } else {
      intakeSeededEditorRef.current = editor;
    }
    const unsubscribe = source.subscribe?.(() => scheduleExternalApply());
    return () => {
      unsubscribe?.();
    };
  }, [source, editor, noteSelection]);
  useEffect4(() => {
    if (commitBus === void 0) {
      return;
    }
    return commitBus.register(() => controllerRef.current?.flush());
  }, [commitBus]);
  useImperativeHandle(
    ref,
    () => ({
      flushCommits: () => controllerRef.current?.flush(),
      get view() {
        return editor !== null && !editor.isDestroyed ? editor.view : null;
      },
      get editor() {
        return editor !== null && !editor.isDestroyed ? editor : null;
      },
      getNode: (nodeId) => {
        if (editor === null || editor.isDestroyed) {
          return null;
        }
        const found = findNodeById(editor.state.doc, nodeId);
        if (found === null) {
          return null;
        }
        const typeName = found.node.type.name;
        const entry = manifestList.flatMap((manifest) => manifest.nodes).find((node) => node.name === typeName);
        return {
          type: typeName,
          attrsSchema: attrsSchemaWithoutIdentity(entry?.attrsSchema),
          attrs: withoutIdentity(found.node.attrs)
        };
      },
      setNodeAttrs: (nodeId, attrs) => {
        if (editor === null || editor.isDestroyed) {
          return;
        }
        const found = findNodeById(editor.state.doc, nodeId);
        if (found === null) {
          return;
        }
        const merged = {
          ...found.node.attrs,
          ...attrs,
          [NODE_ID_ATTR]: found.node.attrs[NODE_ID_ATTR]
        };
        editor.chain().command(({ tr }) => {
          tr.setNodeMarkup(found.pos, void 0, merged);
          return true;
        }).run();
      }
    }),
    [editor, manifestList]
  );
  const paletteTypes = useMemo3(
    () => manifestList.flatMap(
      (manifest) => manifest.nodes.filter((node) => (node.group ?? "block") === "block").map((node) => node.name)
    ),
    [manifestList]
  );
  const bubbleToggles = useMemo3(
    () => editor === null ? [] : BUBBLE_TOGGLE_MARKS.filter(([name]) => editor.schema.marks[name] !== void 0),
    [editor]
  );
  const hasLinkMark = editor !== null && editor.schema.marks.link !== void 0;
  const activeMarks = useEditorState({
    editor,
    selector: ({ editor: current }) => current === null || current.isDestroyed ? null : {
      strong: markIsActive(current, "strong"),
      em: markIsActive(current, "em"),
      code: markIsActive(current, "code"),
      link: markIsActive(current, "link")
    }
  });
  const [linkDraft, setLinkDraft] = useState3("");
  return /* @__PURE__ */ jsxs3("div", { className, "data-blockdoc-editor": "", children: [
    palette && /* @__PURE__ */ jsx3(
      "div",
      {
        "data-blockdoc-palette": "",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          padding: "4px 0",
          marginBottom: 4,
          borderBottom: "1px solid var(--stud-line)"
        },
        children: paletteTypes.map((name) => /* @__PURE__ */ jsx3(
          "button",
          {
            type: "button",
            onClick: () => {
              const type = editor?.schema.nodes[name];
              if (editor && type) {
                insertPaletteNode(editor, type);
              }
            },
            style: buttonStyle,
            children: name
          },
          name
        ))
      }
    ),
    editor !== null && (bubbleToggles.length > 0 || hasLinkMark) && /* @__PURE__ */ jsxs3(
      BubbleMenu2,
      {
        editor,
        "data-blockdoc-bubble-menu": "",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: 4,
          border: "1px solid var(--stud-line-strong)",
          borderRadius: 6,
          background: "var(--stud-surface)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
        },
        children: [
          bubbleToggles.map(([name, label]) => /* @__PURE__ */ jsx3(
            "button",
            {
              type: "button",
              "data-blockdoc-bubble-toggle": name,
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => editor.chain().focus().toggleMark(name).run(),
              style: {
                ...buttonStyle,
                fontWeight: activeMarks?.[name] === true ? 700 : 400,
                background: activeMarks?.[name] === true ? "var(--stud-line)" : "var(--stud-surface)"
              },
              children: label
            },
            name
          )),
          hasLinkMark && /* @__PURE__ */ jsxs3(Fragment3, { children: [
            /* @__PURE__ */ jsx3(
              "input",
              {
                type: "text",
                "data-blockdoc-bubble-link-input": "",
                value: linkDraft,
                onChange: (event) => setLinkDraft(event.target.value),
                placeholder: "https://\u2026",
                style: {
                  font: "inherit",
                  fontSize: 12,
                  width: 140,
                  padding: "2px 6px",
                  border: "1px solid var(--stud-line-strong)",
                  borderRadius: 4
                }
              }
            ),
            /* @__PURE__ */ jsx3(
              "button",
              {
                type: "button",
                "data-blockdoc-bubble-link-set": "",
                disabled: linkDraft === "",
                onMouseDown: (event) => event.preventDefault(),
                onClick: () => {
                  editor.chain().focus().setMark("link", { href: linkDraft }).run();
                  setLinkDraft("");
                },
                style: { ...buttonStyle, opacity: linkDraft === "" ? 0.5 : 1 },
                children: "Link"
              }
            ),
            activeMarks?.link === true && /* @__PURE__ */ jsx3(
              "button",
              {
                type: "button",
                "data-blockdoc-bubble-link-unset": "",
                onMouseDown: (event) => event.preventDefault(),
                onClick: () => editor.chain().focus().unsetMark("link").run(),
                style: buttonStyle,
                children: "Unlink"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx3(EditorContent, { editor, "data-blockdoc-mount": "" })
  ] });
});

export {
  CommitController,
  valueDocSource,
  ANNOTATION_MARK_NAME,
  annotationIntegrityPlugin,
  annotationRanges,
  annotationIds,
  nodeIdPlugin,
  BASE_PROSE_NODE_NAMES,
  createNodeViewRegistry,
  needsGenericNodeView,
  resolveNodeViewComponents,
  tiptapNodeView,
  GenericNodeView,
  createManifestExtensions,
  selectionNodeId,
  selectionForNodeId,
  findNodeById,
  BlockdocEditor
};
//# sourceMappingURL=chunk-S3UIZET3.js.map