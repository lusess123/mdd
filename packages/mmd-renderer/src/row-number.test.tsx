import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMessageCatalog, translate } from "./i18n";
import { ListContainer } from "./list-container";
import { MmdProvider } from "./provider";
import { createRowNumberColumn } from "./row-number";

test("row number columns use a response's page snapshot, carry no query field and do not mutate records", () => {
  const row = { id: "stable-id", rowNumber: "business value" };
  const first = createRowNumberColumn({ page: 1, pageSize: 20, title: "No." });
  const second = createRowNumberColumn({ page: 2, pageSize: 20, title: "No." });
  const resized = createRowNumberColumn({
    page: 3,
    pageSize: 50,
    title: "序号",
  });
  expect(first.render(undefined, row, 0)).toBe(1);
  expect(first.render(undefined, row, 19)).toBe(20);
  expect(second.render(undefined, row, 0)).toBe(21);
  expect(resized.render(undefined, row, 0)).toBe(101);
  expect(resized.render(undefined, row, 49)).toBe(150);
  // 新请求尚未完成或失败时，旧行继续使用上一成功快照生成的列。
  expect(first.render(undefined, row, 0)).toBe(1);
  expect(first).not.toHaveProperty("dataIndex");
  expect(row).toEqual({ id: "stable-id", rowNumber: "business value" });
});

test("row numbers are opt-in and precede visible Key and business columns in both locales", () => {
  const model = {
    name: "Records",
    fields: [
      { name: "id", label: "Record ID", fieldType: "Key", list: true },
      { name: "name", label: "Display name", fieldType: "Text" },
      { name: "hiddenKey", label: "Hidden key", fieldType: "Key" },
      {
        name: "detailKey",
        label: "Detail key",
        fieldType: "Key",
        list: true,
        pageStyle: ["Detail"],
      },
    ],
  };
  const catalog = createMessageCatalog();
  for (const locale of ["zh-CN", "en-US"] as const) {
    const title = translate(catalog, locale, "common.rowNumber");
    const markup = renderToStaticMarkup(
      <MmdProvider locale={locale}>
        <ListContainer
          model={model}
          container={{
            name: "Records",
            type: "list",
            fields: [],
            showRowNumber: true,
          }}
        />
      </MmdProvider>,
    );
    expect(markup.indexOf(title)).toBeGreaterThan(-1);
    expect(markup.indexOf(title)).toBeLessThan(markup.indexOf("Record ID"));
    expect(markup.indexOf("Record ID")).toBeLessThan(
      markup.indexOf("Display name"),
    );
    expect(markup).not.toContain("Hidden key");
    expect(markup).not.toContain("Detail key");
  }
  const normal = renderToStaticMarkup(
    <MmdProvider locale="en-US">
      <ListContainer
        model={model}
        container={{ name: "Records", type: "list", fields: [] }}
      />
    </MmdProvider>,
  );
  expect(normal).not.toContain("No.");
});
