import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
}

async function collectFiles(directory, predicate) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await collectFiles(entryPath, predicate)));
    else if (predicate(entryPath)) result.push(entryPath);
  }
  return result;
}

function collectImportSpecifiers(source) {
  const specifiers = [];
  const staticImport = /\b(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\sfrom\s*)?["']([^"']+)["']/g;
  const dynamicImport = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticImport, dynamicImport]) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

test("the target workspace is pinned, private and represented in the lockfile", async () => {
  const rootPackage = await readJson("package.json");
  const lockfile = await readJson("package-lock.json");
  const targetWorkspaces = [
    "apps/web-next",
    "apps/worker",
    "apps/discord-bot",
    "apps/foundry-module",
    "packages/contracts",
    "packages/core",
    "packages/config"
  ];

  assert.equal(rootPackage.packageManager, "npm@11.9.0");
  for (const workspace of targetWorkspaces) {
    assert.equal(
      rootPackage.workspaces.includes(workspace),
      true,
      `${workspace} is not a workspace`
    );
    assert.equal(Object.hasOwn(lockfile.packages, workspace), true, `${workspace} is not locked`);
    const workspacePackage = await readJson(`${workspace}/package.json`);
    assert.equal(workspacePackage.private, true, `${workspace} must remain private`);
    assert.equal(workspacePackage.type, "module", `${workspace} must be ESM`);
  }
  assert.equal(lockfile.packages["apps/web-next"].dependencies.next, "16.3.2");
  assert.equal(lockfile.packages["apps/web-next"].dependencies.react, "19.2.8");
  assert.equal(lockfile.packages["apps/foundry-module"].devDependencies.esbuild, "0.25.12");
  const foundryPackage = await readJson("apps/foundry-module/package.json");
  assert.equal(foundryPackage.devDependencies.esbuild, "0.25.12");
  assert.equal(foundryPackage.scripts.build.includes("esbuild src/index.ts --bundle"), true);
});

test("every clean CI install activates the pinned npm version first", async () => {
  const workflow = await readFile(path.join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");
  const cleanInstall = "run: npm ci";
  const pinnedInstall = "npm install --global npm@11.9.0";
  const versionProof = "npm --version | grep --fixed-strings --line-regexp 11.9.0";
  const cleanInstallIndexes = [...workflow.matchAll(new RegExp(cleanInstall, "g"))].map(
    (match) => match.index
  );
  assert.equal(cleanInstallIndexes.length, 2);
  let previousCleanInstall = 0;
  for (const cleanInstallIndex of cleanInstallIndexes) {
    const precedingJobSegment = workflow.slice(previousCleanInstall, cleanInstallIndex);
    assert.equal(precedingJobSegment.includes(pinnedInstall), true);
    assert.equal(precedingJobSegment.includes(versionProof), true);
    previousCleanInstall = cleanInstallIndex + cleanInstall.length;
  }
});

test("every target TypeScript runtime inherits the strict root contract", async () => {
  const base = await readJson("tsconfig.base.json");
  assert.equal(base.compilerOptions.strict, true);
  assert.equal(base.compilerOptions.noUncheckedIndexedAccess, true);
  assert.equal(base.compilerOptions.exactOptionalPropertyTypes, true);

  for (const workspace of [
    "apps/web-next",
    "apps/worker",
    "apps/discord-bot",
    "apps/foundry-module",
    "packages/config"
  ]) {
    const config = await readJson(`${workspace}/tsconfig.json`);
    assert.equal(config.extends, "../../tsconfig.base.json");
  }
});

test("target package manifests and source imports enforce runtime dependency boundaries", async () => {
  const boundaries = {
    "apps/web-next": {
      dependencies: [
        "@pf2-party-codex/config",
        "@pf2-party-codex/contracts",
        "@pf2-party-codex/core",
        "next",
        "react",
        "react-dom",
        "server-only"
      ],
      bareImports: [
        "@pf2-party-codex/config/public",
        "@pf2-party-codex/config/server",
        "@pf2-party-codex/contracts",
        "@pf2-party-codex/core",
        "next",
        "react",
        "server-only"
      ]
    },
    "apps/worker": {
      dependencies: [
        "@pf2-party-codex/config",
        "@pf2-party-codex/contracts",
        "@pf2-party-codex/core"
      ],
      bareImports: [
        "@pf2-party-codex/config/server",
        "@pf2-party-codex/contracts",
        "@pf2-party-codex/core"
      ]
    },
    "apps/discord-bot": {
      dependencies: ["@pf2-party-codex/config", "@pf2-party-codex/contracts"],
      bareImports: ["@pf2-party-codex/config/server", "@pf2-party-codex/contracts"]
    },
    "apps/foundry-module": {
      dependencies: ["@pf2-party-codex/config", "@pf2-party-codex/contracts"],
      bareImports: ["@pf2-party-codex/config/foundry", "@pf2-party-codex/contracts"]
    },
    "packages/config": {
      dependencies: [],
      bareImports: []
    }
  };

  for (const [workspace, boundary] of Object.entries(boundaries)) {
    const manifest = await readJson(`${workspace}/package.json`);
    assert.deepEqual(
      Object.keys(manifest.dependencies ?? {}).sort(),
      [...boundary.dependencies].sort(),
      `${workspace} dependency allowlist changed`
    );
    for (const [name, version] of Object.entries({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {})
    })) {
      assert.match(version, /^\d+\.\d+\.\d+$/, `${workspace} must pin ${name} exactly`);
    }

    const sourceRoot = path.join(repositoryRoot, workspace, "src");
    const files = await collectFiles(sourceRoot, (file) => /\.(?:ts|tsx)$/.test(file));
    for (const file of files) {
      const source = await readFile(file, "utf8");
      assert.equal(source.includes("apps/web/src"), false, `${file} imports legacy web source`);
      for (const specifier of collectImportSpecifiers(source)) {
        if (specifier.startsWith(".")) {
          const resolved = path.resolve(path.dirname(file), specifier);
          assert.equal(
            resolved === sourceRoot || resolved.startsWith(`${sourceRoot}${path.sep}`),
            true,
            `${file} crosses its source boundary through ${specifier}`
          );
          continue;
        }
        const allowed = boundary.bareImports.some(
          (candidate) => specifier === candidate || specifier.startsWith(`${candidate}/`)
        );
        assert.equal(allowed, true, `${file} imports forbidden dependency ${specifier}`);
      }
    }
  }

  const configPackage = await readJson("packages/config/package.json");
  assert.equal(
    Object.hasOwn(configPackage.exports, "."),
    false,
    "config must not expose a catch-all root"
  );
});

