// src/grammar.ts
var SEGMENT_PATTERN = /^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/;
var SEPARATOR = ".";
function matchSegments(input, pattern = SEGMENT_PATTERN) {
  if (input === "") {
    return null;
  }
  const segments = input.split(SEPARATOR);
  return segments.every((segment) => pattern.test(segment)) ? segments : null;
}

// src/key.ts
var InvalidRegistryKey = class extends Error {
  name = "InvalidRegistryKey";
};
var CANONICAL = /* @__PURE__ */ Symbol.for("@schemastud/registry/canonical-key");
var Key = class _Key {
  segments;
  constructor(segments) {
    this.segments = Object.freeze([...segments]);
  }
  /** The key for a string, or a thrown `InvalidRegistryKey`. */
  static parse(input) {
    const key = _Key.tryParse(input);
    if (key === null) {
      throw new InvalidRegistryKey(
        `\`${input}\` is not a legal registry key: expected dot-separated lowercase segments, e.g. \`beam.realm.overlays\`. Segments may join groups with \`-\`, \`_\` or \`:\`, but never lead, trail or double one, and \`/\` is not a key character.`
      );
    }
    return key;
  }
  /** The key for a string, or null when the string is not a legal key. */
  static tryParse(input) {
    const segments = matchSegments(input);
    return segments === null ? null : new _Key(segments);
  }
  /**
   * The zero-segment key: the root of the whole tree. It displays as the empty string, and this
   * is the only way to get it. `parse('')` throws, because an empty string arriving from config
   * or a request is a mistake, not an address.
   */
  static root() {
    return new _Key([]);
  }
  /** A key passes through untouched, whatever its type; a string is parsed. */
  static of(key) {
    return typeof key === "string" ? _Key.parse(key) : key;
  }
  /** True on every canonical key, from this copy of the package or another. Not part of the interface. */
  get [CANONICAL]() {
    return true;
  }
  /** The dotted rendering. Empty for the root. */
  get display() {
    return this.segments.join(SEPARATOR);
  }
  equals(other) {
    return keysEqual(this, other);
  }
  /** The key one segment shallower, or null for a single-segment key and for the root. */
  parent() {
    return this.segments.length < 2 ? null : new _Key(this.segments.slice(0, -1));
  }
  /**
   * Whether this key sits strictly below `other`, compared segment by segment: `beam.realms` is
   * not under `beam.realm`, and a key is not under itself. Every key with segments is under the
   * root. A string is parsed, so an illegal one throws.
   */
  isUnder(other) {
    const prefix = _Key.of(other).segments;
    if (prefix.length >= this.segments.length) {
      return false;
    }
    return prefix.every((segment, index) => segment === this.segments[index]);
  }
  /**
   * This key as a registry rooted at `root` stores it. A key equal to the root or under it is
   * already absolute and comes back untouched; any other key is relative and gets the root's
   * segments joined onto its front. So it is idempotent, and under the zero-segment root every key
   * comes back untouched.
   *
   * A key that only looks absolute, because it sits under some other root, is read as relative
   * and joined: nothing here can tell that from a typo.
   */
  underRoot(root) {
    if (this.equals(root) || this.isUnder(root)) {
      return this;
    }
    return new _Key([...root.segments, ...this.segments]);
  }
  toString() {
    return this.display;
  }
};
function canonicalKey(key) {
  if (key instanceof Key) {
    return key;
  }
  if (key[CANONICAL] !== true) {
    return null;
  }
  return key.segments.length === 0 ? Key.root() : Key.parse(key.segments.join(SEPARATOR));
}
function keysEqual(a, b) {
  return a.segments.length === b.segments.length && a.segments.every((segment, index) => segment === b.segments[index]);
}
function foreignKey(segments, display) {
  if (segments.length === 0) {
    throw new InvalidRegistryKey("A carried key needs at least one segment. The zero-segment root is `Key.root()`.");
  }
  return Object.freeze({ segments: Object.freeze([...segments]), display });
}

