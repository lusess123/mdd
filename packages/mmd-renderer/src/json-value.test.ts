import { describe, expect, it } from "bun:test";
import { formatJson, isJsonField, validateJson } from "./json-value";

describe("JSON fields", () => {
  it("formats nested JSON while preserving JSON primitives", () => {
    expect(formatJson('{"a":[1,{"b":false}]}')).toBe(
      '{\n  "a": [\n    1,\n    {\n      "b": false\n    }\n  ]\n}',
    );
    for (const text of ["null", "false", "0", '"你好"', "[]"])
      expect(formatJson(text)).toBe(text);
    expect(formatJson({ enabled: true })).toBe('{\n  "enabled": true\n}');
  });
  it("rejects malformed input instead of silently replacing it", () => {
    for (const text of ['{"a":}', "{a:1}", '{"a":1,}', "undefined", "NaN"]) {
      expect(validateJson(text)).toBe(false);
      expect(() => formatJson(text)).toThrow();
    }
    expect(validateJson("")).toBe(true);
    expect(validateJson(undefined)).toBe(true);
  });
  it("recognizes JSON from model and view metadata", () => {
    for (const key of ["type", "renderer", "renderType", "fieldType"])
      expect(isJsonField({ name: "config", [key]: "JSON" })).toBe(true);
    expect(isJsonField({ name: "config", type: "text" })).toBe(false);
  });
});
