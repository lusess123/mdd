import { expect, test } from "bun:test";
import {
  DefaultSearFormFields,
  DefaultSearchFormFields,
  ModelFieldType,
  RenderType,
  normalizeModelFieldType
} from "mmd-contracts";

test("旧版拼写继续映射到规范字段与渲染类型", () => {
  expect(ModelFieldType.toManay).toBe(ModelFieldType.ToMany);
  expect(ModelFieldType.linkManay).toBe(ModelFieldType.LinkMany);
  expect(normalizeModelFieldType("toManay")).toBe(ModelFieldType.ToMany);
  expect(RenderType.DataTime).toBe(RenderType.DateTime);
  expect(DefaultSearFormFields).toBe(DefaultSearchFormFields);
});