// src/policy.ts
var OnKeyDuplicate = {
  /** The later write takes the key, in the earlier one's place in the order. What it displaced is recorded. */
  Supersede: "supersede",
  /** The later write is refused: `register` throws `DuplicateRegistryKey`. */
  Reject: "reject",
  /** Both entries live under the key. `matches` returns both; `resolve` of that key is ambiguous. */
  Admit: "admit"
};
var PopulationRequirement = {
  /** Empty is a bug: `resolve` on the empty registry misses with `MissReason.Unpopulated`. */
  Required: "required",
  /** Empty is normal. */
  Optional: "optional"
};
var MissReason = {
  /** No entry at the key, and none under it. */
  Absent: "absent",
  /** Several entries answer and none is the one: an admitted duplicate, or a key that names a branch. */
  Ambiguous: "ambiguous",
  /** The registry declares itself required and nothing has registered into it. */
  Unpopulated: "unpopulated"
};

// src/errors.ts
var RegistryMiss = class extends Error {
  constructor(key, reason, candidates, message) {
    super(message);
    this.key = key;
    this.reason = reason;
    this.candidates = candidates;
  }
  key;
  reason;
  candidates;
  name = "RegistryMiss";
};
var AmbiguousRegistryMatch = class extends RegistryMiss {
  name = "AmbiguousRegistryMatch";
};
var DuplicateRegistryKey = class extends Error {
  constructor(key, incoming, existing) {
    super(
      `An entry is already registered under \`${key.display}\`${existing === null ? "" : ` (by ${existing})`}; this registry rejects duplicates rather than overwriting, so the incoming registration${incoming === null ? "" : ` from ${incoming}`} was refused. Two entries under one key need two keys.`
    );
    this.key = key;
    this.incoming = incoming;
    this.existing = existing;
  }
  key;
  incoming;
  existing;
  name = "DuplicateRegistryKey";
};
var UnregisteredRegistry = class extends Error {
  constructor(key, roots) {
    super(
      `No registry claims \`${key.display}\`: no described root is a prefix of it. Described roots are: ` + roots.map((root) => root.segments.length === 0 ? "`` (the index)" : `\`${root.display}\``).join(", ") + "."
    );
    this.key = key;
    this.roots = roots;
  }
  key;
  roots;
  name = "UnregisteredRegistry";
};
function absentMiss(key) {
  return new RegistryMiss(key, MissReason.Absent, [], `No entry registered under \`${key.display}\`.`);
}
function ambiguousMiss(key, candidates) {
  return new AmbiguousRegistryMatch(
    key,
    MissReason.Ambiguous,
    candidates,
    `\`${key.display}\` is ambiguous: ${candidates.length} candidates and no single answer: ` + candidates.map((candidate2) => `\`${candidate2.key.display}\`${candidate2.by === null ? "" : ` (by ${candidate2.by})`}`).join(", ") + ". Name one exactly."
  );
}
function unpopulatedMiss(key, root) {
  return new RegistryMiss(
    key,
    MissReason.Unpopulated,
    [],
    `The \`${root.display}\` registry declares itself required and is empty: nothing has registered into it. This is usually a registration that did not run, not a bad key.`
  );
}

// src/segments.ts
function isBelow(key, prefix) {
  return prefix.segments.length < key.segments.length && prefix.segments.every((segment, index) => segment === key.segments[index]);
}
function identityOf(key) {
  return JSON.stringify(key.segments);
}

