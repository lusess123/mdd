import { Typography } from "antd";
import type { FieldScene } from "./types";
import { useMmd } from "./provider";

/** 完整展示并复制主键；无输入事件，也不把空值伪装成可复制的标识。 */
export function ReadonlyIdentifier({ value, scene }: { value: unknown; scene?: FieldScene }) {
  const { t } = useMmd();
  const text =
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
      ? String(value)
      : "";
  return (
    <Typography.Text
      className="mmd-readonly-identifier"
      style={{
        whiteSpace: scene === "list" ? "nowrap" : "normal",
        overflowWrap: scene === "list" ? "normal" : "anywhere",
        wordBreak: scene === "list" ? "normal" : "break-all",
      }}
      copyable={
        text
          ? { text, tooltips: [t("common.copy"), t("common.copied")] }
          : false
      }
      onClick={(event) => event.stopPropagation()}
    >
      {text || "—"}
    </Typography.Text>
  );
}
