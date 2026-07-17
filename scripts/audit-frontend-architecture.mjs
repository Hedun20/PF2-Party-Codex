import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const webRoot = path.join(root, 'apps', 'web', 'src');
const outputDir = path.resolve(root, process.argv[2] || 'artifacts/ss-stage1');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(absolute) : [absolute];
    })
    .sort();
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function countLines(text) {
  return text === '' ? 0 : text.split(/\r?\n/).length;
}

function unique(values) {
  return [...new Set(values)].sort();
}

function matches(text, regex, group = 1) {
  return [...text.matchAll(regex)].map((match) => match[group]).filter(Boolean);
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_None._';
  const escape = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>');
  return [
    `| ${headers.map(escape).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`)
  ].join('\n');
}

if (!fs.existsSync(webRoot)) {
  throw new Error(`Frontend source directory not found: ${webRoot}`);
}

const files = walk(webRoot);
const sourceFiles = files.filter((file) => /\.(jsx?|mjs|css)$/.test(file));
const pageFiles = sourceFiles.filter((file) => rel(file).startsWith('apps/web/src/pages/') && /\.jsx$/.test(file));
const componentFiles = sourceFiles.filter((file) => rel(file).startsWith('apps/web/src/components/') && /\.jsx$/.test(file));
const styleFiles = sourceFiles.filter((file) => /\.css$/.test(file));
const appFile = path.join(webRoot, 'App.jsx');
const appSource = read(appFile);

