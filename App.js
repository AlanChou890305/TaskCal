import React, { useEffect, useMemo } from "react";
import { Platform, View, Text, Image, ActivityIndicator, useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_700Bold,
} from "@expo-google-fonts/noto-sans-tc";
import * as Updates from "expo-updates";

// Side-effect: handle OAuth redirect before React initializes (web only)
import "./src/utils/oauthRedirect";

// Services
import { supabase } from "./supabaseClient";
import { UserService } from "./src/services/userService";
import { dataPreloadService } from "./src/services/dataPreloadService";
import { versionService } from "./src/services/versionService";

// Config
import { translations } from "./src/locales";
import { getTheme } from "./src/config/theme";

// Contexts
import { LanguageContext, ThemeContext, UserContext } from "./src/contexts";
export { LanguageContext, ThemeContext, UserContext };

// Screens & Navigation
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import MainTabs from "./src/navigation/MainTabs";
import VersionUpdateModal from "./src/components/VersionUpdateModal";

// Hooks
import { useAppLoading } from "./src/hooks/useAppLoading";

// Global error handler for uncaught errors
if (Platform.OS !== "web") {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError("[ERROR]", ...args);
  };
}

const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";
const Stack = createStackNavigator();

const getRedirectUrl = () => {
  return "https://to-do-mvp.vercel.app";
};

const getAppDisplayName = () => {
  return "TaskCal";
};

