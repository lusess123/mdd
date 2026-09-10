import { expect, test } from "bun:test";
import { createDemoAdapter } from "./embedded.adapter";
import { createDemoClient } from "./embedded.client";

test("embedded demo uses Engine filtering and exact values across isolated instances", async () => {
  const { client } = createDemoClient(createDemoAdapter(), "en-US");
  const filtered = await client.list({
    model: "Item",
    search: { status: [false], active: false },
  });
  expect(filtered.rows.length).toBeGreaterThan(0);
  expect(
    filtered.rows.every((row) => row.status === false && row.active === false),
  ).toBe(true);
  const exact = await client.list({
    model: "Item",
    search: { amount: ["9007199254740993.01", null] },
  });
  expect(exact.total).toBe(1);
  expect(exact.rows[0]?.amount).toBe("9007199254740993.0100");
  const related = await client.list({
    model: "Item",
    where: { categoryId: "category-2" },
  });
  expect(related.total).toBe(2);
  const created = await client.save({
    model: "Item",
    row: {
      name: "New demo item",
      categoryId: "category-2",
      amount: "12.34",
      active: false,
      status: 0,
    },
  });
  expect(
    (await client.get({ model: "Item", id: String(created.id) }))?.categoryId,
  ).toBe("category-2");
  expect(
    (await client.list({ model: "Item", where: { categoryId: "category-2" } }))
      .total,
  ).toBe(3);
  const other = createDemoClient(createDemoAdapter(), "en-US").client;
  expect(await other.get({ model: "Item", id: String(created.id) })).toBeNull();
  expect(
    await client.remove({ model: "Item", ids: [String(created.id)] }),
  ).toEqual({ affected: 1 });
});
