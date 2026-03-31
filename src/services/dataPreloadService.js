import { UserService } from "./userService";
import { TaskService } from "./taskService";
import { widgetService } from "./widgetService";
import { supabase } from "./supabaseClient";
import { format } from "date-fns";

/**
 * 數據預載入服務
 * 在用戶登入後立即並行載入所有必要的數據
 */
class DataPreloadService {
  static preloadCache = {
    userSettings: null,
    userProfile: null,
    calendarTasks: null,
    preloadTimestamp: null,
    todayTasks: null,
    currentMonthTasks: null,
  };

  static CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘緩存
  static isPreloading = false;
  static preloadPromise = null;
  static calendarTasksListeners = new Set();

  /**
   * 預載入所有用戶數據
   * 並行載入：用戶設定、用戶資料、前/當/後月任務（單次 DB query）
   */
  static async preloadAllData() {
    if (this.isPreloading && this.preloadPromise) {
      if (__DEV__) console.log("⏳ [DataPreload] Preload already in progress, waiting...");
      return this.preloadPromise;
    }

    if (__DEV__) console.log("🚀 [DataPreload] Starting data preload...");
    const startTime = Date.now();

    this.isPreloading = true;

    this.preloadPromise = (async () => {
      try {
        // 檢查緩存
        if (
          this.preloadCache.userSettings &&
          this.preloadCache.userProfile &&
          this.preloadCache.calendarTasks &&
          this.preloadCache.preloadTimestamp &&
          Date.now() - this.preloadCache.preloadTimestamp < this.CACHE_DURATION
        ) {
          if (__DEV__) console.log("📦 [DataPreload] Using cached data");
          this.isPreloading = false;
          this.preloadPromise = null;
          return {
            userSettings: this.preloadCache.userSettings,
            userProfile: this.preloadCache.userProfile,
            calendarTasks: this.preloadCache.calendarTasks,
          };
        }

        // 一次性解析 auth user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn("⚠️ [DataPreload] No authenticated user, skipping preload");
          this.isPreloading = false;
          this.preloadPromise = null;
          return { userSettings: null, userProfile: null, calendarTasks: null };
        }

        // 並行載入：用戶設定、用戶資料、三個月任務（單次 DB query）
        const [userSettings, userProfile, calendarTasks] = await Promise.all([
          this.preloadUserSettings(user),
          this.preloadUserProfile(user),
          this.preloadThreeMonthTasks(user),
        ]);

        // 從結果中提取今天和當月的任務（供外部取用）
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todayTasks = calendarTasks[todayStr] ? { [todayStr]: calendarTasks[todayStr] } : {};

        const today = new Date();
        const currentMonthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
        const currentMonthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
        const currentMonthTasks = {};
        Object.keys(calendarTasks).forEach((date) => {
          if (date >= currentMonthStart && date <= currentMonthEnd) {
            currentMonthTasks[date] = calendarTasks[date];
          }
        });

        // 更新緩存
        this.preloadCache.userSettings = userSettings;
        this.preloadCache.userProfile = userProfile;
        this.preloadCache.calendarTasks = calendarTasks;
        this.preloadCache.todayTasks = todayTasks;
        this.preloadCache.currentMonthTasks = currentMonthTasks;
        this.preloadCache.preloadTimestamp = Date.now();

        // Widget sync：只呼叫一次
        widgetService.syncTodayTasks(calendarTasks).catch((error) => {
          console.error("❌ [DataPreload] Failed to sync tasks to widget:", error);
        });

        this.notifyCalendarTasksListeners();

        const duration = Date.now() - startTime;
        if (__DEV__) console.log(`✅ [DataPreload] All data loaded in ${duration}ms`);

        this.isPreloading = false;
        this.preloadPromise = null;

        return { userSettings, userProfile, calendarTasks };
      } catch (error) {
        console.error("❌ [DataPreload] Error preloading data:", error);

        this.isPreloading = false;
        this.preloadPromise = null;

        const fallbackTasks =
          this.preloadCache.todayTasks ||
          this.preloadCache.currentMonthTasks ||
          null;
        return {
          userSettings: this.preloadCache.userSettings,
          userProfile: this.preloadCache.userProfile,
          calendarTasks: fallbackTasks,
        };
      }
    })();

