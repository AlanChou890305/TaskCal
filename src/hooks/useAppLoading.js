import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";
import { getSharedSession } from "../services/sessionCache";
import { UserService } from "../services/userService";
import { dataPreloadService } from "../services/dataPreloadService";
import { mixpanelService } from "../services/mixpanelService";
import { getCurrentEnvironment } from "../config/environment";
import ReactGA from "react-ga4";

const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";
const SETTINGS_CACHE_KEY = "APP_SETTINGS_CACHE";

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
 * 從 AsyncStorage 讀取快取的設定（語言/主題/userType）
 * 用於在網路載入完成前立即顯示上次的設定
 */
const loadCachedSettings = async () => {
  try {
    const cached = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("⚠️ Failed to read cached settings:", error);
  }
  return null;
};

/**
 * 將設定寫入 AsyncStorage 快取，供下次啟動時立即使用
 */
const saveCachedSettings = (settings) => {
  try {
    const toCache = {
      language: settings.language,
      theme: settings.theme,
      user_type: settings.user_type,
    };
    AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(toCache)).catch(
      (error) => console.warn("⚠️ Failed to save settings cache:", error),
    );
  } catch (error) {
    console.warn("⚠️ Failed to save settings cache:", error);
  }
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
      // Bypass shared promise for theme: it may be stale from an unauthenticated
      // initial call ({theme:"light"}). Always fetch directly so reloadTheme
      // after login gets the correct value from Supabase.
      const cachedData = dataPreloadService.getCachedData();
      let userSettings = cachedData?.userSettings
        ? cachedData.userSettings
        : await UserService.getUserSettings();

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

    // 步驟 1：立即從 AsyncStorage 讀取快取設定（回訪用戶秒開）
    const applyCachedSettings = async () => {
      const cached = await loadCachedSettings();
      if (cached) {
        console.log("⚡ [App] Applying cached settings for instant display");
        if (cached.language && ["en", "zh", "es"].includes(cached.language)) {
          setLanguageState(cached.language);
        }
        if (cached.theme && ["dark", "light", "auto"].includes(cached.theme)) {
          setThemeModeState(cached.theme);
        }
        if (cached.user_type) {
          setUserTypeState(cached.user_type);
        }
        // 快取已套用，立即解除 loading 狀態
        setLoadingLang(false);
        setLoadingTheme(false);
        setLoadingUserType(false);
      }
    };

    // 步驟 2：在 App 層級提前開始預載入（如果有 session）
    const startEarlyPreload = async () => {
      try {
        const session = await getSharedSession();
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

    // 步驟 3：從網路載入最新設定，並更新快取
    const loadLanguage = async () => {
      try {
        console.log("🌐 Loading language settings...");
        let userSettings = await resolveUserSettings();

        // 寫入 AsyncStorage 快取供下次啟動使用
        if (userSettings) {
          saveCachedSettings(userSettings);
        }

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
          await UserService.updatePlatformInfo(user);
          console.log("📱 Platform info updated on app start");
        }
      } catch (error) {
        console.error("Error updating platform on start:", error);
      }
    };

    // 先嘗試套用快取，再平行啟動預載入和網路載入
    const preloadStartedPromise = startEarlyPreload();

    (async () => {
      await applyCachedSettings();
      const preloadStarted = await preloadStartedPromise;
      // 重置共享 promise（每次初始化時重新開始）
      sharedSettingsPromise = null;
      // 統一等待一次 preload，避免三個 loader 各自 waitForPreload
      if (preloadStarted) {
        await waitForPreload();
      }
      // 如果快取已套用，網路載入只是靜默更新
      loadLanguage();
      loadTheme();
      loadUserType();
    })();

    // 延遲執行 updatePlatformOnStart（遙測資料不需要在啟動關鍵路徑上）
    const platformUpdateTimer = setTimeout(() => {
      updatePlatformOnStart();
    }, 8000);

    return () => clearTimeout(platformUpdateTimer);
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
