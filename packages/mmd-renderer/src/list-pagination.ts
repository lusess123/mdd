import type { TablePaginationConfig } from "antd";
import type { MmdListResult } from "./types";

/** 行与分页必须来自同一次成功响应，避免 Table 用待请求页长再次切割旧行。 */
export function listTableSnapshot(result: MmdListResult) {
  return {
    dataSource: result.rows,
    pagination: {
      current: result.page,
      pageSize: result.pageSize,
      total: result.total,
      responsive: true,
      showSizeChanger: true,
    },
  };
}

/** 修改每页条数从第一页请求；普通翻页沿用当前展示的每页条数。 */
export function nextListPage(
  pagination: TablePaginationConfig,
  displayedPageSize: number,
) {
  const pageSize = pagination.pageSize ?? displayedPageSize;
  return {
    page: pageSize === displayedPageSize ? (pagination.current ?? 1) : 1,
    pageSize,
  };
}
