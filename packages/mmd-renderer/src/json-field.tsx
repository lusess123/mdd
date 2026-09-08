import { useState } from "react";
import { Alert, Button, Input, Space } from "antd";
import { useMmd } from "./provider";
import { formatJson, jsonText, validateJson } from "./json-value";
import type { FieldRendererProps } from "./types";

export function JsonField({
  value,
  scene,
  onChange,
  disabled,
  field,
}: FieldRendererProps) {
  const { t } = useMmd();
  const [formatError, setFormatError] = useState(false);
  const text = jsonText(value);
  if (scene !== "form" && scene !== "search") {
    return (
      <pre
        style={{
          margin: 0,
          maxWidth: 560,
          maxHeight: 320,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {validateJson(value) ? formatJson(value) || "—" : text}
      </pre>
    );
  }
  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Input.TextArea
        aria-label={field.label ?? field.name}
        value={text}
        disabled={disabled}
        rows={6}
        style={{ fontFamily: "monospace" }}
        onChange={(event) => {
          setFormatError(false);
          onChange?.(event.target.value);
        }}
      />
      <Button
        disabled={disabled}
        onClick={() => {
          try {
            onChange?.(formatJson(value));
            setFormatError(false);
          } catch {
            setFormatError(true);
          }
        }}
      >
        {t("json.format")}
      </Button>
      {formatError && <Alert type="error" title={t("validation.json")} />}
    </Space>
  );
}
