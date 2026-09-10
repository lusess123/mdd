import { strict as assert } from "node:assert";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { currentVersion, releases } from "../apps/website/src/lib/releases";

const root = resolve(import.meta.dir, "..");
const read = (path: string) => readFile(resolve(root, path), "utf8");
for (const name of ["mmd-contracts", "mmd-engine", "mmd-renderer"]) {
  const manifest = JSON.parse(await read(`packages/${name}/package.json`));
  assert.equal(
    manifest.version,
    currentVersion,
    `${name}: update the release catalog`,
  );
}
const changelog = await read("CHANGELOG.md");
const docs = (
  await Promise.all(
    [
      "apps/website/src/components/docs-content.tsx",
      "apps/website/src/components/release-docs.tsx",
    ].map(read),
  )
).join("\n");
const tests = await read("tests/browser/release.spec.ts");
assert(
  changelog.includes(`## [${currentVersion}]`),
  "Add a changelog entry for this version",
);
assert(releases[0].features.length > 0, "Describe the release features");
for (const release of releases) {
  for (const feature of release.features) {
    for (const href of [feature.docs, feature.demo]) {
      const [path, anchor] = href.split("#");
      assert(
        path?.startsWith("/") && !path.includes(".."),
        `Invalid release link: ${href}`,
      );
      await access(resolve(root, `apps/website/src/app${path}/page.tsx`));
      if (anchor && release.version === currentVersion)
        assert(docs.includes(`id="${anchor}"`), `Missing docs anchor: ${href}`);
    }
    if (release.version === currentVersion) {
      assert(
        tests.includes(`feature:${feature.id} `),
        `Add browser coverage for ${feature.id}`,
      );
    }
  }
}
await access(resolve(root, "examples/embedded-crud/README.md"));
console.log(
  `Release ${currentVersion}: changelog, guide links, demo routes and browser coverage declared.`,
);