// Helper function to get font family based on platform and language
const getFontFamily = (language = "en", weight = "regular") => {
  const isChinese = language === "zh";

  if (Platform.OS === "web") {
    return isChinese
      ? '"Noto Sans TC", -apple-system, system-ui, sans-serif'
      : '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  }

  if (!isChinese) {
    return undefined;
  }
  if (weight === "bold") {
    return "NotoSansTC_700Bold";
  } else if (weight === "medium") {
    return "NotoSansTC_500Medium";
  }
  return "NotoSansTC_400Regular";
};

export default function App() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_700Bold,
  });

  // Web font injection
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const cleanupElements = [];

      const fontsLink = document.createElement("link");
      fontsLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap";
      fontsLink.rel = "stylesheet";
      document.head.appendChild(fontsLink);
      cleanupElements.push(fontsLink);

      const style = document.createElement("style");
      style.textContent = `
        [dir] > * {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans TC',
            system-ui, sans-serif !important;
        }
        [dir] > svg,
        [dir] > * > svg,
        [dir] [role="img"],
        [dir] [aria-label*="icon" i] {
          font-family: inherit !important;
        }
        input, textarea, select {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans TC',
            system-ui, sans-serif !important;
        }
        body {
          display: flex;
          justify-content: center;
          background-color: #f2f2f2;
        }
        #root {
          width: 375px;
          max-width: 375px;
          min-height: 100vh;
          background-color: #fff;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
        }
      `;
      document.head.appendChild(style);
      cleanupElements.push(style);

      return () => {
        cleanupElements.forEach((el) => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      };
    }
  }, []);

  // Web title observer
  useEffect(() => {
    if (Platform.OS === "web") {
      const title = getAppDisplayName();
      const setTitle = () => {
        document.title = title;
      };
      setTitle();
      const observer = new MutationObserver(() => {
        if (document.title !== title) {
          document.title = title;
        }
      });
      const titleTag = document.querySelector("title");
      if (titleTag) {
        observer.observe(titleTag, { childList: true });
      }

      return () => observer.disconnect();
    }
  }, []);

  // App loading: language, theme, userType (with optimized preload)
  const {
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
  } = useAppLoading();

  // 檢測系統顏色模式
  const systemColorScheme = useColorScheme();

  // 監聽系統主題變化
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log(`🎨 System theme changed to: ${colorScheme}`);
    });
    return () => subscription.remove();
  }, []);

  // 版本更新狀態
  const [updateInfo, setUpdateInfo] = React.useState(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = React.useState(false);
  const [isSimulatingUpdate, setIsSimulatingUpdate] = React.useState(false);

  // Request notification permissions on app start (native only)
  useEffect(() => {
    if (Platform.OS !== "web") {
      const requestNotificationPermissions = async () => {
        try {
          const { registerForPushNotificationsAsync } = require("./src/services/notificationService");
          const granted = await registerForPushNotificationsAsync();
          if (granted) {
            console.log("✅ Notification permissions granted");
          } else {
            console.log("❌ Notification permissions denied");
          }
        } catch (error) {
          console.error("Error requesting notification permissions:", error);
        }
      };
      requestNotificationPermissions();
    }
  }, []);

  // 主動檢查版本更新
  useEffect(() => {
    if (Platform.OS === "web") return;

    const LAST_UPDATE_PROMPT_KEY = "LAST_UPDATE_PROMPT_INFO";

    const checkShouldShowPrompt = async (latestVersion, forceUpdate) => {
      if (forceUpdate) return true;

      try {
        const storedInfo = await AsyncStorage.getItem(LAST_UPDATE_PROMPT_KEY);
        if (!storedInfo) return true;

        const { version, timestamp } = JSON.parse(storedInfo);

        if (versionService.compareVersions(latestVersion, version) > 0) {
          return true;
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return now - timestamp > oneDay;
      } catch (error) {
        console.error("Error checking version prompt frequency:", error);
        return true;
      }
    };

    const checkUpdateProactively = async () => {
      try {
        console.log("🔍 [App] 開始主動檢查版本更新...");
        const info = await versionService.checkForUpdates(false, language);

        if (info.hasUpdate) {
          const shouldShow = await checkShouldShowPrompt(
            info.latestVersion,
            info.forceUpdate,
          );

          if (shouldShow) {
            console.log("🔔 [App] 顯示版本更新提示:", info.latestVersion);
            setUpdateInfo(info);
            setIsUpdateModalVisible(true);

            await AsyncStorage.setItem(
              LAST_UPDATE_PROMPT_KEY,
              JSON.stringify({
                version: info.latestVersion,
                timestamp: Date.now(),
              }),
            );
          }
        }
      } catch (error) {
        console.error("❌ [App] 主動檢查版本失敗:", error);
      }
    };

    // EAS OTA
    const checkAndApplyOTA = async () => {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.warn("⚠️ [OTA] 檢查/套用更新失敗:", e?.message ?? e);
      }
    };

    const otaTimer = setTimeout(checkAndApplyOTA, 2000);
    const storeTimer = setTimeout(checkUpdateProactively, 3000);
    return () => {
      clearTimeout(otaTimer);
      clearTimeout(storeTimer);
    };
  }, []);

  // setLanguage: save to Supabase + AsyncStorage fallback
  const setLanguage = async (lang) => {
    console.log(`🌐 Setting language to: ${lang}`);
    setLanguageState(lang);

    versionService.clearCache();
    console.log("🗑️ Version cache cleared for language change");

    try {
      const result = await UserService.updateUserSettings({
        language: lang,
      });
      console.log("✅ Language saved to Supabase:", result);

      if (result) {
        dataPreloadService.updateCachedUserSettings(result);
      }
    } catch (error) {
      const isNetworkError =
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("network") ||
        (!error.code && error.message);

      if (isNetworkError) {
        console.warn(
          "⚠️ Network error saving language to Supabase:",
          error.message,
        );
      } else {
        console.error("❌ Error saving language to Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  };

  // setThemeMode: save to Supabase
  const setThemeMode = async (mode) => {
    console.log(`🎨 Setting theme to: ${mode}`);
    setThemeModeState(mode);

    try {
      const result = await UserService.updateUserSettings({
        theme: mode,
      });
      console.log("✅ Theme saved to Supabase:", result);
    } catch (error) {
      console.error("❌ Error saving theme to Supabase:", error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(newMode);
  };

  const t = translations[language] || translations.en;

  // 計算實際使用的 theme
  const actualThemeMode = useMemo(() => {
    if (themeMode === "auto") {
      const systemTheme = systemColorScheme || Appearance.getColorScheme() || "light";
      console.log(`🎨 [Auto Mode] systemColorScheme: ${systemColorScheme}, Appearance.getColorScheme(): ${Appearance.getColorScheme()}, final: ${systemTheme}`);
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = getTheme(actualThemeMode);

  // On web, determine initial route by waiting for INITIAL_SESSION event.
  // On native, default to "Splash" immediately (SplashScreen handles session check).
  const [initialRoute, setInitialRoute] = React.useState(
    Platform.OS === "web" ? null : "Splash",
  );
  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    let resolved = false;
    let subscription = null;
    let timeout = null;

    // Check if OAuth is in progress — if so, don't show login page prematurely
    const oauthInProgress =
      typeof window !== "undefined" &&
      sessionStorage.getItem("oauth_in_progress") === "true";

    const resolve = (route) => {
      if (resolved) return;
      resolved = true;
      if (subscription) subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
      if (typeof window !== "undefined") {
        if (route === "MainTabs") {
          sessionStorage.removeItem("oauth_in_progress");
          // Set URL to /app so linking config resolves to MainTabs instead of Splash (which matches /)
          window.history.replaceState({}, document.title, "/app");
        } else {
          // Clear OAuth params from URL to avoid confusion
          const url = new URL(window.location.href);
          if (url.search.includes("code=") || url.hash.includes("access_token")) {
            window.history.replaceState({}, document.title, url.pathname);
          }
        }
      }
      setInitialRoute(route);
    };

    const run = async () => {
      try {
        const seen = await AsyncStorage.getItem("onboarding_completed");
        if (!seen) {
          resolve("Onboarding");
          return;
        }
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "INITIAL_SESSION") {
            if (session) {
              resolve("MainTabs");
            } else if (!oauthInProgress) {
              resolve("Splash");
            }
            // If oauthInProgress && no session: stay on loading screen,
            // wait for SIGNED_IN event after code exchange completes.
          }
          if (event === "SIGNED_IN" && session) {
            resolve("MainTabs");
          }
        });
        subscription = data.subscription;
        // Safety fallback
        timeout = setTimeout(() => resolve("Splash"), 8000);
      } catch {
        resolve("Splash");
      }
    };

    run();
    return () => {
      resolved = true;
      if (subscription) subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Font loading timeout fallback
  const [fontTimeout, setFontTimeout] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Font loading timeout - continuing anyway");
      setFontTimeout(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Log font loading status
  React.useEffect(() => {
    console.log("Font loading status:", {
      fontsLoaded,
      fontTimeout,
      loadingLang,
      loadingTheme,
    });
  }, [fontsLoaded, fontTimeout, loadingLang, loadingTheme]);

  // Show branded loading screen while fonts/language/theme are loading, or while checking session on web
  // 優化: loadingUserType 不再阻塞首屏（只影響廣告顯示）
  if (((!fontsLoaded || loadingLang || loadingTheme) && !fontTimeout) ||
      (Platform.OS === "web" && initialRoute === null)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#BEBAFF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={require("./assets/logo-login.png")}
          style={{ width: 100, height: 100, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#ffffff",
            letterSpacing: 1,
            marginBottom: 40,
          }}
        >
          TaskCal
        </Text>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, toggleTheme, loadTheme }}
    >
      <UserContext.Provider
        value={{
          userType,
          loadingUserType,
          setUserType: setUserTypeState,
          loadUserType,
          setUpdateInfo,
          setIsUpdateModalVisible,
          isSimulatingUpdate,
          setIsSimulatingUpdate,
        }}
      >
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
          <NavigationContainer
            linking={{
              prefixes: [
                getRedirectUrl(),
                "http://localhost:8081",
                "taskcal://",
              ],
              config: {
                screens: {
                  Splash: "",
                  MainTabs: "app",
                  Terms: "terms",
                  Privacy: "privacy",
                  Support: "support",
                },
              },
            }}
            onStateChange={() => {
              if (typeof document !== "undefined") {
                document.title = getAppDisplayName();
              }
            }}
          >
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
              initialRouteName={initialRoute || "Splash"}
            >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  animationEnabled: false,
                }}
              />
            </Stack.Navigator>
            <VersionUpdateModal
              visible={isUpdateModalVisible}
              onClose={() => setIsUpdateModalVisible(false)}
              updateInfo={updateInfo}
              forceUpdate={updateInfo?.forceUpdate}
              theme={theme}
              t={t}
            />
          </NavigationContainer>
        </LanguageContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
    </GestureHandlerRootView>
  );
}
