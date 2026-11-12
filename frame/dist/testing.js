import {
  createMemoryUrlState
} from "./chunk-CWIDJYHN.js";
import {
  FrameActionError
} from "./chunk-X75EBNAR.js";

// src/testing/memoryTransport.ts
var NEVER = new Promise(() => {
});
var EMPTY_OBJECT_SCHEMA = { type: "object", properties: {} };
function lookup(map, key) {
  return map?.[key] ?? map?.["*"];
}
function createMemoryTransport(fixtures = {}, overrides = {}) {
  const rowsFor = (resource) => fixtures.empty ? [] : lookup(fixtures.rows, resource) ?? [];
  const transport = {
    list: async (resource, params) => {
      if (fixtures.loading) return NEVER;
      if (fixtures.cursorPages) {
        return fixtures.cursorPages[params.cursor ?? ""];
      }
      const data = rowsFor(resource);
      return { data, total: data.length, page: 1, perPage: 25 };
    },
    summary: async () => {
      throw new Error("No summary fixture was configured.");
    },
    get: async (resource, id) => {
      if (fixtures.loading) return NEVER;
      const row = rowsFor(resource).find((r) => String(r.id) === String(id));
      if (!row) throw new FrameActionError(404, { message: `No ${resource} record ${String(id)}.` });
      return row;
    },
    getFormSchema: async (resource) => {
      if (fixtures.loading) return NEVER;
      return lookup(fixtures.formSchema, resource) ?? EMPTY_OBJECT_SCHEMA;
    },
    create: async (_resource, data) => ({ id: "new", ...data }),
    save: async (_resource, id, data) => ({ id, ...data }),
    remove: async () => void 0,
    // The facets seam: minimal valid shapes, so the filter bar mounts.
    getFilterSchema: async () => ({ properties: {} }),
    getFilterVariants: async (resource) => ({ resource, variants: [] }),
    getFilterOptions: async () => [],
    getSavedFilters: async () => [],
    saveFilter: async (resource, payload) => ({
      id: "saved-1",
      name: payload.name,
      resource,
      queryParameters: payload.queryParameters,
      visibility: "private",
      isDefault: false
    }),
    deleteSavedFilter: async () => void 0,
    // Declared actions: a form schema per action key, and an invoke that answers with the
    // fixture's message, or refuses when the fixture says so.
    getActionSchema: async (_resource, action) => {
      if (fixtures.loading) return NEVER;
      return lookup(fixtures.actionSchema, action) ?? EMPTY_OBJECT_SCHEMA;
    },
    invoke: async (action) => {
      if (fixtures.actionRefusal) throw new Error(fixtures.actionRefusal);
      return { message: fixtures.actionMessage ?? `${action.label} done.`, data: null };
    },
    getManifest: async () => {
      if (fixtures.loading) return NEVER;
      return fixtures.manifest ?? { resources: [], contexts: {} };
    }
  };
  return { ...transport, ...overrides };
}
export {
  createMemoryTransport,
  createMemoryUrlState
};
//# sourceMappingURL=testing.js.map