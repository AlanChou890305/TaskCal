import {
  TASK_FIELDS,
  validateTaskFields,
  createTaskObject,
  validateTaskCompleteness,
} from "../taskTypes";

describe("validateTaskFields", () => {
  it("keeps only fields declared in TASK_FIELDS", () => {
    const result = validateTaskFields({
      title: "Buy milk",
      priority: "high", // not a valid DB field anymore
    });

    expect(result).toEqual({ title: "Buy milk" });
  });
});

describe("createTaskObject", () => {
  it("converts empty-string time/link/note to null", () => {
    const result = createTaskObject({
      user_id: "u1",
      user_display_name: "Alan",
      title: "Buy milk",
      time: "",
      link: "   ",
      note: "",
      date: "2026-07-10",
    });

    expect(result[TASK_FIELDS.TIME]).toBeNull();
    expect(result[TASK_FIELDS.LINK]).toBeNull();
    expect(result[TASK_FIELDS.NOTE]).toBeNull();
  });

  it("supports the legacy `checked` field as a fallback for is_completed", () => {
    const result = createTaskObject({
      user_id: "u1",
      title: "Buy milk",
      date: "2026-07-10",
      checked: true,
    });

    expect(result[TASK_FIELDS.IS_COMPLETED]).toBe(true);
  });
});

describe("validateTaskCompleteness", () => {
  it("rejects a task missing a required field", () => {
    expect(
      validateTaskCompleteness({ user_id: "u1", date: "2026-07-10" }) // missing title
    ).toBe(false);
  });

  it("accepts a task with all required fields present", () => {
    expect(
      validateTaskCompleteness({
        user_id: "u1",
        title: "Buy milk",
        date: "2026-07-10",
      })
    ).toBe(true);
  });
});