// src/registry.ts
function createRegistry(declaration) {
  const root = typeof declaration.root === "string" ? Key.parse(declaration.root) : declaration.root;
  if (root.segments.length === 0) {
    throw new InvalidRegistryKey("A registry cannot be rooted at the zero-segment root. Only the index owns it.");
  }
  return new RegistryStore({ ...declaration, root });
}
var RegistryStore = class {
  declaration;
  // One list, held in registration order. A superseding record is put in the place of the
  // one it displaces, so the list's own order is the order every read returns.
  entries = [];
  displaced = /* @__PURE__ */ new Map();
  sequence = 0;
  constructor(declaration) {
    this.declaration = Object.freeze({
      root: declaration.root,
      onKeyDuplicate: declaration.onKeyDuplicate ?? OnKeyDuplicate.Supersede,
      populationRequirement: declaration.populationRequirement ?? PopulationRequirement.Optional,
      description: declaration.description ?? null
    });
  }
  register(key, entry, by) {
    const stored = this.door(key);
    const policy = this.declaration.onKeyDuplicate;
    const occupied = policy === OnKeyDuplicate.Admit ? -1 : this.entries.findIndex((record2) => keysEqual(record2.key, stored));
    const record = { key: stored, entry, by, sequence: this.sequence };
    if (occupied === -1) {
      this.entries.push(record);
      this.sequence++;
      return this;
    }
    const occupant = this.entries[occupied];
    if (policy === OnKeyDuplicate.Reject) {
      throw new DuplicateRegistryKey(stored, by, occupant.by);
    }
    const identity = identityOf(stored);
    const history = this.displaced.get(identity) ?? [];
    history.push(Object.freeze({ key: occupant.key, entry: occupant.entry, by: occupant.by, supersededBy: by, sequence: occupant.sequence }));
    this.displaced.set(identity, history);
    this.entries[occupied] = record;
    this.sequence++;
    return this;
  }
  has(key) {
    const stored = this.door(key);
    return this.entries.some((record) => keysEqual(record.key, stored));
  }
  resolve(key) {
    const stored = this.door(key);
    if (this.entries.length === 0 && this.declaration.populationRequirement === PopulationRequirement.Required) {
      throw unpopulatedMiss(stored, this.declaration.root);
    }
    const exact = this.entries.filter((record) => keysEqual(record.key, stored));
    if (exact.length === 1) {
      return exact[0].entry;
    }
    if (exact.length > 1) {
      throw ambiguousMiss(stored, exact.map(candidate));
    }
    const below = this.entries.filter((record) => isBelow(record.key, stored));
    if (below.length > 0) {
      throw ambiguousMiss(stored, below.map(candidate));
    }
    throw absentMiss(stored);
  }
  tryResolve(key) {
    try {
      return this.resolve(key);
    } catch (miss) {
      if (miss instanceof RegistryMiss && !(miss instanceof AmbiguousRegistryMatch)) {
        return null;
      }
      throw miss;
    }
  }
  matches(key) {
    const stored = this.door(key);
    return this.entries.filter((record) => keysEqual(record.key, stored) || isBelow(record.key, stored)).map((record) => record.entry);
  }
  keys() {
    const keys = /* @__PURE__ */ new Map();
    for (const record of this.entries) {
      const identity = identityOf(record.key);
      if (!keys.has(identity)) {
        keys.set(identity, record.key);
      }
    }
    return [...keys.values()];
  }
  registrantOf(key) {
    const stored = this.door(key);
    return this.entries.find((record) => keysEqual(record.key, stored))?.by ?? null;
  }
  superseded(key) {
    return [...this.displaced.get(identityOf(this.door(key))) ?? []];
  }
  keyFor(name) {
    const root = this.declaration.root;
    const parsed = Key.tryParse(name);
    if (parsed !== null && root.segments.length > 0 && (parsed.equals(root) || parsed.isUnder(root))) {
      return foreignKey([...root.segments, name], `${root.display}.${name}`);
    }
    if (parsed !== null) {
      return parsed.underRoot(root);
    }
    return foreignKey([...root.segments, name], root.segments.length === 0 ? name : `${root.display}.${name}`);
  }
  names() {
    const root = this.declaration.root;
    const depth = root.segments.length;
    return this.keys().map((key) => keysEqual(key, root) || isBelow(key, root) ? key.segments.slice(depth).join(".") : key.display);
  }
  /** Every key argument's one way in: parse a string, then join a canonical key to the declared root. */
  door(key) {
    const parsed = Key.of(key);
    return canonicalKey(parsed)?.underRoot(this.declaration.root) ?? parsed;
  }
};
function candidate(record) {
  return { key: record.key, by: record.by };
}