    return this.preloadPromise;
  }

  /**
   * 預載入用戶設定
   */
  static async preloadUserSettings(user = null) {
    try {
      if (__DEV__) console.log("📥 [DataPreload] Loading user settings...");
      const settings = await UserService.getUserSettings(user);
      if (__DEV__) console.log("✅ [DataPreload] User settings loaded");
      return settings;
    } catch (error) {
      console.error("❌ [DataPreload] Error loading user settings:", error);
      return null;
    }
  }

  /**
   * 預載入用戶資料
   */
  static async preloadUserProfile(user = null) {
    try {
      if (__DEV__) console.log("📥 [DataPreload] Loading user profile...");
      const profile = await UserService.getUserProfile(user);
      if (__DEV__) console.log("✅ [DataPreload] User profile loaded");
      return profile;
    } catch (error) {
      console.error("❌ [DataPreload] Error loading user profile:", error);
      return null;
    }
  }

  /**
   * 單次查詢載入前/當/後三個月任務
   */
  static async preloadThreeMonthTasks(user = null) {
    try {
      const today = new Date();
      const start = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), "yyyy-MM-dd");
      const end = format(new Date(today.getFullYear(), today.getMonth() + 2, 0), "yyyy-MM-dd");

      if (__DEV__) console.log(`🚀 [DataPreload] Loading tasks: ${start} to ${end}`);
      const tasks = await TaskService.getTasksByDateRange(start, end, user);
      if (__DEV__) console.log("✅ [DataPreload] Tasks loaded");
      return tasks;
    } catch (error) {
      console.error("❌ [DataPreload] Error loading tasks:", error);
      return {};
    }
  }

  /**
   * 通知所有訂閱者：calendarTasks 緩存已更新
   */
  static notifyCalendarTasksListeners() {
    const tasks = this.preloadCache.calendarTasks;
    if (tasks && this.calendarTasksListeners.size > 0) {
      this.calendarTasksListeners.forEach((fn) => {
        try {
          fn(tasks);
        } catch (err) {
          console.error("❌ [DataPreload] Calendar tasks listener error:", err);
        }
      });
    }
  }

  /**
   * 訂閱 calendarTasks 緩存更新
   */
  static addCalendarTasksListener(callback) {
    if (typeof callback === "function") {
      this.calendarTasksListeners.add(callback);
    }
  }

  /**
   * 取消訂閱
   */
  static removeCalendarTasksListener(callback) {
    this.calendarTasksListeners.delete(callback);
  }

  /**
   * 清除緩存
   */
  static clearCache() {
    this.preloadCache = {
      userSettings: null,
      userProfile: null,
      calendarTasks: null,
      preloadTimestamp: null,
      todayTasks: null,
      currentMonthTasks: null,
    };
    if (__DEV__) console.log("🗑️ [DataPreload] Cache cleared");
  }

  /**
   * 獲取緩存的數據
   */
  static getCachedData() {
    if (
      this.preloadCache.preloadTimestamp &&
      Date.now() - this.preloadCache.preloadTimestamp < this.CACHE_DURATION
    ) {
      return {
        userSettings: this.preloadCache.userSettings,
        userProfile: this.preloadCache.userProfile,
        calendarTasks: this.preloadCache.calendarTasks,
      };
    }

    if (this.preloadCache.userSettings) {
      return {
        userSettings: this.preloadCache.userSettings,
        userProfile: this.preloadCache.userProfile,
        calendarTasks:
          this.preloadCache.todayTasks ||
          this.preloadCache.currentMonthTasks ||
          this.preloadCache.calendarTasks ||
          null,
      };
    }

    if (this.preloadCache.todayTasks || this.preloadCache.currentMonthTasks) {
      return {
        userSettings: this.preloadCache.userSettings,
        userProfile: this.preloadCache.userProfile,
        calendarTasks:
          this.preloadCache.todayTasks || this.preloadCache.currentMonthTasks,
      };
    }

    return null;
  }

  /**
   * 獲取今天的任務
   */
  static getTodayTasks() {
    return this.preloadCache.todayTasks || null;
  }

  /**
   * 獲取當月任務
   */
  static getCurrentMonthTasks() {
    return this.preloadCache.currentMonthTasks || null;
  }

  /**
   * 更新緩存中的用戶設定
   */
  static updateCachedUserSettings(updatedSettings) {
    if (this.preloadCache.userSettings) {
      this.preloadCache.userSettings = {
        ...this.preloadCache.userSettings,
        ...updatedSettings,
      };
      if (__DEV__) console.log("📦 [DataPreload] Cached user settings updated");
    }
  }
}

export const dataPreloadService = DataPreloadService;
