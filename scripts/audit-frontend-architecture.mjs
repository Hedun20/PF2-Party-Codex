import fs from "node:fs";
import path from "node:path";

import { APP_ROUTE_LIST, LEGACY_ROUTE_REDIRECTS } from "../apps/web/src/routing/appRoutes.js";

const root = process.cwd();
const webRoot = path.join(root, "apps", "web", "src");
const outputDir = path.resolve(root, process.argv[2] || "artifacts/ss-stage1");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }).sort();
}
function rel(file) { return path.relative(root, file).replaceAll(path.sep, "/"); }
function read(file) { return fs.readFileSync(file, "utf8"); }
function countLines(text) { return text === "" ? 0 : text.split(/\r?\n/).length; }
function unique(values) { return [...new Set(values)].sort(); }
function matches(text, regex, group = 1) { return [...text.matchAll(regex)].map((match) => match[group]).filter(Boolean); }
function markdownTable(headers, rows) {
  if (!rows.length) return "_None._";
  const escape = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
  return [`| ${headers.map(escape).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`)].join("\n");
}

if (!fs.existsSync(webRoot)) throw new Error(`Frontend source directory not found: ${webRoot}`);

const files = walk(webRoot);
const sourceFiles = files.filter((file) => /\.(jsx?|mjs|css)$/.test(file));
const pageFiles = sourceFiles.filter((file) => rel(file).startsWith("apps/web/src/pages/") && /\.jsx$/.test(file));
const componentFiles = sourceFiles.filter((file) => rel(file).startsWith("apps/web/src/components/") && /\.jsx$/.test(file));
const styleFiles = sourceFiles.filter((file) => /\.css$/.test(file));

const canonicalRoutes = APP_ROUTE_LIST.map((route) => ({ id: route.id, path: route.pattern, kind: "canonical", scope: route.scope, access: route.access, title: route.title }));
const legacyRoutes = LEGACY_ROUTE_REDIRECTS.map((route) => ({ id: `legacy:${route.path}`, path: route.path, kind: "legacy-redirect", scope: route.campaign ? "campaign" : "public/account", access: route.manager ? "manager" : "redirect", title: route.target }));
const routeRecords = [...canonicalRoutes, ...legacyRoutes];

