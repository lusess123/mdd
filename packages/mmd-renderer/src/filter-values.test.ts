import assert from "node:assert/strict";
import { test } from "bun:test";
import type { RendererField } from "./types";
import * as ResourceFilterDomain from "./filter-values";

const decimalField: RendererField = {
  name: "amount",
  filter: { kind: "number", decimal: true },
  readOnly: true,
};
const dateField: RendererField = {
  name: "createdAt",
  filter: { kind: "datetime" },
  readOnly: true,
};

test("false 和 0 是有效筛选，清空一个范围端点不会清掉另一端", () => {
  const booleanField: RendererField = {
    name: "enabled",
    filter: { kind: "boolean" },
  };
  assert.equal(ResourceFilterDomain.isEmptyFilter(false), false);
  assert.equal(ResourceFilterDomain.isEmptyFilter(0), false);
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: booleanField,
      value: false,
    }),
    undefined,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: booleanField,
      value: "false",
      locale: "en-US",
    }) ?? "",
    /Select All, Yes or No/,
  );
  const lowerOnly = ResourceFilterDomain.updateRange({
    value: undefined,
    edge: "lower",
    next: 0,
  });
  assert.deepEqual(lowerOnly, [0, null]);
  const both = ResourceFilterDomain.updateRange({
    value: lowerOnly,
    edge: "upper",
    next: 0,
  });
  assert.deepEqual(both, [0, 0]);
  const upperOnly = ResourceFilterDomain.updateRange({
    value: both,
    edge: "lower",
    next: null,
  });
  assert.deepEqual(upperOnly, [null, 0]);
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: upperOnly,
    }),
    undefined,
  );
  assert.equal(
    ResourceFilterDomain.updateRange({
      value: upperOnly,
      edge: "upper",
      next: undefined,
    }),
    undefined,
  );
  assert.deepEqual(
    ResourceFilterDomain.updateRange({
      value: undefined,
      edge: "lower",
      next: "0.0000",
    }),
    ["0.0000", null],
  );
});

test("枚举多选保留 boolean、number 和 string 类型，不混淆 0 与字符串 0", () => {
  const options = [
    { label: "否", value: false },
    { label: "零", value: 0 },
    { label: "编码零", value: "0" },
    { label: "是", value: true },
  ];
  const keys = ResourceFilterDomain.enumKeys({
    options,
    value: [false, 0, "0"],
  });
  assert.deepEqual(keys, ["0", "1", "2"]);
  assert.deepEqual(ResourceFilterDomain.enumValues({ options, keys }), [
    false,
    0,
    "0",
  ]);
  assert.deepEqual(ResourceFilterDomain.enumKeys({ options, value: false }), [
    "0",
  ]);
  assert.equal(
    ResourceFilterDomain.enumValues({ options, keys: [] }),
    undefined,
  );
});

test("封闭枚举回显未收录的历史值，可单独移除且不改变其它值类型", () => {
  const originalOptions = [
    { label: "否", value: false },
    { label: "零", value: 0 },
    { label: "编码零", value: "0" },
  ];
  const value = [false, 0, "0", "legacy-state", 7];
  const options = ResourceFilterDomain.enumOptions({
    options: originalOptions,
    value,
  });
  assert.deepEqual(options.slice(3), [
    { label: "legacy-state", value: "legacy-state" },
    { label: "7", value: 7 },
  ]);
  const keys = ResourceFilterDomain.enumKeys({ options, value });
  assert.deepEqual(keys, ["0", "1", "2", "3", "4"]);
  assert.deepEqual(ResourceFilterDomain.enumValues({ options, keys }), value);
  assert.deepEqual(
    ResourceFilterDomain.enumValues({
      options,
      keys: keys.filter((key) => key !== "3"),
    }),
    [false, 0, "0", 7],
  );
  assert.equal(originalOptions.length, 3);
  assert.deepEqual(value, [false, 0, "0", "legacy-state", 7]);
  assert.deepEqual(ResourceFilterDomain.enumOptions({ value: "old-code" }), [
    { label: "old-code", value: "old-code" },
  ]);
});

