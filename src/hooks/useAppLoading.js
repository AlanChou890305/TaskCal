import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";
import { UserService } from "../services/userService";
import { dataPreloadService } from "../services/dataPreloadService";
import { mixpanelService } from "../services/mixpanelService";
import { getCurrentEnvironment } from "../config/environment";
import ReactGA from "react-ga4";

const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";

/**
 * 等待 preload 完成（最多 2 秒），統一取代 polling 模式
 */
const waitForPreload = async () => {
  if (dataPreloadService.isPreloading && dataPreloadService.preloadPromise) {
    await Promise.race([
      dataPreloadService.preloadPromise,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
};

/**
 * 共享的 getUserSettings promise，避免三個 loader 各自呼叫
 */
let sharedSettingsPromise = null;
const getSharedSettings = () => {
  if (!sharedSettingsPromise) {
    sharedSettingsPromise = UserService.getUserSettings();
  }
  return sharedSettingsPromise;
};

/**
 * 取得 userSettings：優先用 preload cache，fallback 用共享 promise
 */
const resolveUserSettings = async () => {
  const cachedData = dataPreloadService.getCachedData();
  if (cachedData?.userSettings) {
    return cachedData.userSettings;
  }
  return getSharedSettings();
};

/**
 * useAppLoading - 統一管理語言、主題、userType 的載入邏輯
 */
export function useAppLoading() {
  const [language, setLanguageState] = useState("en");
  const [loadingLang, setLoadingLang] = useState(true);
  const [themeMode, setThemeModeState] = useState("auto");
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [userType, setUserTypeState] = useState("general");
  const [loadingUserType, setLoadingUserType] = useState(true);

  // Load theme function
  const loadTheme = useCallback(async () => {
    try {
      console.log("🎨 Loading theme settings...");
      await waitForPreload();

      let userSettings = await resolveUserSettings();

      if (
        userSettings.theme === "dark" ||
        userSettings.theme === "light" ||
        userSettings.theme === "auto"
      ) {
        console.log(`✅ Theme loaded: ${userSettings.theme}`);
        setThemeModeState(userSettings.theme);
      } else {
        console.log(
          `⚠️ Invalid theme setting (${userSettings.theme}), using default: auto`,
        );
        setThemeModeState("auto");
      }
    } catch (error) {
      console.error("❌ Error loading theme settings:", error);
      setThemeModeState("auto");
    } finally {
      setLoadingTheme(false);
    }
  }, []);

  // Load user type function
  const loadUserType = useCallback(async () => {
    try {
      setLoadingUserType(true);
      await waitForPreload();

      let userSettings = await resolveUserSettings();

      if (userSettings && userSettings.user_type) {
        setUserTypeState(userSettings.user_type);
      }
    } catch (error) {
      console.error("❌ Error loading user type settings:", error);
    } finally {
      setLoadingUserType(false);
    }
  }, []);

  // 啟動時的初始化 effect
  useEffect(() => {
    // 初始化 Google Analytics (僅 Web 平台且 Production 環境)
    if (Platform.OS === "web") {
      const env = getCurrentEnvironment();
      if (env === "production") {
        ReactGA.initialize(
          process.env.EXPO_PUBLIC_GA_WEB_ID || "G-EW2TBM5EML",
        );
        console.log("✅ [GA] Web Production 環境 - 已初始化");
      }
    }

    // 初始化 Mixpanel (僅 iOS/Android 平台且 Production 環境)
    if (Platform.OS !== "web") {
      const env = getCurrentEnvironment();
      if (env === "production") {
        mixpanelService.initialize();
        mixpanelService.track("App Opened");
      }
    }

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location
    ) {
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    }

    // 在 App 層級提前開始預載入（如果有 session）
    const startEarlyPreload = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          console.log("🚀 [App] Starting early preload...");
          dataPreloadService.preloadAllData().catch((preloadError) => {
            console.error("❌ [App] Error in early preload:", preloadError);
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          "❌ [App] Error checking session for early preload:",
          error,
        );
        return false;
      }
    };

    const preloadStartedPromise = startEarlyPreload();

    // Load language from Supabase user settings
    const loadLanguage = async () => {
      try {
        console.log("🌐 Loading language settings...");

        const preloadStarted = await preloadStartedPromise;

        if (preloadStarted) {
          await waitForPreload();
        }

        let userSettings = await resolveUserSettings();

        if (
          userSettings.language &&
          (userSettings.language === "en" ||
            userSettings.language === "zh" ||
            userSettings.language === "es")
        ) {
          console.log(`✅ Language loaded: ${userSettings.language}`);
          setLanguageState(userSettings.language);
        } else {
          const deviceLocale = Localization.getLocales()[0]?.languageCode;
          const fallbackLanguage =
            deviceLocale === "zh" || deviceLocale === "es"
              ? deviceLocale
              : "en";
          console.log(
            `⚠️ No language setting found, using device locale: ${fallbackLanguage}`,
          );
          setLanguageState(fallbackLanguage);
        }
      } catch (error) {
        console.error("❌ Error loading language settings:", error);
        // Fallback to AsyncStorage if Supabase fails
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((lang) => {
          if (lang && (lang === "en" || lang === "zh" || lang === "es")) {
            console.log(`📱 Language loaded from AsyncStorage: ${lang}`);
            setLanguageState(lang);
          }
        });
      } finally {
        setLoadingLang(false);
      }
    };

    // 每次 App 啟動時都更新平台資訊
    const updatePlatformOnStart = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await UserService.updatePlatformInfo();
          console.log("📱 Platform info updated on app start");
        }
      } catch (error) {
        console.error("Error updating platform on start:", error);
      }
    };

    // 先等待預載入開始，然後再載入 language 和 theme
    (async () => {
      await preloadStartedPromise;
      // 重置共享 promise（每次初始化時重新開始）
      sharedSettingsPromise = null;
      loadLanguage();
      loadTheme();
      loadUserType();
    })();

    updatePlatformOnStart();
  }, [loadTheme, loadUserType]);

  return {
    language,
    setLanguageState,
    themeMode,
    setThemeModeState,
    userType,
    setUserTypeState,
    loadingLang,
    loadingTheme,
    loadingUserType,
    loadTheme,
    loadUserType,
  };
}
