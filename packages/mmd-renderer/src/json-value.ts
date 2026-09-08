import type { RendererField } from "./types";

/** JSON fields retain text while editing so incomplete input is never discarded. */
export function jsonText(value: unknown): string {
  return typeof value === "string"
    ? value
    : value === undefined
      ? ""
      : JSON.stringify(value, null, 2);
}

export function formatJson(value: unknown): string {
  const text = jsonText(value);
  if (!text.trim()) return "";
  return JSON.stringify(JSON.parse(text), null, 2);
}

export function isJsonField(field: RendererField): boolean {
  return [field.renderer, field.type, field.renderType, field.fieldType].some(
    (value) => value?.toLowerCase() === "json",
  );
}

/** Empty values are handled by the form's required rule; false, zero and null are valid JSON. */
export function validateJson(value: unknown): boolean {
  try {
    formatJson(value);
    return true;
  } catch {
    return false;
  }
}
