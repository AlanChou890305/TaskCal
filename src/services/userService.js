import { supabase } from "./supabaseClient";
import { Platform } from "react-native";
import { getSupabaseConfig } from "../config/environment";
import { versionService } from "./versionService";
import * as Localization from "expo-localization";

export class UserService {
  static cachedAuthUser = null;
  static pendingUpdateRequest = null; // 追蹤正在進行的更新請求
  static cachedAuthUserUpdatedAt = null;

  static normalizeAuthUser(user) {
    if (!user || !user.id || !user.email) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata || {},
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    };
  }

  static setCachedAuthUser(user) {
    const normalized = UserService.normalizeAuthUser(user);
    if (normalized) {
      UserService.cachedAuthUser = normalized;
      UserService.cachedAuthUserUpdatedAt = Date.now();
    }
  }

  static clearCachedAuthUser() {
    UserService.cachedAuthUser = null;
    UserService.cachedAuthUserUpdatedAt = null;
  }

  static getCachedAuthUser(maxAgeMs = 5 * 60 * 1000) {
    if (
      UserService.cachedAuthUser &&
      UserService.cachedAuthUser.id &&
      UserService.cachedAuthUser.email
    ) {
      if (!UserService.cachedAuthUserUpdatedAt) {
        return UserService.cachedAuthUser;
      }
      const age = Date.now() - UserService.cachedAuthUserUpdatedAt;
      if (age <= maxAgeMs) {
        return UserService.cachedAuthUser;
      }
    }
    return null;
  }

  // Get user settings
  static async getUserSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("No authenticated user found");
        return {
          language: "en",
          theme: "light",
          notifications_enabled: true,
        };
      }

      // 只選擇需要的欄位，減少數據傳輸量
      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "language, theme, notifications_enabled, platform, last_active_at, display_name, reminder_settings, email_preferences, user_type, app_version, app_build_number",
        )
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If user_settings doesn't exist, create it with defaults
        if (error.code === "PGRST116") {
          console.log("📝 Creating default user settings for new user");
          const deviceLocale = Localization.getLocales()[0]?.languageCode;
          const defaultLanguage =
            deviceLocale === "zh" || deviceLocale === "es" ? deviceLocale : "en";
          console.log(
            `🌐 Device locale: ${deviceLocale}, defaulting to: ${defaultLanguage}`,
          );
          const defaultSettings = {
            language: defaultLanguage,
            theme: "auto",
            notifications_enabled: true,
            reminder_settings: { enabled: true, times: [30, 10, 5] },
          };

          try {
            const { data: newData, error: createError } = await supabase
              .from("user_settings")
              .insert({
                user_id: user.id,
                ...defaultSettings,
                platform: Platform.OS,
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating user settings:", createError);
              return defaultSettings;
            }

            console.log("✅ Default user settings created");
            // 正確處理 theme
            const newThemeValue =
              newData.theme === "dark" || newData.theme === "light" || newData.theme === "auto"
                ? newData.theme
                : "auto";

            return {
              language: newData.language || "en",
              theme: newThemeValue,
              notifications_enabled: newData.notifications_enabled !== false,
              platform: newData.platform,
              user_type: newData.user_type || "general",
              last_active_at: newData.last_active_at,
              display_name: newData.display_name,
              reminder_settings: newData.reminder_settings,
              email_preferences: newData.email_preferences || {
                product_updates: true,
                marketing: false,
              },
            };
          } catch (insertError) {
            console.error("Error inserting user settings:", insertError);
            return defaultSettings;
          }
        }

        // 只記錄非 PGRST116 的錯誤（PGRST116 是記錄不存在的正常情況）
        if (error.code !== "PGRST116") {
          // 檢查是否為網絡錯誤
          const isNetworkError =
            error.message?.includes("Network request failed") ||
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("network") ||
            (!error.code && error.message);

          if (isNetworkError) {
            console.warn(
              "⚠️ Network error fetching user settings:",
              error.message,
            );
          } else {
            console.error("❌ Error fetching user settings:", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
          }
        }
        // Return default settings if other error
        return {
          language: "en",
          theme: "auto",
          notifications_enabled: true,
        };
      }

      // 正確處理 theme：只有當 theme 是 null 或 undefined 時才使用預設值
      // 如果 theme 是 "dark"、"light" 或 "auto" 字串，應該保留
      const themeValue =
        data.theme === "dark" || data.theme === "light" || data.theme === "auto" ? data.theme : "auto";

      return {
        language: data.language || "en",
        theme: themeValue,
        notifications_enabled: data.notifications_enabled !== false,
        platform: data.platform,
        user_type: data.user_type || "general",
        last_active_at: data.last_active_at,
        display_name: data.display_name,
        reminder_settings: data.reminder_settings,
        email_preferences: data.email_preferences || {
          product_updates: true,
          marketing: false,
        },
        app_version: data.app_version,
        app_build_number: data.app_build_number,
      };
    } catch (error) {
      // 檢查是否為網絡錯誤
      const isNetworkError =
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("network") ||
        (!error.code && error.message);

      if (isNetworkError) {
        console.warn("⚠️ Network error in getUserSettings:", error.message);
      } else {
        console.error("❌ Error in getUserSettings:", {
          message: error?.message || "Unknown error",
          stack: error?.stack,
          name: error?.name,
        });
      }
      return {
        language: "en",
        theme: "light",
        notifications_enabled: true,
        platform: Platform.OS,
        last_active_at: null,
        reminder_settings: { enabled: true, times: [30, 10, 5] },
        email_preferences: { product_updates: true, marketing: false },
      };
    }
  }

  // Update user settings
  static async updateUserSettings(settings) {
    // 如果有一個正在進行的更新請求，等待它完成並合併設定
    if (this.pendingUpdateRequest) {
      console.log("⏳ Waiting for pending update request to complete...");
      try {
        const previousResult = await this.pendingUpdateRequest;
        // 合併設定：保留之前的設定，只更新新傳入的設定
        settings = {
          ...previousResult,
          ...settings, // 新設定覆蓋舊設定
        };
        console.log("📦 Merged settings with pending request");
      } catch (error) {
        // 如果之前的請求失敗，繼續使用新設定
        console.warn(
          "⚠️ Previous update request failed, continuing with new settings",
        );
      }
    }

    // 創建新的更新請求
    const updatePromise = (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("No authenticated user found");
        }

        // 先確保 user_settings 記錄存在
        // 如果記錄不存在，getUserSettings 會自動創建，但如果創建失敗，我們仍然可以嘗試更新
        try {
          await this.getUserSettings();
        } catch (getSettingsError) {
          // 如果獲取設定失敗，記錄警告但繼續嘗試更新
          // 因為 update 可能會失敗（記錄不存在），但我們會處理這個錯誤
          console.warn("Warning: Could not ensure user_settings exists:", {
            message: getSettingsError?.message,
            code: getSettingsError?.code,
          });
        }

        // 從 auth.users 獲取 display_name（如果 settings 中沒有提供）
        // 這樣可以確保 user_settings 中的 display_name 始終是最新的
        const authDisplayName =
          user.user_metadata?.name || user.email?.split("@")[0] || "User";

        // 只更新傳入的欄位，不影響其他欄位（如 theme）
        const updateData = {
          ...settings, // 只包含傳入的設定
          platform: Platform.OS, // 總是更新平台資訊
          last_active_at: new Date().toISOString(), // 總是更新最後活動時間
          // 如果 settings 中沒有提供 display_name，則從 auth.users 同步
          display_name:
            settings.display_name !== undefined
              ? settings.display_name
              : authDisplayName,
        };

        // 使用 update 而不是 upsert，這樣只會更新指定的欄位，不會覆蓋其他欄位
        // 但如果記錄不存在，update 會失敗，此時我們需要使用 upsert
        let { data, error } = await supabase
          .from("user_settings")
          .update(updateData)
          .eq("user_id", user.id)
          .select()
          .single();

        // 如果 update 失敗且是因為記錄不存在，嘗試使用 upsert
        if (
          error &&
          (error.code === "PGRST116" || error.message?.includes("No rows"))
        ) {
          console.log("📝 Record not found, creating with upsert...");
          const upsertData = {
            user_id: user.id,
            ...updateData,
          };
          const upsertResult = await supabase
            .from("user_settings")
            .upsert(upsertData, { onConflict: "user_id" })
            .select()
            .single();

          if (upsertResult.error) {
            console.error("Error upserting user settings:", {
              code: upsertResult.error.code,
              message: upsertResult.error.message,
              details: upsertResult.error.details,
              hint: upsertResult.error.hint,
            });
            throw upsertResult.error;
          }

          data = upsertResult.data;
          error = null;
        } else if (error) {
          // 檢查是否為網絡錯誤
          const isNetworkError =
            error.message?.includes("Network request failed") ||
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("network") ||
            !error.code; // Supabase 錯誤通常有 code，網絡錯誤可能沒有

          if (isNetworkError) {
            console.warn(
              "⚠️ Network error updating user settings:",
              error.message,
            );
          } else {
            console.error("❌ Error updating user settings:", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
          }
          throw error;
        }

        return {
          language: data.language,
          theme: data.theme,
          notifications_enabled: data.notifications_enabled,
          platform: data.platform,
          user_type: data.user_type || "general",
          last_active_at: data.last_active_at,
          display_name: data.display_name,
          reminder_settings: data.reminder_settings,
          email_preferences: data.email_preferences,
        };
      } catch (error) {
        // 檢查是否為網絡錯誤
        const isNetworkError =
          error.message?.includes("Network request failed") ||
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("network") ||
          (!error.code && error.message);

        if (isNetworkError) {
          console.warn(
            "⚠️ Network error in updateUserSettings:",
            error.message,
          );
        } else {
          console.error("❌ Error in updateUserSettings:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        }
        throw error;
      } finally {
        // 清除正在進行的請求標記
        if (this.pendingUpdateRequest === updatePromise) {
          this.pendingUpdateRequest = null;
        }
      }
    })();

    // 保存當前請求
    this.pendingUpdateRequest = updatePromise;

    return updatePromise;
  }

  // Fetch authenticated user with retries, ensuring email and id are available
  static async fetchAuthUserWithRetry(
    maxRetries = 3,
    delayMs = 500,
    timeoutMs = 2500,
  ) {
    const cachedUser = UserService.getCachedAuthUser();
    if (cachedUser) {
      console.log(
        "[fetchAuthUserWithRetry] Returning cached auth user:",
        cachedUser.email,
      );
      return cachedUser;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[fetchAuthUserWithRetry] Calling getUser() (attempt ${attempt}/${maxRetries})`,
        );

        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `[fetchAuthUserWithRetry] getUser() timeout after ${timeoutMs}ms`,
                ),
              ),
            timeoutMs,
          ),
        );

        const { data, error } = await Promise.race([
          getUserPromise,
          timeoutPromise,
        ]);

        const user = data?.user;

        if (error) {
          console.warn(
            `[fetchAuthUserWithRetry] getUser() error (attempt ${attempt}/${maxRetries}):`,
            error,
          );
        } else if (!user) {
          console.warn(
            `[fetchAuthUserWithRetry] getUser() returned no user (attempt ${attempt}/${maxRetries})`,
          );
        } else if (user?.email && user?.id) {
          UserService.setCachedAuthUser(user);
          console.log(
            `[fetchAuthUserWithRetry] ✅ Success with user ${user.email} (attempt ${attempt}/${maxRetries})`,
          );
          return UserService.getCachedAuthUser();
        } else {
          console.warn(
            `[fetchAuthUserWithRetry] getUser() returned incomplete user (attempt ${attempt}/${maxRetries}):`,
            {
              hasUser: !!user,
              hasEmail: !!user?.email,
              hasId: !!user?.id,
            },
          );
        }
      } catch (error) {
        console.warn(
          `[fetchAuthUserWithRetry] Exception in getUser() (attempt ${attempt}/${maxRetries}):`,
          error,
        );
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.warn("[fetchAuthUserWithRetry] Failed to get authenticated user");
    return null;
  }

  // Get user profile information
  static async getUserProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      // Get provider from app_metadata or identities
      const provider =
        user.app_metadata?.provider ||
        user.identities?.[0]?.provider ||
        "unknown";

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
        provider: provider,
      };
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return null;
    }
  }

  // Get user settings with authentication info (direct from user_settings table)
  static async getUserSettingsWithAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("No authenticated user found");
        return null;
      }

      // 只選擇需要的欄位，減少數據傳輸量
      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "id, user_id, language, theme, notifications_enabled, platform, last_active_at, created_at, updated_at, display_name, user_type, app_version, app_build_number",
        )
        .eq("user_id", user.id)
        .single();

      if (error) {
        // 檢查是否為網絡錯誤
        const isNetworkError =
          error.message?.includes("Network request failed") ||
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("network") ||
          (!error.code && error.message);

        if (isNetworkError) {
          console.warn(
            "⚠️ Network error fetching user settings with auth:",
            error.message,
          );
        } else {
          console.error("❌ Error fetching user settings with auth:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        }
        return null;
      }

      return {
        // User settings
        id: data.id,
        user_id: data.user_id,
        language: data.language || "en",
        theme: data.theme || "light",
        notifications_enabled: data.notifications_enabled !== false,
        platform: data.platform,
        user_type: data.user_type || "general",
        last_active_at: data.last_active_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        app_version: data.app_version,
        app_build_number: data.app_build_number,

        // Auth info (from current user)
        display_name: data.display_name, // 從 user_settings 返回（已同步自 auth.users）
        email: user.email,
        auth_created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      };
    } catch (error) {
      // 檢查是否為網絡錯誤
      const isNetworkError =
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("network") ||
        (!error.code && error.message);

      if (isNetworkError) {
        console.warn(
          "⚠️ Network error in getUserSettingsWithAuth:",
          error.message,
        );
      } else {
        console.error("❌ Error in getUserSettingsWithAuth:", {
          message: error?.message || "Unknown error",
          stack: error?.stack,
          name: error?.name,
        });
      }
      return null;
    }
  }

  // Update platform info when user opens the app
  static async updatePlatformInfo() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // 先確保 user_settings 記錄存在
      await this.getUserSettings();

      // 從 auth.users 獲取 display_name（用於在 table editor 中顯示）
      const authDisplayName =
        user.user_metadata?.name || user.email?.split("@")[0] || "User";

      // 獲取當前版本資訊
      const versionInfo = versionService.getCurrentVersionInfo();

      // 獲取用戶實際時區（自動偵測）
      const userTimezone = Localization.getCalendars()[0]?.timeZone || Localization.timezone || "UTC";

      // 更新平台資訊、版本號、時區、最後活動時間，以及同步 display_name（方便在 table editor 查看）
      const { error } = await supabase
        .from("user_settings")
        .update({
          platform: Platform.OS,
          app_version: versionInfo.version,
          app_build_number: versionInfo.buildNumber,
          timezone: userTimezone, // 自動更新用戶時區
          last_active_at: new Date().toISOString(),
          display_name: authDisplayName, // 同步 display_name 以便在 table editor 中查看
        })
        .eq("user_id", user.id);

      if (error) {
        // 檢查是否為網絡錯誤或權限問題
        const isNetworkError =
          error.message?.includes("Network request failed") ||
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("network");

        if (isNetworkError) {
          console.warn(
            "⚠️ Network error updating platform info:",
            error.message,
          );
        } else {
          console.error("❌ Error updating platform info:", {
            code: error.code,
            message: error.message,
            details: error.details,
          });
        }
        return;
      }

      console.log(
        `📱 Platform updated: ${Platform.OS}, Version: ${versionInfo.version} (Build ${versionInfo.buildNumber}), Timezone: ${userTimezone}`,
      );
    } catch (error) {
      // 檢查是否為網絡錯誤
      const isNetworkError =
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("network");

      if (isNetworkError) {
        console.warn("⚠️ Network error updating platform info:", error.message);
      } else {
        console.error(
          "❌ Error updating platform info:",
          error.message || error,
        );
      }
    }
  }

  // Delete user account
  static async deleteUser() {
    try {
      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No active session found");
      }

      // Get Supabase URL from environment config
      const supabaseConfig = getSupabaseConfig();
      const supabaseUrl = supabaseConfig?.url;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Call the delete-user edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user account");
      }

      // Clear cached user
      UserService.clearCachedAuthUser();

      // Sign out after successful deletion
      await supabase.auth.signOut();

      return {
        success: true,
        message: data.message || "Account deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting user account:", error);
      throw error;
    }
  }
}
