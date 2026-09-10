import { expect, test } from "bun:test";
import { isReadOnlyField, writableFormValues } from "./form-values";

test("explicit form identifiers and read-only values never enter write payloads", () => {
  const fields = [
    { name: "uuid", fieldType: "Text", readOnly: false },
    { name: "legacyKey", fieldType: "Key", readOnly: false },
    { name: "updatedAt", readOnly: true },
    { name: "systemValue", pageStyle: ["ReadOnly"] },
    { name: "enabled" },
    { name: "amount" },
    { name: "optional" },
    { name: "config" },
    { name: "missing" },
  ];
  const values = {
    uuid: "primary-1",
    legacyKey: "legacy-1",
    updatedAt: "2026-09-01",
    systemValue: "locked",
    enabled: false,
    amount: 0,
    optional: null,
    config: { list: ["中文", 1] },
    unknown: "not a field",
  };
  const before = structuredClone(values);
  expect(fields.map((field) => isReadOnlyField(field, "uuid"))).toEqual([
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
  ]);
  expect(writableFormValues({ fields, values, keyField: "uuid" })).toEqual({
    enabled: false,
    amount: 0,
    optional: null,
    config: { list: ["中文", 1] },
  });
  expect(values).toEqual(before);
});
