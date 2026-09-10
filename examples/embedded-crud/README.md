# Embedded CRUD — MMD 0.2.0

[Run the example](https://mmd.zyking.xyz/playground/embedded/) · [Integration guide](https://mmd.zyking.xyz/docs/#embedded) · [Changelog](../../CHANGELOG.md)

The live website imports these working example modules (one maintained implementation):

- [Model definitions](../../apps/website/src/demos/embedded/embedded.model.ts): all seven filters, typed enums, readonly keys, exact decimals and JSON.
- [Memory adapter](../../apps/website/src/demos/embedded/embedded.adapter.ts): isolated multi-model CRUD, filtering and precise decimal comparisons.
- [Engine/client transport](../../apps/website/src/demos/embedded/embedded.client.ts): runs the actual Engine and uses the standard HTTP client serializer without a network request.
- [React entry](../../apps/website/src/demos/embedded/embedded-demo.tsx): calls MmdResourcePage, ReferenceProvider and the mutation lifecycle hook.

This is a browser-local demonstration, not a production database adapter. Reload resets all edits; it does not share data or write to the deployed Product database. For Hono/database integration, use [basic](../basic/README.md) and the original Product Playground.

## Try it

1. Filter Items with ID, name, category, typed status, boolean, exact amount or date range. Clear with Reset.
2. Go to page two: the first row number is 11. The first item's large decimal must remain exact.
3. Open Studio from an Item's Category cell. Its detail dialog contains only related Items.
4. Create an Item in that related list: categoryId is prefilled; saving refreshes the list and mutation count.
5. Edit an Item: its ID is readonly. Try malformed JSON, then valid JSON. Close a dirty dialog, cancel, then explicitly discard.
6. Delete only a record you created. The URL stays `/playground/embedded/` through CRUD and relations.
7. Switch the site language to check Chinese and English controls and documentation.

Install all three packages at the same version:

```sh
pnpm add mmd-contracts@0.2.0 mmd-engine@0.2.0 mmd-renderer@0.2.0
```

## Local validation

```sh
bun install
bun run build:packages
bun --cwd=apps/website run dev
# open http://localhost:3000/playground/embedded/
bun run test
bun run typecheck
bun run build
bun run test:browser
```
