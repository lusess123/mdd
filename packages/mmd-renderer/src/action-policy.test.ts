import { describe, expect, it } from "bun:test";

import { isActionDisabled, isActionVisible } from "./action-policy";

describe("action policy", () => {
  it("evaluates structured visibility and disabled conditions", () => {
    const record = { status: "draft", locked: true };

    expect(
      isActionVisible(
        {
          label: "Publish",
          visible: { field: "status", operator: "eq", value: "draft" },
        },
        record,
      ),
    ).toBe(true);
    expect(
      isActionDisabled(
        {
          label: "Edit",
          disabled: { field: "locked", operator: "truthy" },
        },
        record,
      ),
    ).toBe(true);
  });

  it("supports the legacy equality expression without evaluating JavaScript", () => {
    const action = {
      label: "Review",
      showExpression: '<%= status === "UnderReview" ? true : "" %>',
    };

    expect(isActionVisible(action, { status: "UnderReview" })).toBe(true);
    expect(isActionVisible(action, { status: "Done" })).toBe(false);
    expect(
      isActionVisible(
        { label: "Unsafe", showExpression: "<%= process.exit() %>" },
        {},
      ),
    ).toBe(false);
  });
});
