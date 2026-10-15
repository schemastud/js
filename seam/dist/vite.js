// src/vite.ts
import fs from "fs";
import { createRequire } from "module";
import path from "path";
var FAMILY_SCOPES = ["@splicewire", "@schemastud"];
function familyDistSources(root) {
  const modules = path.join(root, "node_modules");
  const seen = /* @__PURE__ */ new Set();
  const sources = [];
  for (const scope of FAMILY_SCOPES) {
    const scopeDir = path.join(modules, scope);
    if (!fs.existsSync(scopeDir)) {
      continue;
    }
    for (const name of fs.readdirSync(scopeDir).sort()) {
      const pkg = path.join(scopeDir, name);
      const dist = path.join(pkg, "dist");
      if (!fs.existsSync(dist)) {
        continue;
      }
      const real = fs.realpathSync(pkg);
      const insideHost = real === root || real.startsWith(root + path.sep);
      const insideModules = real.split(path.sep).includes("node_modules");
      if (insideHost && !insideModules) {
        continue;
      }
      const realDist = fs.realpathSync(dist);
      if (seen.has(realDist)) {
        continue;
      }
      seen.add(realDist);
      sources.push(dist);
    }
  }
  const origins = [
    path.join(root, "package.json"),
    ...sources.map((dist) => path.join(path.dirname(dist), "package.json"))
  ];
  for (const { name, dir } of RENDERED_THEMES) {
    for (const origin of origins) {
      const themeDir = resolvePackageDir(name, origin);
      if (themeDir === null) {
        continue;
      }
      const scanned = path.join(themeDir, dir);
      if (!fs.existsSync(scanned)) {
        continue;
      }
      const realScanned = fs.realpathSync(scanned);
      if (seen.has(realScanned)) {
        continue;
      }
      seen.add(realScanned);
      sources.push(scanned);
    }
  }
  return sources;
}
var RENDERED_THEMES = [{ name: "@rjsf/shadcn", dir: "lib" }];
function resolvePackageDir(name, fromPackageJson) {
  try {
    const from = fs.existsSync(fromPackageJson) ? fs.realpathSync(fromPackageJson) : fromPackageJson;
    const entry = createRequire(from).resolve(name);
    const marker = `${path.sep}node_modules${path.sep}${name.split("/").join(path.sep)}${path.sep}`;
    const at = entry.lastIndexOf(marker);
    return at === -1 ? null : entry.slice(0, at + marker.length - 1);
  } catch {
    return null;
  }
}
function familySourceBlock(dist) {
  return [
    `@source '${dist}';`,
    `@source not '${dist}/**/*.d.ts';`,
    `@source not '${dist}/**/*.map';`
  ].join("\n");
}
function familySources(options = {}) {
  let root = options.root ?? process.cwd();
  return {
    name: "beam-family-sources",
    enforce: "pre",
    configResolved(config) {
      root = options.root ?? config.root;
    },
    transform(code, id) {
      if (!id.includes(".css")) {
        return null;
      }
      const tailwindImport = /@import\s+['"]tailwindcss['"];/;
      if (!tailwindImport.test(code)) {
        return null;
      }
      const sources = familyDistSources(root);
      if (sources.length === 0) {
        return null;
      }
      const block = sources.map(familySourceBlock).join("\n");
      return code.replace(tailwindImport, (match) => `${match}
${block}`);
    }
  };
}
export {
  familyDistSources,
  familySourceBlock,
  familySources
};
//# sourceMappingURL=vite.js.map