import { expect, test } from "bun:test";
import { localDateTime, dateTimeInstant } from "./datetime-value";

test("datetime-local preserves the instant through the user's local timezone", () => {
  const instant = "2026-09-08T10:15:00.000Z";
  expect(dateTimeInstant(localDateTime(instant))).toBe(instant);
  expect(dateTimeInstant("")).toBe(null);
  expect(localDateTime(null)).toBe("");
  expect(localDateTime("invalid")).toBe("");
});
