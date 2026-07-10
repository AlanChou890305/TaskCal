const mockReloadWidgetWithData = jest.fn();
const mockReloadAllWidgets = jest.fn();

// The factory can't reference outer `const` bindings (jest.mock() calls are
// hoisted above them), so it creates its own jest.fn() and the test imports
// the mocked module directly to get a handle to that same instance.
jest.mock("react-native-shared-group-preferences", () => ({
  setItem: jest.fn(() => Promise.resolve()),
}));

// jest-expo's react-native mock already defaults Platform.OS to "ios" and
// exposes a mutable NativeModules object, so we only need to stub the one
// native module this service actually calls.
import { NativeModules } from "react-native";
import SharedGroupPreferences from "react-native-shared-group-preferences";
import { widgetService } from "../widgetService";

const mockSharedGroupSetItem = SharedGroupPreferences.setItem;

beforeEach(() => {
  jest.clearAllMocks();
  // The service is a singleton; reset the debounce/cache state it accumulates
  // across tests so each test starts from a clean slate.
  widgetService.lastSyncTime = 0;
  widgetService.pendingSyncData = null;
  widgetService._cachedDateKeys = null;
  widgetService._cachedDateKeysDay = null;
  if (widgetService.syncTimeout) {
    clearTimeout(widgetService.syncTimeout);
    widgetService.syncTimeout = null;
  }
  NativeModules.WidgetReloader = {
    reloadWidgetWithData: mockReloadWidgetWithData,
    reloadAllWidgets: mockReloadAllWidgets,
  };
});

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("widgetService.syncTodayTasks", () => {
  it("sorts completed tasks to the bottom and uncompleted tasks by time", async () => {
    const key = todayKey();
    await widgetService.syncTodayTasks({
      [key]: [
        { id: "1", title: "Done early", time: "08:00", is_completed: true },
        { id: "2", title: "Later", time: "18:00", is_completed: false },
        { id: "3", title: "Earlier", time: "09:00", is_completed: false },
      ],
    });

    expect(mockReloadWidgetWithData).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockReloadWidgetWithData.mock.calls[0][0]);
    const todayTasks = written[key];

    expect(todayTasks.map((t) => t.id)).toEqual(["3", "2", "1"]);
  });

  it("falls back to SharedGroupPreferences when the native reload module is unavailable", async () => {
    NativeModules.WidgetReloader.reloadWidgetWithData = undefined;

    await widgetService.syncTodayTasks({ [todayKey()]: [] });

    expect(mockSharedGroupSetItem).toHaveBeenCalledWith(
      "widgetTasksByDate",
      expect.any(String),
      "group.com.cty0305.too.doo.list.data"
    );
  });
});

describe("widgetService.clearWidgetData", () => {
  it("clears the widget via the native reload module with an empty payload", async () => {
    await widgetService.clearWidgetData();

    expect(mockReloadWidgetWithData).toHaveBeenCalledWith(
      JSON.stringify({})
    );
  });

  it("falls back to SharedGroupPreferences with the correct key when the native module is unavailable", async () => {
    NativeModules.WidgetReloader.reloadWidgetWithData = undefined;

    await widgetService.clearWidgetData();

    expect(mockSharedGroupSetItem).toHaveBeenCalledWith(
      "widgetTasksByDate",
      JSON.stringify({}),
      "group.com.cty0305.too.doo.list.data"
    );
    expect(mockReloadAllWidgets).toHaveBeenCalled();
  });

  it("cancels any pending debounced sync so cleared data isn't immediately overwritten", async () => {
    jest.useFakeTimers();
    widgetService.lastSyncTime = Date.now();
    // Within the debounce window: this schedules a delayed _performSync
    widgetService.syncTodayTasks({ [todayKey()]: [{ id: "1", title: "X" }] });
    expect(widgetService.syncTimeout).not.toBeNull();

    await widgetService.clearWidgetData();
    expect(widgetService.syncTimeout).toBeNull();

    jest.runAllTimers();
    // The pending sync must not have fired after clearWidgetData cancelled it
    expect(mockReloadWidgetWithData).toHaveBeenCalledTimes(1);
    expect(mockReloadWidgetWithData).toHaveBeenCalledWith(JSON.stringify({}));
    jest.useRealTimers();
  });
});