const styleImports = [];
for (const file of styleFiles) {
  const source = read(file);
  for (const imported of matches(source, /@import\s+["'](.+?\.css)["']/g)) styleImports.push({ importer: rel(file), imported });
}

const sourceInventory = sourceFiles.map((file) => {
  const source = read(file);
  const filePath = rel(file);
  return {
    path: filePath,
    kind: filePath.includes("/pages/") ? "page" : filePath.includes("/components/") ? "component" : filePath.endsWith(".css") ? "style" : "other",
    lines: countLines(source),
    apiCalls: unique(matches(source, /\bapi\.([A-Za-z0-9_]+)\s*\(/g)),
    navigationTargets: unique([...matches(source, /\bnavigate\(\s*["'`]([^"'`]+)["'`]/g), ...matches(source, /\bto=["']([^"']+)["']/g), ...matches(source, /\bhref=["']([^"']+)["']/g)]),
    inlineStyleCount: (source.match(/\bstyle\s*=\s*\{/g) || []).length,
    localStorageUses: (source.match(/\b(localStorage|sessionStorage)\b/g) || []).length,
    roleTerms: unique(matches(source, /["'](owner|gm|player|platformAdmin)["']/g))
  };
});

const cssInventory = styleFiles.map((file) => {
  const source = read(file);
  const filePath = rel(file);
  const selectors = matches(source, /(?:^|\})\s*([^@{}][^{}]*)\{/gm).flatMap((selector) => selector.split(",")).map((selector) => selector.trim()).filter(Boolean);
  const classes = unique(selectors.flatMap((selector) => matches(selector, /\.([A-Za-z_-][A-Za-z0-9_-]*)/g)));
  return {
    path: filePath, lines: countLines(source), selectors: selectors.length, classes,
    importantCount: (source.match(/!important/g) || []).length,
    hardCodedColorCount: (source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || []).length,
    stageLike: /(?:stage\d+|hotfix|stabilization|legacy)/i.test(filePath)
  };
});

const classOwners = new Map();
for (const item of cssInventory) for (const className of item.classes) {
  if (!classOwners.has(className)) classOwners.set(className, []);
  classOwners.get(className).push(item.path);
}
const duplicatedCssClasses = [...classOwners.entries()].map(([className, owners]) => ({ className, owners: unique(owners) })).filter((item) => item.owners.length > 1).sort((a, b) => b.owners.length - a.owners.length || a.className.localeCompare(b.className));

const pageInventory = pageFiles.map((file) => {
  const item = sourceInventory.find((entry) => entry.path === rel(file));
  return { path: rel(file), lines: item.lines, apiCalls: item.apiCalls, navigationTargets: item.navigationTargets, inlineStyleCount: item.inlineStyleCount, localStorageUses: item.localStorageUses, roleTerms: item.roleTerms };
});
const shells = componentFiles.filter((file) => /Shell|Layout|Navigation|Sidebar|Topbar/i.test(path.basename(file))).map((file) => sourceInventory.find((entry) => entry.path === rel(file)));

const summary = {
  generatedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || "",
  counts: {
    sourceFiles: sourceFiles.length, pages: pageFiles.length, components: componentFiles.length, styles: styleFiles.length,
    canonicalRoutes: canonicalRoutes.length, legacyRedirects: legacyRoutes.length, routeRecords: routeRecords.length,
    styleImports: styleImports.length, stageLikeStyleFiles: cssInventory.filter((item) => item.stageLike).length,
    duplicatedCssClasses: duplicatedCssClasses.length, filesWithInlineStyles: sourceInventory.filter((item) => item.inlineStyleCount > 0).length,
    totalInlineStyles: sourceInventory.reduce((sum, item) => sum + item.inlineStyleCount, 0), filesUsingBrowserStorage: sourceInventory.filter((item) => item.localStorageUses > 0).length
  },
  routes: routeRecords, pages: pageInventory, shells,
  css: cssInventory.map(({ classes, ...item }) => ({ ...item, classSelectors: classes.length })),
  styleImports, duplicatedCssClasses, sourceInventory
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "frontend-inventory.json"), `${JSON.stringify(summary, null, 2)}\n`);
const markdown = `# SS — Generated Frontend Architecture Inventory

Generated: ${summary.generatedAt}

## Summary

${markdownTable(["Metric", "Count"], Object.entries(summary.counts).map(([key, value]) => [key, value]))}

## Route inventory

${markdownTable(["Kind", "ID", "Path", "Scope", "Access"], routeRecords.map((route) => [route.kind, route.id, route.path, route.scope, route.access]))}

## Page inventory

${markdownTable(["Page", "Lines", "API calls", "Navigation targets", "Inline styles", "Storage", "Roles"], pageInventory.map((page) => [page.path, page.lines, page.apiCalls.join(", "), page.navigationTargets.join("<br>"), page.inlineStyleCount, page.localStorageUses, page.roleTerms.join(", ")]))}

## Shell candidates

${markdownTable(["File", "Lines", "Navigation targets", "Inline styles"], shells.map((shell) => [shell.path, shell.lines, shell.navigationTargets.join("<br>"), shell.inlineStyleCount]))}

## CSS inventory

${markdownTable(["File", "Lines", "Selectors", "Classes", "!important", "Hard-coded colors", "Stage/legacy"], cssInventory.map((item) => [item.path, item.lines, item.selectors, item.classes.length, item.importantCount, item.hardCodedColorCount, item.stageLike ? "yes" : "no"]))}

## CSS import graph

${markdownTable(["Importer", "Imported stylesheet"], styleImports.map((item) => [item.importer, item.imported]))}

## Most duplicated CSS class names

${markdownTable(["Class", "Stylesheet count", "Owners"], duplicatedCssClasses.slice(0, 100).map((item) => [item.className, item.owners.length, item.owners.join("<br>")]))}
`;
fs.writeFileSync(path.join(outputDir, "frontend-inventory.md"), markdown);
console.log(JSON.stringify(summary.counts, null, 2));
console.log(`Inventory written to ${path.relative(root, outputDir)}`);
