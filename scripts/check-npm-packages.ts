import { strict as assert } from "node:assert";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const output = join(root, "dist/npm");
const temporary = await mkdtemp(join(tmpdir(), "mmd-release-"));
const names = ["mmd-contracts", "mmd-engine", "mmd-renderer"];

async function run(command: string[], cwd: string) {
  const process = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "inherit" });
  const text = await new Response(process.stdout).text();
  if (await process.exited !== 0) throw new Error(`Failed: ${command.join(" ")}`);
  return text;
}

try {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const tarballs: string[] = [];
  const packages = [];
  let version: string | undefined;

  for (const name of names) {
    const source = join(root, "packages", name);
    const staging = join(temporary, name);
    const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
    version ??= manifest.version;
    assert.equal(manifest.version, version, "Package versions must match");
    assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/, "Expected a stable or beta version");
    const tag = manifest.version.includes("-beta.") ? "beta" : "latest";
    assert.equal(manifest.private, undefined);

    for (const dependencies of [manifest.dependencies, manifest.peerDependencies]) {
      for (const [dependency, range] of Object.entries(dependencies ?? {})) {
        assert(!/^(workspace:|file:|link:)/.test(String(range)), `Local dependency: ${dependency}`);
        if (names.includes(dependency)) assert.equal(range, version);
      }
    }

    await mkdir(staging);
    await cp(join(source, "dist"), join(staging, "dist"), { recursive: true });
    await cp(join(source, "package.json"), join(staging, "package.json"));
    await cp(join(source, "README.md"), join(staging, "README.md"));
    await cp(join(root, "LICENSE"), join(staging, "LICENSE"));
    const [packed] = JSON.parse(await run([
      "npm", "pack", "--ignore-scripts", "--json", "--pack-destination", output,
    ], staging));
    const files = new Set(packed.files.map((file: { path: string }) => file.path));
    for (const file of ["package.json", "LICENSE", "README.md", "dist/index.js", "dist/index.d.ts"]) {
      assert(files.has(file), `${name}: missing ${file}`);
    }
    for (const file of files) {
      assert(typeof file === "string" && /^(dist\/|package\.json$|README\.md$|LICENSE$)/.test(file));
    }
    tarballs.push(join(output, packed.filename));
    packages.push({ name, version, tag, filename: packed.filename, integrity: packed.integrity });
    console.log(`${name}@${version}: ${packed.files.length} files, ${packed.size} bytes`);
  }

  const consumer = join(temporary, "consumer");
  await mkdir(consumer);
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  // Install outside the workspace so missing runtime dependencies cannot be hidden by hoisting.
  console.log(await run([
    "npm", "install", "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org",
    ...tarballs, "react@19", "react-dom@19", "antd@6", "typescript@5", "@types/react@19", "@types/react-dom@19",
  ], consumer));
  await writeFile(join(consumer, "check.mjs"), `
    import assert from 'node:assert/strict';
    import * as contracts from 'mmd-contracts';
    import { MmdEngine } from 'mmd-engine';
    import { MmdProvider, MmdView } from 'mmd-renderer';
    assert(Object.keys(contracts).length > 0);
    assert.equal(typeof MmdEngine, 'function');
    assert.equal(typeof MmdProvider, 'function');
    assert.equal(typeof MmdView, 'function');
  `);
  await run(["node", "check.mjs"], consumer);
  await writeFile(join(consumer, "check.ts"), `
    import type { ModelDefinition } from 'mmd-contracts';
    import { MmdEngine } from 'mmd-engine';
    import { MmdProvider, MmdView } from 'mmd-renderer';
    const model: ModelDefinition = { name: 'Product', primaryKey: 'id', fields: [] };
    void [model, MmdEngine, MmdProvider, MmdView];
  `);
  await run([
    join(consumer, "node_modules/.bin/tsc"), "--noEmit", "--skipLibCheck", "--strict",
    "--module", "NodeNext", "--target", "ES2022", "check.ts",
  ], consumer);
  await writeFile(join(output, "packages.json"), JSON.stringify(packages, null, 2));
  console.log("Package installation, Node imports, and TypeScript declarations passed.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
