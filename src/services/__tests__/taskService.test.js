// Chainable Supabase query builder stub. Supabase's real builder is "thenable"
// (methods return `this`, and the final result is obtained via `await` rather
// than a terminal call), so the mock mirrors that instead of a fixed chain depth.
function createQueryBuilder({ data = null, error = null } = {}) {
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve({ data, error })),
    then: (resolve, reject) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  };
  return builder;
}

// 通知排程現為 fire-and-forget（不再被呼叫端 await），測試斷言前需明確讓出
// event loop 一次，等背景的 Promise chain 跑完，避免依賴巧合的微任務時序。
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockUser = { id: "user-1", email: "alan@example.com", user_metadata: {} };

jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock("../notificationService", () => ({
  scheduleTaskNotification: jest.fn(() => Promise.resolve([])),
  cancelTaskNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock("../userService", () => ({
  UserService: {
    getCachedAuthUser: jest.fn(() => null),
    setCachedAuthUser: jest.fn(),
    getUserSettings: jest.fn(() =>
      Promise.resolve({ reminder_settings: { enabled: true, times: [30] } })
    ),
    getUserDisplayName: jest.fn(
      (user) =>
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "User"
    ),
  },
}));

import { supabase } from "../supabaseClient";
import {
  scheduleTaskNotification,
  cancelTaskNotification,
} from "../notificationService";
import { UserService } from "../userService";
import { TaskService } from "../taskService";

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  UserService.getCachedAuthUser.mockReturnValue(null);
  UserService.getUserSettings.mockResolvedValue({
    reminder_settings: { enabled: true, times: [30] },
  });
});

describe("TaskService.getTasksByDateRange", () => {
  it("groups tasks by date and normalizes is_completed", async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({
        data: [
          { id: "t1", title: "A", date: "2026-07-10", is_completed: true },
          { id: "t2", title: "B", date: "2026-07-10", is_completed: false },
          { id: "t3", title: "C", date: "2026-07-11", is_completed: true },
        ],
        error: null,
      })
    );

    const result = await TaskService.getTasksByDateRange(
      "2026-07-10",
      "2026-07-11"
    );

    expect(Object.keys(result)).toEqual(["2026-07-10", "2026-07-11"]);
    expect(result["2026-07-10"]).toHaveLength(2);
    expect(result["2026-07-10"][0].is_completed).toBe(true);
    expect(result["2026-07-10"][1].is_completed).toBe(false);
  });

  it("returns {} when there is no authenticated user", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await TaskService.getTasksByDateRange(
      "2026-07-10",
      "2026-07-11"
    );

    expect(result).toEqual({});
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns null (not {}) when the query itself fails, so callers can tell a failed fetch apart from a genuinely empty range", async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: "Network request failed" },
      })
    );

    const result = await TaskService.getTasksByDateRange(
      "2026-07-10",
      "2026-07-11"
    );

    expect(result).toBeNull();
  });
});

describe("temp- id guard (optimistic tasks not yet synced to DB)", () => {
  it("updateTask short-circuits without calling supabase for a temp- id", async () => {
    const result = await TaskService.updateTask("temp-123", { title: "New" });

    expect(result).toEqual({ id: "temp-123", title: "New" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deleteTask short-circuits without calling supabase for a temp- id", async () => {
    const result = await TaskService.deleteTask("temp-123");

    expect(result).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("TaskService.updateTask — title guard (F4)", () => {
  it("does not send an empty title to the database, preventing title from being nulled out", async () => {
    const builder = createQueryBuilder({
      data: { id: "real-1", title: "Existing title", date: "2026-07-10" },
      error: null,
    });
    supabase.from.mockReturnValue(builder);

    await TaskService.updateTask("real-1", { title: "", note: "" });

    const updatePayload = builder.update.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty("title");
    expect(updatePayload.note).toBeNull();
  });

  it("still writes a non-empty title", async () => {
    const builder = createQueryBuilder({
      data: { id: "real-1", title: "New title", date: "2026-07-10" },
      error: null,
    });
    supabase.from.mockReturnValue(builder);

    await TaskService.updateTask("real-1", { title: "New title" });

    const updatePayload = builder.update.mock.calls[0][0];
    expect(updatePayload.title).toBe("New title");
  });
});

describe("TaskService notification translations threading (F2)", () => {
  it("addTask passes translations through to scheduleTaskNotification", async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({
        data: {
          id: "t1",
          title: "Buy milk",
          time: "09:00",
          date: "2026-07-10",
          is_completed: false,
        },
        error: null,
      })
    );
    const translations = { taskReminder: "工作提醒" };

    await TaskService.addTask(
      { title: "Buy milk", time: "09:00", date: "2026-07-10" },
      translations
    );
    await flushAsync();

    expect(scheduleTaskNotification).toHaveBeenCalledTimes(1);
    expect(scheduleTaskNotification.mock.calls[0][4]).toBe(translations);
  });

  it("updateTask passes translations through to scheduleTaskNotification when time changes", async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({
        data: {
          id: "t1",
          title: "Buy milk",
          time: "10:00",
          date: "2026-07-10",
          is_completed: false,
        },
        error: null,
      })
    );
    const translations = { taskReminder: "工作提醒" };

    await TaskService.updateTask("t1", { time: "10:00" }, translations);
    await flushAsync();

    expect(scheduleTaskNotification).toHaveBeenCalledTimes(1);
    expect(scheduleTaskNotification.mock.calls[0][4]).toBe(translations);
  });
});

describe("TaskService.toggleTaskChecked", () => {
  const completedTask = {
    id: "real-1",
    title: "Buy milk",
    time: "09:00",
    date: "2026-07-10",
    is_completed: true,
  };

  it("cancels the task's notification when marking it complete", async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: completedTask, error: null })
    );

    await TaskService.toggleTaskChecked("real-1", true);

    expect(cancelTaskNotification).toHaveBeenCalledWith(null, "real-1");
    expect(scheduleTaskNotification).not.toHaveBeenCalled();
  });

  it("reschedules the reminder when un-completing a task that still has a time", async () => {
    const uncompletedTask = { ...completedTask, is_completed: false };
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: uncompletedTask, error: null })
    );

    await TaskService.toggleTaskChecked("real-1", false);
    await flushAsync();

    expect(scheduleTaskNotification).toHaveBeenCalledTimes(1);
    expect(scheduleTaskNotification.mock.calls[0][0]).toMatchObject({
      id: "real-1",
      time: "09:00",
      date: "2026-07-10",
    });
  });

  it("does not reschedule when un-completing a task with no time set", async () => {
    const untimedTask = { ...completedTask, time: null, is_completed: false };
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: untimedTask, error: null })
    );

    await TaskService.toggleTaskChecked("real-1", false);

    expect(scheduleTaskNotification).not.toHaveBeenCalled();
  });

  it("does not reschedule when the user has disabled reminders", async () => {
    UserService.getUserSettings.mockResolvedValue({
      reminder_settings: { enabled: false },
    });
    const uncompletedTask = { ...completedTask, is_completed: false };
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: uncompletedTask, error: null })
    );

    await TaskService.toggleTaskChecked("real-1", false);

    expect(scheduleTaskNotification).not.toHaveBeenCalled();
  });
});