// src/registry-index.ts
var SELF = "@schemastud/registry";
function createRegistryIndex() {
  return new Index();
}
var Index = class {
  registries = new RegistryStore({
    root: Key.root(),
    onKeyDuplicate: OnKeyDuplicate.Supersede,
    populationRequirement: PopulationRequirement.Required,
    description: "Every described registry, keyed by the root of the keyspace it owns. A second registry described at a taken root takes it, and the first is recorded."
  });
  owners = /* @__PURE__ */ new Map();
  constructor() {
    this.registries.register(Key.root(), this, SELF);
  }
  get declaration() {
    return this.registries.declaration;
  }
  describe(registry, by, owner) {
    const root = registry.declaration.root;
    if (root.segments.length === 0) {
      throw new InvalidRegistryKey("Only the index owns the zero-segment root, and it describes itself. A second registry cannot be described there.");
    }
    this.registries.register(root, registry, by);
    if (owner === void 0) {
      this.owners.delete(identityOf(root));
    } else {
      this.owners.set(identityOf(root), owner);
    }
    return this;
  }
  routeTo(key) {
    const routed = Key.of(key);
    let best = null;
    for (const root of this.registries.keys()) {
      const depth = root.segments.length;
      if (!keysEqual(routed, root) && (depth === 0 || !isBelow(routed, root))) {
        continue;
      }
      if (best === null || depth > best.segments.length) {
        best = root;
      }
    }
    return best === null ? null : this.registries.resolve(best);
  }
  ownerOf(key) {
    const registry = this.routeTo(key);
    if (registry === null) {
      throw new UnregisteredRegistry(Key.of(key), this.registries.keys());
    }
    return registry;
  }
  owner(root) {
    const key = Key.of(root);
    return this.owners.get(identityOf(key)) ?? this.registries.tryResolve(key);
  }
  register(key, entry, by) {
    this.registries.register(key, entry, by);
    return this;
  }
  has(key) {
    return this.registries.has(key);
  }
  resolve(key) {
    return this.registries.resolve(key);
  }
  tryResolve(key) {
    return this.registries.tryResolve(key);
  }
  matches(key) {
    return this.registries.matches(key);
  }
  keys() {
    return this.registries.keys();
  }
  registrantOf(key) {
    return this.registries.registrantOf(key);
  }
  superseded(key) {
    return this.registries.superseded(key);
  }
  keyFor(name) {
    return this.registries.keyFor(name);
  }
  names() {
    return this.registries.names();
  }
};

// src/snapshot.ts
var keyData = (key) => ({ segments: [...key.segments], display: key.display });
function snapshotRegistryIndex(index) {
  const registries = [];
  for (const root of index.keys()) {
    if (root.segments.length === 0) {
      continue;
    }
    const registry = index.resolve(root);
    const { onKeyDuplicate, populationRequirement, description } = registry.declaration;
    const keys = registry.keys();
    const names = registry.names();
    registries.push({
      root: keyData(root),
      describedBy: index.registrantOf(root),
      declaration: { onKeyDuplicate, populationRequirement, description },
      keys: keys.map((key, at) => ({ key: keyData(key), name: names[at] ?? key.display, registrant: registry.registrantOf(key) }))
    });
  }
  return { version: 1, registries };
}
export {
  AmbiguousRegistryMatch,
  DuplicateRegistryKey,
  InvalidRegistryKey,
  Key,
  MissReason,
  OnKeyDuplicate,
  PopulationRequirement,
  RegistryMiss,
  UnregisteredRegistry,
  createRegistry,
  createRegistryIndex,
  foreignKey,
  keysEqual,
  snapshotRegistryIndex
};
//# sourceMappingURL=index.js.map