const lazyImports = [...appSource.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(["'](.+?)["']\)/g)]
  .map((match) => ({ symbol: match[1], source: match[2] }));

const routeRecords = [...appSource.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{([\s\S]*?)\}\s*\/>/g)]
  .map((match) => {
    const expression = match[2].replace(/\s+/g, ' ').trim();
    const guard = expression.includes('managerRoute(')
      ? 'manager'
      : expression.includes('accountRoute(')
        ? 'account'
        : expression.includes('campaignRoute(')
          ? 'campaign-member'
          : 'public/direct';
    const components = unique(matches(expression, /<([A-Z][A-Za-z0-9_]*)\b/g));
    return { path: match[1], guard, expression, components };
  });

const routeFamilies = routeRecords.reduce((result, route) => {
  const family = route.path.startsWith('/world/')
    ? 'world-scoped'
    : route.path === '*'
      ? 'fallback'
      : route.path.split('/').filter(Boolean)[0] || 'root';
  result[family] ||= [];
  result[family].push(route.path);
  return result;
}, {});

const styleImports = [];
for (const file of styleFiles) {
  const source = read(file);
  for (const imported of matches(source, /@import\s+["'](.+?\.css)["']/g)) {
    styleImports.push({ importer: rel(file), imported });
  }
}

const sourceInventory = sourceFiles.map((file) => {
  const source = read(file);
  const filePath = rel(file);
  const apiCalls = unique(matches(source, /\bapi\.([A-Za-z0-9_]+)\s*\(/g));
  const navigationTargets = unique([
    ...matches(source, /\bnavigate\(\s*["'`]([^"'`]+)["'`]/g),
    ...matches(source, /\bto=["']([^"']+)["']/g),
    ...matches(source, /\bhref=["']([^"']+)["']/g)
  ]);
  const cssClasses = unique(matches(source, /className=["']([^"']+)["']/g)
    .flatMap((value) => value.split(/\s+/).filter(Boolean)));
  const inlineStyleCount = (source.match(/\bstyle\s*=\s*\{\{/g) || []).length
    + (source.match(/\bstyle\s*=\s*\{[^\{]/g) || []).length;
  const directDomQueries = (source.match(/document\.(querySelector|getElementById)|window\.(getComputedStyle|matchMedia)/g) || []).length;
  const localStorageUses = (source.match(/\b(localStorage|sessionStorage)\b/g) || []).length;
  const roleTerms = unique(matches(source, /["'](owner|gm|player|platformAdmin)["']/g));

  return {
    path: filePath,
    kind: filePath.includes('/pages/') ? 'page' : filePath.includes('/components/') ? 'component' : filePath.endsWith('.css') ? 'style' : 'other',
    lines: countLines(source),
    apiCalls,
    navigationTargets,
    cssClasses,
    inlineStyleCount,
    directDomQueries,
    localStorageUses,
    roleTerms
  };
});

const cssInventory = styleFiles.map((file) => {
  const source = read(file);
  const filePath = rel(file);
  const selectors = matches(source, /(?:^|\})\s*([^@{}][^{}]*)\{/gm)
    .flatMap((selector) => selector.split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
  const classSelectors = unique(selectors.flatMap((selector) => matches(selector, /\.([A-Za-z_-][A-Za-z0-9_-]*)/g)));
  const importantCount = (source.match(/!important/g) || []).length;
  const hardCodedColorCount = (source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || []).length;
  const customPropertiesDeclared = unique(matches(source, /--([A-Za-z0-9_-]+)\s*:/g));
  const customPropertiesUsed = unique(matches(source, /var\(--([A-Za-z0-9_-]+)/g));
  const stageLike = /(?:stage\d+|hotfix|stabilization|legacy)/i.test(filePath);
  return {
    path: filePath,
    lines: countLines(source),
    selectors: selectors.length,
    classSelectors: classSelectors.length,
    importantCount,
    hardCodedColorCount,
    customPropertiesDeclared,
    customPropertiesUsed,
    stageLike
  };
});

const cssClassOwners = new Map();
for (const item of cssInventory) {
  const source = read(path.join(root, item.path));
  const classes = unique(matches(source, /\.([A-Za-z_-][A-Za-z0-9_-]*)/g));
  for (const className of classes) {
    if (!cssClassOwners.has(className)) cssClassOwners.set(className, []);
    cssClassOwners.get(className).push(item.path);
  }
}

const duplicatedCssClasses = [...cssClassOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([className, owners]) => ({ className, owners: unique(owners), count: unique(owners).length }))
  .sort((a, b) => b.count - a.count || a.className.localeCompare(b.className));

const pageInventory = pageFiles.map((file) => {
  const item = sourceInventory.find((entry) => entry.path === rel(file));
  const source = read(file);
  const exportedSymbols = unique([
    ...matches(source, /export\s+default\s+function\s+(\w+)/g),
    ...matches(source, /export\s+function\s+(\w+)/g),
    ...matches(source, /export\s+const\s+(\w+)/g)
  ]);
  const headings = unique([
    ...matches(source, /<h[1-3][^>]*>([^<{][^<]*)<\/h[1-3]>/g),
    ...matches(source, /title=["']([^"']+)["']/g)
  ]).slice(0, 10);
  return {
    path: rel(file),
    exportedSymbols,
    lines: item.lines,
    apiCalls: item.apiCalls,
    navigationTargets: item.navigationTargets,
    inlineStyleCount: item.inlineStyleCount,
    localStorageUses: item.localStorageUses,
    roleTerms: item.roleTerms,
    headings
  };
});

const shells = componentFiles
  .filter((file) => /Shell|Layout|Navigation|Sidebar|Topbar/i.test(path.basename(file)))
  .map((file) => {
    const item = sourceInventory.find((entry) => entry.path === rel(file));
    return {
      path: rel(file),
      lines: item.lines,
      apiCalls: item.apiCalls,
      navigationTargets: item.navigationTargets,
      inlineStyleCount: item.inlineStyleCount
    };
  });

const potentialPageDuplicates = [
  ['Home surfaces', ['DashboardPage.jsx', 'GmHomePage.jsx', 'PlayerHomePage.jsx', 'WorldDashboardPage.jsx']],
  ['Archive/category surfaces', ['CampaignArchivePage.jsx', 'CategoryPage.jsx', 'PageView.jsx']],
  ['Session surfaces', ['SessionsPage.jsx', 'SessionDeskPage.jsx', 'SessionModePage.jsx']],
  ['Player/reveal surfaces', ['PlayerHomePage.jsx', 'PlayerRevealPage.jsx', 'PlayerSafetyPage.jsx']],
  ['Editor surfaces', ['EditorPage.jsx', 'RawEditorPage.jsx']]
].map(([name, basenames]) => ({
  name,
  files: pageInventory.filter((page) => basenames.includes(path.basename(page.path))).map((page) => page.path)
}));

const summary = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || '',
  counts: {
    sourceFiles: sourceFiles.length,
    pages: pageFiles.length,
    components: componentFiles.length,
    styles: styleFiles.length,
    routes: routeRecords.length,
    routeFamilies: Object.keys(routeFamilies).length,
    styleImports: styleImports.length,
    stageLikeStyleFiles: cssInventory.filter((item) => item.stageLike).length,
    duplicatedCssClasses: duplicatedCssClasses.length,
    filesWithInlineStyles: sourceInventory.filter((item) => item.inlineStyleCount > 0).length,
    totalInlineStyles: sourceInventory.reduce((sum, item) => sum + item.inlineStyleCount, 0),
    filesUsingBrowserStorage: sourceInventory.filter((item) => item.localStorageUses > 0).length
  },
  routes: routeRecords,
  routeFamilies,
  lazyImports,
  pages: pageInventory,
  shells,
  css: cssInventory,
  styleImports,
  duplicatedCssClasses,
  sourceInventory,
  potentialPageDuplicates
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'frontend-inventory.json'), `${JSON.stringify(summary, null, 2)}\n`);

const markdown = `# SS Stage 1 — Generated Frontend Inventory

Generated: ${summary.generatedAt}

## Summary

${markdownTable(['Metric', 'Count'], Object.entries(summary.counts).map(([key, value]) => [key, value]))}

## Route inventory

${markdownTable(['Path', 'Guard', 'Rendered components'], routeRecords.map((route) => [route.path, route.guard, route.components.join(', ') || route.expression.slice(0, 100)]))}

## Route families

${markdownTable(['Family', 'Routes'], Object.entries(routeFamilies).map(([family, routes]) => [family, routes.join('<br>')]))}

## Page inventory

${markdownTable(['Page', 'Lines', 'API calls', 'Navigation targets', 'Inline styles', 'Storage', 'Role terms'], pageInventory.map((page) => [
  page.path,
  page.lines,
  page.apiCalls.join(', '),
  page.navigationTargets.join('<br>'),
  page.inlineStyleCount,
  page.localStorageUses,
  page.roleTerms.join(', ')
]))}

## Shell and navigation candidates

${markdownTable(['File', 'Lines', 'Navigation targets', 'Inline styles'], shells.map((shell) => [shell.path, shell.lines, shell.navigationTargets.join('<br>'), shell.inlineStyleCount]))}

## CSS inventory

${markdownTable(['File', 'Lines', 'Selectors', 'Classes', '!important', 'Hard-coded colors', 'Stage/legacy'], cssInventory.map((item) => [
  item.path,
  item.lines,
  item.selectors,
  item.classSelectors,
  item.importantCount,
  item.hardCodedColorCount,
  item.stageLike ? 'yes' : 'no'
]))}

## CSS import graph

${markdownTable(['Importer', 'Imported stylesheet'], styleImports.map((item) => [item.importer, item.imported]))}

## Most duplicated CSS class names

${markdownTable(['Class', 'Stylesheet count', 'Owners'], duplicatedCssClasses.slice(0, 100).map((item) => [item.className, item.count, item.owners.join('<br>')]))}

## Files containing inline styles

${markdownTable(['File', 'Inline-style occurrences'], sourceInventory.filter((item) => item.inlineStyleCount > 0).sort((a, b) => b.inlineStyleCount - a.inlineStyleCount).map((item) => [item.path, item.inlineStyleCount]))}

## Potential duplicate page families

${markdownTable(['Family', 'Files'], potentialPageDuplicates.map((item) => [item.name, item.files.join('<br>')]))}
`;

fs.writeFileSync(path.join(outputDir, 'frontend-inventory.md'), markdown);

console.log(JSON.stringify(summary.counts, null, 2));
console.log(`Inventory written to ${path.relative(root, outputDir)}`);
