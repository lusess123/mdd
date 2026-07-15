import type {
  ActionCondition,
  MmdRecord,
  RendererAction,
} from "./types";

function readPath(record: MmdRecord | undefined, path: string): unknown {
  let value: unknown = record;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as MmdRecord)[segment];
  }
  return value;
}

export function evaluateCondition(
  condition: ActionCondition,
  record?: MmdRecord,
): boolean {
  const actual = readPath(record, condition.field);
  switch (condition.operator ?? "eq") {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "notIn":
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    case "truthy":
      return Boolean(actual);
    case "falsy":
      return !actual;
  }
}

function parseLiteral(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value.slice(1, -1);
}

export function evaluateLegacyExpression(
  expression: string,
  record?: MmdRecord,
): boolean {
  const source = expression
    .trim()
    .replace(/^<%=\s*/, "")
    .replace(/\s*%>$/, "")
    .replace(/\?\s*true\s*:\s*(?:""|'')\s*$/, "")
    .trim();
  const match = source.match(
    /^(?:row\.)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(===|!==|==|!=)\s*((?:"[^"\\]*"|'[^'\\]*')|true|false|null|-?\d+(?:\.\d+)?)$/,
  );
  if (!match) return false;

  const [, field, operator, rawExpected] = match;
  const actual = readPath(record, field);
  const expected = parseLiteral(rawExpected);
  return operator === "===" || operator === "=="
    ? actual === expected
    : actual !== expected;
}

function evaluatePolicy(
  policy: boolean | ActionCondition | undefined,
  record: MmdRecord | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof policy === "boolean") return policy;
  if (policy) return evaluateCondition(policy, record);
  return defaultValue;
}

export function isActionVisible(
  action: RendererAction,
  record?: MmdRecord,
): boolean {
  if (action.visible !== undefined) {
    return evaluatePolicy(action.visible, record, true);
  }
  if (action.showExpression) {
    return evaluateLegacyExpression(action.showExpression, record);
  }
  return true;
}

export function isActionDisabled(
  action: RendererAction,
  record?: MmdRecord,
): boolean {
  return evaluatePolicy(action.disabled, record, false);
}