test("开放候选允许自定义历史字符串，保留编码、空格和旧标量且语言不影响原值", () => {
  const original = Object.freeze([
    "panel",
    "legacy/channel",
    "001",
    "false",
    "  custom value  ",
  ]);
  const selected = ResourceFilterDomain.customEnumValues(original);
  assert.deepEqual(selected, original);
  assert.notEqual(selected, original);
  for (const label of ["样本库", "Panel"]) {
    const field: RendererField = {
      name: "channelType",
      filter: { kind: "enum", allowCustom: true },
      options: [{ label, value: "panel" }],
    };
    for (const locale of ["zh-CN", "en-US"] satisfies Array<
      NonNullable<
        Parameters<typeof ResourceFilterDomain.validateFilterValue>[0]["locale"]
      >
    >) {
      assert.equal(
        ResourceFilterDomain.validateFilterValue({
          field,
          value: selected,
          locale,
        }),
        undefined,
      );
      assert.equal(
        ResourceFilterDomain.validateFilterValue({
          field,
          value: "legacy partial text",
          locale,
        }),
        undefined,
      );
    }
    assert.match(
      ResourceFilterDomain.validateFilterValue({
        field,
        value: ["panel", false, 0],
        locale: "en-US",
      }) ?? "",
      /text values/,
    );
  }
  assert.deepEqual(
    ResourceFilterDomain.customEnumValues("legacy partial text"),
    ["legacy partial text"],
  );
  assert.deepEqual(ResourceFilterDomain.customEnumValues(undefined), []);
  assert.deepEqual(ResourceFilterDomain.customEnumValues([]), []);
  assert.deepEqual(selected, original);
});

test("Decimal 和 BigInt 范围按精确十进制比较，不经过浮点数", () => {
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [
        "9007199254740993.0000000000001",
        "9007199254740993.0000000000002",
      ],
    }),
    undefined,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [
        "9007199254740993.0000000000002",
        "9007199254740993.0000000000001",
      ],
      locale: "en-US",
    }) ?? "",
    /minimum cannot exceed/,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: ["9223372036854775807", "9223372036854775806"],
    }) ?? "",
    /最小值不能大于最大值/,
  );
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: ["-0.000", "0.0000"],
    }),
    undefined,
  );
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [-1e-6, -1e-7],
    }),
    undefined,
  );
  assert.equal(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [1e-7, 1e-6],
    }),
    undefined,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: ["0", "-0.0001"],
    }) ?? "",
    /最小值/,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [null, "12abc"],
      locale: "en-US",
    }) ?? "",
    /valid number/,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [Infinity, null],
    }) ?? "",
    /有效数值/,
  );
  assert.match(
    ResourceFilterDomain.validateFilterValue({
      field: decimalField,
      value: [1, 2, 3],
    }) ?? "",
    /有效的范围/,
  );
});

test("日期范围使用本地时区显示并提交 ISO，允许开口且拒绝倒置与无效日期", () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = "Asia/Shanghai";
  try {
    const start = ResourceFilterDomain.localDateTimeToIso("2026-09-09T09:30");
    assert.equal(start, "2026-09-09T01:30:00.000Z");
    assert.equal(
      ResourceFilterDomain.localDateTimeValue(start),
      "2026-09-09T09:30:00",
    );
    const end = ResourceFilterDomain.localDateTimeToIso(
      "2026-09-09T10:30:20.123",
    );
    assert.equal(end, "2026-09-09T02:30:20.123Z");
    assert.equal(
      ResourceFilterDomain.localDateTimeValue(end),
      "2026-09-09T10:30:20.123",
    );
    assert.deepEqual(
      ResourceFilterDomain.updateRange({
        value: undefined,
        edge: "upper",
        next: end,
      }),
      [null, end],
    );
    assert.equal(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: [null, end],
      }),
      undefined,
    );
    assert.equal(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: [start, null],
      }),
      undefined,
    );
    assert.equal(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: [start, end],
      }),
      undefined,
    );
    assert.match(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: [end, start],
        locale: "en-US",
      }) ?? "",
      /start cannot be after/,
    );
    assert.equal(ResourceFilterDomain.localDateTimeToIso(""), null);
    assert.equal(
      ResourceFilterDomain.localDateTimeToIso("2026-02-30T12:00"),
      "2026-02-30T12:00",
    );
    assert.match(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: ["2026-02-30T12:00:00.000Z", null],
      }) ?? "",
      /有效的本地日期/,
    );
    assert.match(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: ["2026-09-09T09:30", null],
        locale: "en-US",
      }) ?? "",
      /valid local date/,
    );
    process.env.TZ = "America/New_York";
    const nonexistentLocalTime = "2026-03-08T02:30";
    assert.equal(
      ResourceFilterDomain.localDateTimeToIso(nonexistentLocalTime),
      nonexistentLocalTime,
    );
    assert.match(
      ResourceFilterDomain.validateFilterValue({
        field: dateField,
        value: [nonexistentLocalTime, null],
        locale: "en-US",
      }) ?? "",
      /valid local date/,
    );
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

