import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultFieldRegistry } from "./default-fields";
import { MmdField } from "./field-renderer";
import { createMessageCatalog, translate } from "./i18n";
import { MmdProvider } from "./provider";
import { ReadonlyIdentifier } from "./readonly-identifier";

test("Key renders a complete copyable identifier without an editable form input", () => {
  const value = "01990c3d-7d27-7000-8000-123456789abc";
  const registry = createDefaultFieldRegistry();
  for (const scene of ["list", "detail", "form"] as const) {
    expect(registry.resolve("key", scene)).toBe(ReadonlyIdentifier);
    const markup = renderToStaticMarkup(
      <MmdProvider locale="en-US">
        <MmdField
          field={{ name: "id", fieldType: "Key" }}
          scene={scene}
          value={value}
        />
      </MmdProvider>,
    );
    expect(markup).toContain(value);
    expect(markup).toContain("ant-typography-copy");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("contenteditable");
  }
  expect(registry.resolve("key", "search")).not.toBe(ReadonlyIdentifier);
});

test("identifier empty values have no copy action, while numeric zero and copy text are preserved", () => {
  for (const value of [undefined, null, ""]) {
    const markup = renderToStaticMarkup(
      <MmdProvider>
        <ReadonlyIdentifier value={value} />
      </MmdProvider>,
    );
    expect(markup).toContain("—");
    expect(markup).not.toContain("ant-typography-copy");
  }
  const zero = renderToStaticMarkup(
    <MmdProvider>
      <ReadonlyIdentifier value={0} />
    </MmdProvider>,
  );
  expect(zero).toContain(">0<");
  expect(zero).toContain("ant-typography-copy");
  const catalog = createMessageCatalog();
  expect(translate(catalog, "zh-CN", "common.copy")).toBe("复制");
  expect(translate(catalog, "en-US", "common.copy")).toBe("Copy");
  expect(translate(catalog, "zh-CN", "common.copied")).toBe("已复制");
  expect(translate(catalog, "en-US", "common.copied")).toBe("Copied");
});
