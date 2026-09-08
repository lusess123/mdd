import { Typography } from "antd";
import { useMmd } from "./provider";

/** 完整展示并复制主键；无输入事件，也不把空值伪装成可复制的标识。 */
export function ReadonlyIdentifier({ value }: { value: unknown }) {
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
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-all",
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
