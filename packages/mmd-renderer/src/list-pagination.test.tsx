import { expect, test } from "bun:test";
import { Table } from "antd";
import { renderToStaticMarkup } from "react-dom/server";
import { createHttpMmdClient } from "./client";
import { listTableSnapshot, nextListPage } from "./list-pagination";
import { createRowNumberColumn } from "./row-number";
import type { MmdListResult } from "./types";

const thirdPage = {
  rows: Array.from({ length: 50 }, (_, index) => ({
    id: `row-${101 + index}`,
  })),
  total: 500,
  page: 3,
  pageSize: 50,
} satisfies MmdListResult;

function renderResult(result: MmdListResult, loading = false) {
  return renderToStaticMarkup(
    <Table
      {...listTableSnapshot(result)}
      rowKey="id"
      loading={loading}
      columns={[
        createRowNumberColumn({
          page: result.page,
          pageSize: result.pageSize,
          title: "No.",
        }),
        { key: "id", dataIndex: "id", title: "ID" },
      ]}
    />,
  );
}

function expectCompleteThirdPage(markup: string) {
  const rows = [
    ...markup.matchAll(/<tr[^>]*data-row-key="(row-\d+)"[^>]*>(.*?)<\/tr>/gs),
  ];
  expect(rows).toHaveLength(50);
  expect(rows.map((row) => row[1])).toEqual(
    thirdPage.rows.map((row) => row.id),
  );
  expect(rows[0]?.[2]).toContain(">101</td>");
  expect(rows[49]?.[2]).toContain(">150</td>");
}

test("displayed rows and Table pagination share the successful response when a smaller page is requested", () => {
  const request = nextListPage(
    { current: 3, pageSize: 20 },
    thirdPage.pageSize,
  );
  expect(request).toEqual({ page: 1, pageSize: 20 });
  const snapshot = listTableSnapshot(thirdPage);
  expect(snapshot.dataSource).toBe(thirdPage.rows);
  expect(snapshot.pagination).toMatchObject({
    current: 3,
    pageSize: 50,
    total: 500,
  });
  // AntD 会按 pagination 再次切割 dataSource；待请求的 size 20 不能进入这次渲染。
  expectCompleteThirdPage(renderResult(thirdPage, true));
});

test("a failed resize keeps the old rows, numbering and displayed pagination; a success replaces them together", async () => {
  const request = nextListPage(
    { current: 3, pageSize: 20 },
    thirdPage.pageSize,
  );
  const client = createHttpMmdClient(async () => {
    throw new Error("Page request failed");
  });
  const pending = client.list({ model: "Records", ...request });
  expectCompleteThirdPage(renderResult(thirdPage, true));
  await expect(pending).rejects.toThrow("Page request failed");
  expectCompleteThirdPage(renderResult(thirdPage));
  expect(listTableSnapshot(thirdPage).pagination).toMatchObject({
    current: 3,
    pageSize: 50,
  });

  const resized: MmdListResult = {
    rows: Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index + 1}`,
    })),
    total: 500,
    ...request,
  };
  const nextMarkup = renderResult(resized);
  expect([...nextMarkup.matchAll(/data-row-key="row-\d+"/g)]).toHaveLength(20);
  expect(nextMarkup).toContain(">1</td>");
  expect(nextMarkup).toContain(">20</td>");
  expect(nextMarkup).not.toContain('data-row-key="row-101"');
  expect(listTableSnapshot(resized).pagination).toMatchObject({
    current: 1,
    pageSize: 20,
  });
});

test("ordinary paging preserves the displayed page size and repeating a failed request creates a new request", () => {
  expect(nextListPage({ current: 4 }, 50)).toEqual({ page: 4, pageSize: 50 });
  expect(nextListPage({ current: 4, pageSize: 50 }, 50)).toEqual({
    page: 4,
    pageSize: 50,
  });
  const first = nextListPage({ current: 3, pageSize: 20 }, 50);
  const retry = nextListPage({ current: 3, pageSize: 20 }, 50);
  expect(retry).toEqual(first);
  expect(retry).not.toBe(first);
});
