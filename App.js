import React, { useMemo, useCallback, useEffect } from "react";
import { Platform, View, Text, Image, ActivityIndicator, useColorScheme, Appearance } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from "@expo-google-fonts/inter-tight";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
// NotoSansTC 已移除：每字重 6.8MB、啟動時同步載入約 20MB 會阻塞主執行緒
// (Sentry「App Hanging ≥ 2000ms」)，且無任何 style 引用它。
// 中文由系統字型 (iOS: PingFang TC) fallback 渲染，視覺不受影響。

// Side-effect: handle OAuth redirect before React initializes (web only)
import "./src/utils/oauthRedirect";

import * as Sentry from "@sentry/react-native";

// Services
import { supabase } from "./src/services/supabaseClient";
import { UserService } from "./src/services/userService";
import { dataPreloadService } from "./src/services/dataPreloadService";
import { widgetService } from "./src/services/widgetService";
import { versionService } from "./src/services/versionService";
import {
  scheduleDailySummaryNotification,
  DAILY_SUMMARY_ENABLED_KEY,
} from "./src/services/notificationService";

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
import TermsScreen from "./src/screens/TermsScreen";
import PrivacyScreen from "./src/screens/PrivacyScreen";
import VersionUpdateModal from "./src/components/VersionUpdateModal";
import ErrorBoundary from "./src/components/ErrorBoundary";

// Hooks
import { useAppLoading } from "./src/hooks/useAppLoading";
import { useWebSetup } from "./src/hooks/useWebSetup";
import { useVersionCheck } from "./src/hooks/useVersionCheck";
import { useInitialRoute } from "./src/hooks/useInitialRoute";
import { useFontTimeout } from "./src/hooks/useFontTimeout";

// Global error handler for uncaught errors
if (Platform.OS !== "web") {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError("[ERROR]", ...args);
  };
}

// Crash / error 監控：DSN 從環境變數讀取（沿用專案 EXPO_PUBLIC_ 慣例）
// 未設定 DSN 時不啟用，避免本機 / 未配置環境噴錯
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__, // 只在 production build 回報，避免開發雜訊
    tracesSampleRate: 0, // 只做 error/crash，不做 performance tracing，省免費額度
    attachViewHierarchy: true, // crash 當下附加 view 階層樹，助於定位 native view 相關崩潰
  });
}

const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";
const Stack = createStackNavigator();

const getRedirectUrl = () => "https://to-do-mvp.vercel.app";
const getAppDisplayName = () => "TaskCal";
const APP_START_TIME = Date.now();

// 掛在 App 根層級（不會像 SplashScreen 一樣被 navigation.reset() 卸載），
// 確保 session 過期時無論使用者停留在哪個畫面都能收到 SIGNED_OUT/TOKEN_REFRESH_FAILED
// 並被導回登入頁。navigate 需透過 ref 呼叫，因為這段邏輯在 NavigationContainer 之外。
const navigationRef = createNavigationContainerRef();

