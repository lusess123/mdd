import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mmd-locale", "en-US"));
});

test("release navigation: changelog and every new guide/example are reachable", async ({
  page,
}) => {
  await page.goto("/changelog/");
  await expect(
    page.getByRole("heading", {
      name: "Complete embedded CRUD, filters and relations",
    }),
  ).toBeVisible();
  await page
    .locator("#v0\\.2\\.0")
    .getByRole("link", { name: "Try demo" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Embedded CRUD and relations",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Integration guide/ }).click();
  await expect(page.locator("#embedded")).toBeVisible();
  for (const id of ["filters", "relations", "lifecycle"])
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.locator("#embedded")).toContainText("内嵌 CRUD 接入");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("feature:filters feature:identifiers typed filters, exact decimals and row numbers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto("/playground/embedded/");
  await expect(
    page.getByText("9007199254740993.0100", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("2", { exact: true }).click();
  await expect(
    page.getByRole("row").nth(1).getByRole("cell").first(),
  ).toHaveText("11");
  await page.getByRole("button", { name: /More filters/ }).click();
  await page.getByRole("combobox", { name: "Active", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("No", { exact: true })
    .click();
  await page.getByRole("combobox", { name: "Status", exact: true }).click();
  await page.getByText("Boolean false", { exact: true }).last().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "item-6" }),
  ).toBeVisible();
  await expect(page.getByText("item-1", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/playground\/embedded\/$/);
  expect(errors).toEqual([]);
});

test("feature:relations feature:embedded feature:lifecycle related create, edit, guard and delete", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto("/playground/embedded/");
  await page
    .getByRole("button", { name: "Studio", exact: true })
    .first()
    .click();
  const detail = page.getByRole("dialog", { name: "detailview", exact: true });
  await expect(
    detail.getByRole("tab", { name: "Items", exact: true }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "New", exact: true }).click();
  const create = page.getByRole("dialog", { name: "newview", exact: true });
  await expect(create.getByText("Studio", { exact: true })).toBeVisible();
  await create
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Release demo record");
  await create
    .getByRole("textbox", { name: "JSON", exact: true })
    .fill("{broken");
  await create.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    create.getByText("Invalid JSON. Check quotes, commas and brackets.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("mutation-count")).toContainText("0");
  await expect(
    create.getByRole("button", { name: "Submit", exact: true }),
  ).toHaveAttribute("aria-busy", "false");
  await create
    .getByRole("textbox", { name: "JSON", exact: true })
    .fill('{"enabled":false}');
  await create
    .getByRole("button", { name: "Format JSON", exact: true })
    .click();
  await expect(
    create.getByRole("textbox", { name: "JSON", exact: true }),
  ).toHaveValue('{\n  "enabled": false\n}');
  await create.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(create).toHaveCount(0);
  await expect(page.getByTestId("mutation-count")).toContainText("1");
  await expect(
    detail.getByRole("row").filter({ hasText: "Release demo record" }),
  ).toBeVisible();
  const recordId = (
    await detail
      .getByRole("row")
      .filter({ hasText: "Release demo record" })
      .getByRole("cell")
      .nth(1)
      .innerText()
  ).trim();
  await detail
    .getByRole("row")
    .filter({ hasText: "Release demo record" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "editview", exact: true });
  await expect(
    edit.getByRole("textbox", { name: "id", exact: true }),
  ).toHaveCount(0);
  await expect(edit.getByText(recordId, { exact: true })).toBeVisible();
  await edit
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Updated demo record");
  await edit.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(edit).toHaveCount(0);
  await expect(page.getByTestId("mutation-count")).toContainText("2");
  await detail
    .getByRole("row")
    .filter({ hasText: "Updated demo record" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await edit
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Unsaved draft");
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(
    edit.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Unsaved draft");
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(edit).toHaveCount(0);
  await detail
    .getByRole("row")
    .filter({ hasText: "Updated demo record" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByTestId("mutation-count")).toContainText("3");
  await expect(
    detail.getByText("Updated demo record", { exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/playground\/embedded\/$/);
  expect(errors).toEqual([]);
});

test("feature:filters feature:relations reference pages, exact ID, text and open ranges", async ({
  page,
}) => {
  await page.goto("/playground/embedded/");
  const category = page.getByRole("combobox", {
    name: "Category",
    exact: true,
  });
  await category.click();
  const popup = page.locator(".ant-select-dropdown:visible");
  await expect(popup.getByText("24 records", { exact: true })).toBeVisible();
  await popup.getByTitle("Next Page", { exact: true }).click();
  await expect(popup.getByRole("textbox")).toHaveValue("2");
  await category.fill("Outdoor");
  await popup.getByText("Outdoor", { exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.getByRole("textbox", { name: "id", exact: true }).fill("item-23");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Sample 24");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("item-23", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: /More filters/ }).click();
  await page
    .getByRole("spinbutton", {
      name: "Amount · Minimum (inclusive)",
      exact: true,
    })
    .fill("9007199254740993.01");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByText("item-1", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Created · To (inclusive)", exact: true })
    .fill("2026-08-31T23:59");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("item-1", { exact: true })).toHaveCount(0);
});

test("release links: historical features retain working documentation and demos", async ({
  page,
}) => {
  await page.goto("/changelog/");
  const links = await page
    .locator("main section a")
    .evaluateAll((elements) => [
      ...new Set(elements.map((element) => element.getAttribute("href")!)),
    ]);
  expect(links.length).toBeGreaterThan(5);
  for (const href of links) {
    const response = await page.goto(href);
    if (response) expect(response.ok()).toBe(true);
    const anchor = new URL(page.url()).hash.slice(1);
    if (anchor) await expect(page.locator(`[id="${anchor}"]`)).toBeVisible();
    else await expect(page.getByRole("heading").first()).toBeVisible();
  }
});
