"use client";

import { InputNumber, Progress } from "antd";
import {
  MmdProvider,
  MmdRenderer,
  type FieldRendererProps,
} from "mmd-renderer";

function InventoryMeter({
  value,
  scene,
  disabled,
  onChange,
}: FieldRendererProps<number>) {
  const count = Number(value ?? 0);

  if (scene === "form" || scene === "search") {
    return (
      <InputNumber
        min={0}
        precision={0}
        value={count}
        disabled={disabled}
        style={{ width: "100%" }}
        onChange={(next) => onChange?.(next ?? 0)}
      />
    );
  }

  return (
    <div title={`${count}`}>
      <Progress
        percent={Math.min(100, Math.round((count / 50) * 100))}
        showInfo={false}
        status={count === 0 ? "exception" : "normal"}
      />
      <strong>{count}</strong>
    </div>
  );
}

export function ProductWithInventoryField() {
  return (
    <MmdProvider
      environment={{ apiBaseUrl: "http://localhost:8787/api" }}
      api={{ credentials: "include" }}
      fields={{
        "inventory-meter": {
          list: InventoryMeter,
          detail: InventoryMeter,
          form: InventoryMeter,
          search: InventoryMeter,
        },
      }}
    >
      <MmdRenderer model="Product" view="listview" />
    </MmdProvider>
  );
}
