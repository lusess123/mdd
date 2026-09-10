import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MmdProvider } from "./provider";
import { MmdResourcePage } from "./resource-page";

const resource = {
  name: "children",
  label: "Children",
  description: "Example records",
  references: [{ field: "parentId", target: "parents", label: "Parent" }],
  children: [],
  capabilities: { create: false, update: false, remove: false },
};

test("resource page localizes capabilities and relation constraints without a host header", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    const html = renderToStaticMarkup(
      <MmdProvider locale={locale}>
        <MmdResourcePage
          resource={resource}
          view="children.listview"
          where={{ parentId: "p", active: false }}
          onOpenView={() => {}}
          onClose={() => {}}
        />
      </MmdProvider>,
    );
    expect(html).toContain("Children</h1>");
    expect(html).toContain(locale === "en-US" ? "Read only" : "只读查询");
    expect(html).toContain(
      locale === "en-US" ? "Filtered by related record" : "已按关联条件筛选",
    );
    expect(html).toContain(
      locale === "en-US" ? "Parent, active" : "Parent、active",
    );
    expect(html).toContain(
      locale === "en-US" ? "Clear relation filter" : "清除关联筛选",
    );
  }
});

test("resource page omits unknown capabilities and relation notice outside lists", () => {
  const { capabilities, ...unknownCapabilities } = resource;
  const html = renderToStaticMarkup(
    <MmdProvider locale="en-US">
      <MmdResourcePage
        resource={unknownCapabilities}
        view="children.detailview"
        id="1"
        where={{ parentId: "p" }}
      />
    </MmdProvider>,
  );
  expect(html).toContain("<small>Details</small>");
  expect(html).not.toContain("Read only");
  expect(html).not.toContain("Filtered by related record");
  expect(html).not.toContain("Back to source");
});