test("browser and Foundry artifacts contain no server secret surface or legacy CSS import", async () => {
  const forbidden = [
    "AUTH_SECRET",
    "MONGO_URI",
    "DISCORD_BOT_TOKEN",
    "WORKER_SERVICE_CREDENTIAL",
    "DISCORD_SERVICE_CREDENTIAL",
    "@pf2-party-codex/config/server",
    "apps/web/src"
  ];
  const artifactRoots = [
    path.join(repositoryRoot, "apps/foundry-module/dist"),
    path.join(repositoryRoot, "apps/web-next/.next/static")
  ];

  for (const artifactRoot of artifactRoots) {
    const files = await collectFiles(artifactRoot, (file) => /\.(?:js|css|json|map)$/.test(file));
    const content = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
    for (const marker of forbidden) {
      assert.equal(
        content.includes(marker),
        false,
        `${path.relative(repositoryRoot, artifactRoot)} leaks ${marker}`
      );
    }
  }

  const foundryBundle = await readFile(
    path.join(repositoryRoot, "apps/foundry-module/dist/index.js"),
    "utf8"
  );
  assert.equal(
    foundryBundle.includes("@pf2-party-codex/"),
    false,
    "Foundry browser bundle must not retain bare workspace imports"
  );

  const serverEnvironmentSource = await readFile(
    path.join(repositoryRoot, "apps/web-next/src/env/server.ts"),
    "utf8"
  );
  assert.equal(serverEnvironmentSource.startsWith('import "server-only";'), true);
  const publicEnvironmentSource = await readFile(
    path.join(repositoryRoot, "apps/web-next/src/env/public.ts"),
    "utf8"
  );
  assert.equal(
    publicEnvironmentSource.includes("process.env.NEXT_PUBLIC_APP_ORIGIN"),
    true,
    "Next public environment access must remain statically analyzable"
  );
  assert.equal(publicEnvironmentSource.includes("const { NEXT_PUBLIC_APP_ORIGIN }"), false);
});