function App() {
  const [fontsLoaded] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

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

  const systemColorScheme = useColorScheme();

  const {
    updateInfo,
    setUpdateInfo,
    isUpdateModalVisible,
    setIsUpdateModalVisible,
    isSimulatingUpdate,
    setIsSimulatingUpdate,
  } = useVersionCheck(language);

  const initialRoute = useInitialRoute();
  const fontTimeout = useFontTimeout(3000);

  useWebSetup(getAppDisplayName());

  // setLanguage: save to Supabase + AsyncStorage fallback
  const setLanguage = useCallback(async (lang) => {
    console.log(`🌐 Setting language to: ${lang}`);
    setLanguageState(lang);

    versionService.clearCache();
    console.log("🗑️ Version cache cleared for language change");

    try {
      const result = await UserService.updateUserSettings({ language: lang });
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
        console.warn("⚠️ Network error saving language to Supabase:", error.message);
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
  }, [setLanguageState]);

  // setThemeMode: save to Supabase
  const setThemeMode = useCallback(async (mode) => {
    console.log(`🎨 Setting theme to: ${mode}`);
    setThemeModeState(mode);

    try {
      const result = await UserService.updateUserSettings({ theme: mode });
      console.log("✅ Theme saved to Supabase:", result);
    } catch (error) {
      console.error("❌ Error saving theme to Supabase:", error);
    }
  }, [setThemeModeState]);

  const toggleTheme = useCallback(() => {
    const newMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(newMode);
  }, [themeMode, setThemeMode]);

  const t = translations[language] || translations.en;

  // 啟動時若使用者已開啟「每日待辦提醒」，依目前語言重新確保排程（idempotent）。
  // 固定 identifier 保證不會重複；重裝/重啟/換語言後仍持續且文字正確。
  useEffect(() => {
    if (loadingLang) return;
    let cancelled = false;
    (async () => {
      try {
        const enabled = await AsyncStorage.getItem(DAILY_SUMMARY_ENABLED_KEY);
        if (!cancelled && enabled === "true") {
          await scheduleDailySummaryNotification(t);
        }
      } catch (error) {
        console.error("Error re-arming daily summary notification:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingLang, language]);

  // Session 失效時的清理與導回登入頁：掛在 App 根層級，確保無論使用者
  // 停留在哪個畫面（SplashScreen 早已因登入成功被 navigation.reset() 卸載）
  // 都能收到通知並正確登出，不會卡在已失效的 session 上。
  useEffect(() => {
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "TOKEN_REFRESH_FAILED") {
          console.log("[Auth] Token refresh failed, signing out...");
          dataPreloadService.clearCache();
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (e) {
            // Ignore sign-out errors; SIGNED_OUT event will handle cleanup/navigation
          }
        } else if (event === "SIGNED_OUT") {
          dataPreloadService.clearCache();
          widgetService.clearWidgetData().catch((error) => {
            console.error("Failed to clear widget data on sign out:", error);
          });

          // OAuth 登入流程中途可能觸發一次 SIGNED_OUT（例如換 token 失敗後重新登入），
          // 緊接著的 SIGNED_IN 會自己導向 MainTabs，這裡不用搶著導回登入頁
          if (
            Platform.OS === "web" &&
            typeof window !== "undefined" &&
            sessionStorage.getItem("oauth_in_progress") === "true"
          ) {
            return;
          }

          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: "Splash" }],
            });
          }
        }
      },
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const actualThemeMode = useMemo(() => {
    if (themeMode === "auto") {
      const systemTheme = systemColorScheme || Appearance.getColorScheme() || "light";
      console.log(`🎨 [Auto Mode] systemColorScheme: ${systemColorScheme}, Appearance.getColorScheme(): ${Appearance.getColorScheme()}, final: ${systemTheme}`);
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = getTheme(actualThemeMode);

  const showingSplash = ((!fontsLoaded || loadingLang || loadingTheme) && !fontTimeout) ||
      initialRoute === null;

  if (!showingSplash && !App._loggedReady) {
    App._loggedReady = true;
    console.log(`⏱️ [App] Time to interactive: ${Date.now() - APP_START_TIME}ms`);
  }

  if (showingSplash) {
    const isDark = systemColorScheme === "dark";
    const bg = isDark ? "#14182A" : "#F2F1EB";
    const iconBg = isDark ? "#8B98D0" : "#3B4B7A";
    const iconColor = isDark ? "#14182A" : "#F2F1EB";
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
        <View style={{
          width: 108, height: 108, borderRadius: 24,
          backgroundColor: iconBg,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
        }}>
          <Svg width={56} height={56} viewBox="0 0 24 24">
            <Path d="M8 3 V6 M16 3 V6" fill="none" stroke={iconColor} strokeWidth="1.6" strokeLinecap="round"/>
            <Rect x="3.5" y="5.5" width="17" height="15" rx="2" fill="none" stroke={iconColor} strokeWidth="1.7"/>
            <Path d="M7.5 13.5 l3 3 6.5-6.5" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </View>
      </View>
    );
  }

  // 三個 Context 的 value 各自 useMemo：避免任何一個 App 層 state 變動
  // （例如 useVersionCheck 非同步設定 updateInfo）就讓全部下游 consumer 重新 render。
  const themeContextValue = useMemo(
    () => ({ theme, themeMode, setThemeMode, toggleTheme, loadTheme }),
    [theme, themeMode, setThemeMode, toggleTheme, loadTheme]
  );

  const userContextValue = useMemo(
    () => ({
      userType,
      loadingUserType,
      setUserType: setUserTypeState,
      loadUserType,
      setUpdateInfo,
      setIsUpdateModalVisible,
      isSimulatingUpdate,
      setIsSimulatingUpdate,
    }),
    [
      userType,
      loadingUserType,
      setUserTypeState,
      loadUserType,
      setUpdateInfo,
      setIsUpdateModalVisible,
      isSimulatingUpdate,
      setIsSimulatingUpdate,
    ]
  );

  const languageContextValue = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary
      language={language}
      onError={(error) => {
        if (SENTRY_DSN) Sentry.captureException(error);
      }}
    >
    <ThemeContext.Provider value={themeContextValue}>
      <UserContext.Provider value={userContextValue}>
        <LanguageContext.Provider value={languageContextValue}>
          <NavigationContainer
            ref={navigationRef}
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
              <Stack.Screen name="Terms" component={TermsScreen} />
              <Stack.Screen name="Privacy" component={PrivacyScreen} />
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
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
