import type { ColumnType } from "antd/es/table";
import type { MmdRecord } from "./types";

/** 纯展示列；page/pageSize 必须来自当前已显示行对应的成功分页结果。 */
export function createRowNumberColumn({
  page,
  pageSize,
  title,
}: {
  page: number;
  pageSize: number;
  title: string;
}) {
  return {
    key: "__mmd_row_number",
    title,
    width: 72,
    align: "right",
    render: (_value: unknown, _record: MmdRecord, index: number) =>
      (page - 1) * pageSize + index + 1,
  } satisfies ColumnType<MmdRecord>;
}
