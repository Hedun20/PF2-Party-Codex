import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "apps", "web", "dist");
const manifestPath = path.join(distDir, ".vite", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);

if (!entryKey) throw new Error("Could not find the web entry in the Vite manifest.");

const initialChunks = new Set();
const initialCss = new Set();

function collect(key) {
  if (!key || initialChunks.has(key)) return;
  const item = manifest[key];
  if (!item) return;
  initialChunks.add(key);
  for (const css of item.css || []) initialCss.add(css);
  for (const imported of item.imports || []) collect(imported);
}

function gzipBytes(relativePath) {
  return gzipSync(fs.readFileSync(path.join(distDir, relativePath))).length;
}

collect(entryKey);
const javascript = [...initialChunks].map((key) => manifest[key]?.file).filter((file) => file?.endsWith(".js"));
const jsGzipBytes = javascript.reduce((sum, file) => sum + gzipBytes(file), 0);
const cssGzipBytes = [...initialCss].reduce((sum, file) => sum + gzipBytes(file), 0);
const maxInitialJsGzip = Number(process.env.MAX_INITIAL_JS_GZIP_KB || 110) * 1024;
const maxInitialCssGzip = Number(process.env.MAX_INITIAL_CSS_GZIP_KB || 45) * 1024;

console.log(`Initial JS: ${(jsGzipBytes / 1024).toFixed(1)} KiB gzip across ${javascript.length} chunks`);
console.log(`Initial CSS: ${(cssGzipBytes / 1024).toFixed(1)} KiB gzip across ${initialCss.size} files`);

if (jsGzipBytes > maxInitialJsGzip) {
  throw new Error(`Initial JavaScript exceeds ${Math.round(maxInitialJsGzip / 1024)} KiB gzip.`);
}
if (cssGzipBytes > maxInitialCssGzip) {
  throw new Error(`Initial CSS exceeds ${Math.round(maxInitialCssGzip / 1024)} KiB gzip.`);
}
