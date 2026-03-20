import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Localization from "expo-localization";
import * as Constants from "expo-constants";
import { getCurrentEnvironment } from "./src/config/environment";
import appConfig from "./app.config";
import { mixpanelService } from "./src/services/mixpanelService";
import { widgetService } from "./src/services/widgetService";
import { useResponsive } from "./src/hooks/useResponsive";
import { ResponsiveContainer } from "./src/components/ResponsiveContainer";
import { MapPreview } from "./src/components/MapPreview";
import { format } from "date-fns";
import {
  formatTimestamp,
  formatTimeDisplay as formatTimeDisplayUtil,
} from "./src/utils/dateUtils";
import { translations } from "./src/locales";
import { BlurView } from "expo-blur";

// Screen imports
import CalendarScreen from "./src/screens/CalendarScreen";
import SettingScreen from "./src/screens/SettingScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import TermsScreen from "./src/screens/TermsScreen";
import PrivacyScreen from "./src/screens/PrivacyScreen";

// 獲取重定向 URL
// 獲取重定向 URL
const getRedirectUrl = () => {
  return "https://to-do-mvp.vercel.app";
};

const getAppDisplayName = () => {
  return "TaskCal";
};

import Svg, { Path, Circle, Rect, Line, Ellipse } from "react-native-svg";
import ReactGA from "react-ga4";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
// expo-store-review is a native module, may not be available in Expo Go
let StoreReview = null;
try {
  StoreReview = require("expo-store-review");
} catch (e) {
  console.warn(
    "expo-store-review not available, will use web browser fallback",
  );
}
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Image,
  PanResponder,
  Animated,
  Linking,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  useColorScheme,
  Appearance,
} from "react-native";

// 🚨 CRITICAL: Handle OAuth callback IMMEDIATELY before React initializes
// This ensures the redirect happens as fast as possible
// NOTE: Only redirect to native app if OAuth was initiated from native app
// For pure web OAuth, let the normal flow handle it
if (Platform.OS === "web" && typeof window !== "undefined") {
  const currentUrl = window.location.href;
  const url = new URL(currentUrl);

  // Check if this is an OAuth callback
  // Supabase may redirect to root path or /auth/callback, so check for OAuth params anywhere
  const isOAuthCallback =
    (url.pathname.includes("/auth/callback") || url.pathname === "/") &&
    (url.hash.includes("access_token") ||
      url.search.includes("code=") ||
      url.hash.includes("code="));

  // For web OAuth callbacks, check if this should redirect to native app
  // This happens when OAuth was initiated from native app but Supabase redirected to web URL first
  // We detect this by checking if the redirect URL in Supabase config points to app scheme
  // For pure web OAuth (initiated from web), we should process it directly
  if (isOAuthCallback) {
    // Check if this might be from native app by checking if Supabase redirect URL includes app scheme
    // If OAuth was initiated from native app, Supabase might redirect to web URL first,
    // then we need to redirect back to native app
    // For pure web OAuth, Supabase redirects directly to web URL and we process it here

    // Determine the correct URL scheme based on environment/domain
    const envScheme = process.env.NEXT_PUBLIC_APP_SCHEME;
    let appScheme = envScheme || "taskcal";

    // Check if this is likely from native app by checking referrer or user agent
    // For localhost, always treat as web OAuth (not from native app)
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";

    const mightBeFromNativeApp =
      !isLocalhost &&
      (sessionStorage.getItem("oauth_from_native") === "true" ||
        // Only check referrer/user agent if not localhost
        (document.referrer === "" && navigator.userAgent.includes("Mobile")));

    // For web OAuth, if there's no clear indicator it's from native app, process it directly
    // Only redirect to native app if we're confident it came from native app
    if (mightBeFromNativeApp) {
      // Build redirect URL
      let redirectUrl;
      if (url.hash.includes("access_token")) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const expiresIn = hashParams.get("expires_in");
        const tokenType = hashParams.get("token_type");

        redirectUrl = `${appScheme}://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=${expiresIn}&token_type=${tokenType}`;
      } else if (url.search.includes("code=")) {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") || "";
        redirectUrl = `${appScheme}://auth/callback?code=${code}&state=${state}`;
      }

      if (redirectUrl) {
        // Try redirect, but if it fails (pure web OAuth), let normal flow handle it
        try {
          window.location.href = redirectUrl;
          // Show a message to the user
          setTimeout(() => {
            document.body.innerHTML =
              '<div style="font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;"><div style="font-size: 20px; margin-bottom: 20px;">Login successful!</div><div style="font-size: 16px; color: #666;">Please return to the TaskCal app.</div></div>';
          }, 100);
        } catch (e) {
          // If redirect fails, it's probably pure web OAuth, let normal flow handle it
        }
      }
    } else {
      // Pure web OAuth - let the normal OAuth callback handler process it
      // This ensures web OAuth works correctly without trying to redirect to native app
    }
  }
}

// Global error handler for uncaught errors
if (Platform.OS !== "web") {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError("[ERROR]", ...args);
  };

}

import { supabase } from "./supabaseClient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Services
import { TaskService } from "./src/services/taskService";
import { UserService } from "./src/services/userService";
import { dataPreloadService } from "./src/services/dataPreloadService";
import {
  registerForPushNotificationsAsync,
  scheduleTaskNotification,
  cancelTaskNotification,
  cancelAllNotifications,
} from "./src/services/notificationService";
import * as Notifications from "expo-notifications";

// Notification Config
import { getActiveReminderMinutes } from "./src/config/notificationConfig";
import { versionService } from "./src/services/versionService";
import { getUpdateUrl } from "./src/config/updateUrls";
import VersionUpdateModal from "./src/components/VersionUpdateModal";
import * as Updates from "expo-updates";

// Theme Config
import { getTheme, lightTheme, darkTheme } from "./src/config/theme";

// Ad Components (conditionally imported for native only)
let AdBanner;
let AdService = null;
if (Platform.OS !== "web") {
  AdBanner = require("./src/components/AdBanner").default;
  AdService = require("./src/services/adService").default;
} else {
  // Fallback component for web
  AdBanner = () => null;
}

// Storage
import AsyncStorage from "@react-native-async-storage/async-storage";

// Navigation
import {
  NavigationContainer,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
const TabView = Platform.OS !== "web" ? require("react-native-bottom-tabs").default : null;

// UI Components
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
  Swipeable,
} from "react-native-gesture-handler";
import DateTimePicker from "@react-native-community/datetimepicker";

// Fonts
import { useFonts } from "expo-font";
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_700Bold,
} from "@expo-google-fonts/noto-sans-tc";

const TASKS_STORAGE_KEY = "TASKS_STORAGE_KEY";
const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";

// Translations are now imported from src/locales/
// See src/locales/index.js for translation structure

// Import and re-export contexts from separate file to avoid circular dependencies
import { LanguageContext, ThemeContext, UserContext } from "./src/contexts";
export { LanguageContext, ThemeContext, UserContext };

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 格式化時間為 HH:MM（移除秒數）
// 使用工具文件中的函數，保持向後兼容
const formatTimeDisplay = formatTimeDisplayUtil;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
import { isIOS26Plus } from "./src/utils/platform";

const SplashScreen = ({ navigation }) => {
  const { theme, themeMode, loadTheme: reloadTheme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { loadUserType } = useContext(UserContext);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAppleSigningIn, setIsAppleSigningIn] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Check if Apple Authentication is available
  useEffect(() => {
    const checkAppleAvailability = async () => {
      if (Platform.OS === "ios") {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setIsAppleAvailable(isAvailable);
        } catch (error) {
          console.error(
            "Error checking Apple Authentication availability:",
            error,
          );
          setIsAppleAvailable(false);
        }
      } else {
        setIsAppleAvailable(false);
      }
    };
    checkAppleAvailability();
  }, []);

  useEffect(() => {
    // Handle OAuth callback if this is a redirect from OAuth
    const handleOAuthCallback = async () => {
      try {
        // Only handle OAuth callback on web platform
        if (Platform.OS !== "web" || typeof window === "undefined") {
          return;
        }

        // Check if we should redirect to native app
        // This should ONLY happen if OAuth was initiated from a native app
        // For pure web OAuth, we should process it directly here
        const url = new URL(window.location.href);
        const hasOAuthParams =
          (url.pathname.includes("auth/callback") || url.pathname === "/") &&
          (url.hash.includes("access_token") ||
            url.search.includes("code=") ||
            url.hash.includes("code="));

        // Check if this is from a native app by checking referrer or sessionStorage
        // If OAuth was initiated from web, there should be no need to redirect to native app
        const isFromNativeApp =
          sessionStorage.getItem("oauth_from_native") === "true" ||
          document.referrer.includes("mobile") ||
          navigator.userAgent.includes("Mobile");

        if (hasOAuthParams && isFromNativeApp) {
          // Determine the correct URL scheme based on environment/domain
          const envScheme = process.env.NEXT_PUBLIC_APP_SCHEME;
          let appScheme = envScheme || "taskcal";

          // Extract auth params from URL
          let redirectUrl;
          if (url.hash.includes("access_token")) {
            // Hash fragment with tokens
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const expiresIn = hashParams.get("expires_in");
            const tokenType = hashParams.get("token_type");

            redirectUrl = `${appScheme}://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=${expiresIn}&token_type=${tokenType}`;
          } else if (url.search.includes("code=")) {
            // Query params with code
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state") || "";
            redirectUrl = `${appScheme}://auth/callback?code=${code}&state=${state}`;
          }

          if (redirectUrl) {
            try {
              window.location.href = redirectUrl;
              // Show user message after attempting redirect
              setTimeout(() => {
                alert(
                  "Please return to the TaskCal app. The login was successful!",
                );
              }, 1000);
              return;
            } catch (redirectError) {
              console.error(
                "OAuth callback: Failed to redirect to native app:",
                redirectError,
              );
            }
          }
        } else if (hasOAuthParams) {
          // Process the OAuth callback for web
          try {
            // If we have a code, exchange it for session
            if (url.search.includes("code=")) {
              const code = url.searchParams.get("code");

              const { data: sessionData, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code);

              if (exchangeError) {
                console.error(
                  "OAuth callback: Code exchange failed:",
                  exchangeError,
                );
              } else if (sessionData?.session) {
                console.log(
                  "OAuth callback: ✅ Session established successfully!",
                );
                // Clear URL params and navigate
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname,
                );
                // Navigation will be handled by auth state listener
              }
            } else if (url.hash.includes("access_token")) {
              // Direct token flow
              const hashParams = new URLSearchParams(url.hash.substring(1));
              const accessToken = hashParams.get("access_token");
              const refreshToken = hashParams.get("refresh_token");

              if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (!sessionError) {
                  console.log("OAuth callback: ✅ Session set successfully!");
                  // Clear URL hash and navigate
                  window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                  );
                  // Navigation will be handled by auth state listener
                }
              }
            }
          } catch (error) {
            console.error("OAuth callback: Error processing web OAuth:", error);
          }
        }

        // Check for OAuth errors in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const oauthError = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        if (oauthError) {
          console.error("OAuth callback: OAuth error detected:", {
            error: oauthError,
            errorCode: urlParams.get("error_code"),
            errorDescription: decodeURIComponent(errorDescription || ""),
          });

          // Handle specific database error
          if (
            oauthError === "server_error" &&
            errorDescription?.includes("Database error saving new user")
          ) {
            console.error(
              "OAuth callback: Database error - new user cannot be saved",
            );
            console.error("Full OAuth error details:", {
              error: oauthError,
              errorCode: urlParams.get("error_code"),
              errorDescription: decodeURIComponent(errorDescription || ""),
              fullUrl:
                Platform.OS === "web" && typeof window !== "undefined"
                  ? window.location.href
                  : "N/A",
            });

            // Try to handle the error gracefully by attempting to create user settings manually
            try {
              // The user might still be authenticated even if database setup failed
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (user) {
                // Try to create user settings manually
                const { error: settingsError } = await supabase
                  .from("user_settings")
                  .upsert({
                    user_id: user.id,
                    language: "en",
                    theme: "light",
                    notifications_enabled: true,
                  });

                if (settingsError) {
                  console.error(
                    "Failed to create user settings:",
                    settingsError,
                  );
                  console.error("Settings error details:", {
                    message: settingsError.message,
                    details: settingsError.details,
                    hint: settingsError.hint,
                    code: settingsError.code,
                  });

                  // Try to get more detailed error information
                  console.error(
                    "Full settings error object:",
                    JSON.stringify(settingsError, null, 2),
                  );

                  // Check if user_settings table exists and is accessible
                  const { data: tableCheck, error: tableError } = await supabase
                    .from("user_settings")
                    .select("id")
                    .limit(1);

                  alert(t.accountCreatedPartial);
                } else {
                  alert(t.accountCreatedSuccess);
                }

                // Navigate to main app even if there were some issues
                navigateToMainApp({ focusToday: true });
                return;
              }
            } catch (manualError) {
              console.error("Manual user creation failed:", manualError);
            }

            alert(
              "Unable to create new user account. Please contact support or try with a different Google account.",
            );
            return;
          }

          // Handle other OAuth errors
          alert(
            `Authentication error: ${decodeURIComponent(
              errorDescription || oauthError,
            )}`,
          );
          return;
        }

        // First, try to get the session from the URL if this is an OAuth callback
        const { data, sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("OAuth callback: Error getting session:", sessionError);
          return;
        }

        if (data?.session) {
          // Force a refresh of the auth state
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error(
              "OAuth callback: Failed to get user after OAuth:",
              userError,
            );
            return;
          }

          navigateToMainApp({ focusToday: true });
        } else {

          // Add fallback mechanisms for incognito mode or session issues

          // Try to get session with a delay (sometimes it takes time to propagate)
          setTimeout(async () => {
            try {
              const { data: fallbackData, error: fallbackError } =
                await supabase.auth.getSession();
              if (fallbackData?.session) {
                navigateToMainApp({ focusToday: true });
                return;
              }

              // Try one more time with getUser
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();
              if (user && !userError) {
                navigateToMainApp({ focusToday: true });
                return;
              }
            } catch (fallbackError) {
              console.error("Fallback session recovery failed:", fallbackError);
            }
          }, 2000);

          // Try again after 5 seconds
          setTimeout(async () => {
            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();
              if (user && !userError) {
                navigateToMainApp({ focusToday: true });
                return;
              }
            } catch (finalError) {
              console.error("Final fallback failed:", finalError);
            }
          }, 5000);
        }
      } catch (error) {
        console.error("OAuth callback: Error handling OAuth callback:", error);
      }
    };

    // Navigate to main app
    const navigateToMainApp = (options = {}) => {
      console.log("📍 [navigateToMainApp] Function called", options);

      if (hasNavigated && !options.focusToday) {
        console.log("📍 [navigateToMainApp] ⚠️ Already navigated, skipping");
        return;
      }

      if (!navigation) {
        console.error(
          "📍 [navigateToMainApp] ❌ Navigation object is not available",
        );
        return;
      }

      // Check if already in MainTabs to avoid resetting navigation
      const currentRoute =
        navigation.getState?.()?.routes?.[navigation.getState?.()?.index];
      if (currentRoute?.name === "MainTabs" && !options.focusToday) {
        console.log(
          "📍 [navigateToMainApp] ⚠️ Already in MainTabs, skipping reset to preserve current tab",
        );
        setHasNavigated(true);
        return;
      }

      console.log(
        "📍 [navigateToMainApp] Navigation object exists, attempting reset...",
      );

      try {
        setHasNavigated(true);
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "MainTabs",
              params: options.focusToday
                ? { screen: "Calendar", params: { focusToday: true } }
                : undefined,
            },
          ],
        });
        console.log("📍 [navigateToMainApp] ✅ Navigation reset successful!");
      } catch (error) {
        console.error("📍 [navigateToMainApp] ❌ Navigation error:", error);
        console.error("📍 [navigateToMainApp] Error stack:", error.stack);
        setHasNavigated(false); // Reset flag on error
      }
    };

    // Set up auth state change listener
    const { data: { subscription: authSubscription } = {} } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", { event, session });

        if (
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED"
        ) {
          try {
            console.log(`Processing ${event} event...`);

            // If we already have a session from the event, use it
            let currentSession = session;

            // If no session from event, try to get it
            if (!currentSession) {
              console.log("No session in event, fetching from Supabase...");
              const {
                data: { session: fetchedSession },
                error: sessionError,
              } = await supabase.auth.getSession();

              if (sessionError) {
                console.error("Error getting current session:", sessionError);
                return;
              }

              currentSession = fetchedSession;
            }

            if (!currentSession) {
              console.log("No session available after auth state change");
              return;
            }

            console.log("Session found, verifying user...");
            console.log("Session user email:", currentSession.user?.email);

            // Use user directly from session to avoid API call issues
            const user = currentSession.user;

            if (!user) {
              console.error("❌ No user in session");
              return;
            }

            console.log("✅ User verified from session!");
            console.log("User email:", user.email);
            console.log("User ID:", user.id);

            // Mixpanel: 識別使用者並追蹤登入事件
            mixpanelService.identify(user.id, {
              $email: user.email,
              $name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0],
              $avatar: user.user_metadata?.avatar_url,
              email: user.email,
              name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0],
              platform: Platform.OS,
            });
            mixpanelService.track("User Signed In", {
              method: event === "SIGNED_IN" ? "new_signin" : "existing_session",
              email: user.email,
              platform: Platform.OS,
            });

            // 更新用戶平台資訊（不阻止登入流程）
            UserService.updatePlatformInfo()
              .then(() => {
                console.log("📱 Platform info updated successfully");
              })
              .catch((platformError) => {
                console.error(
                  "❌ Error updating platform info:",
                  platformError,
                );
              });

            // 立即開始預載入所有數據（不等待完成，在背景執行）
            dataPreloadService.preloadAllData().catch((preloadError) => {
              console.error("❌ Error preloading data:", preloadError);
            });

            // 新登入時在背景載入 theme，不阻塞導向（避免 getUserSettings 卡住時整頁卡 5 秒）
            if (event === "SIGNED_IN" && reloadTheme) {
              reloadTheme().catch((themeError) => {
                console.error(
                  "❌ Error reloading theme after login:",
                  themeError,
                );
              });
            }

            // 登入／session 建立後立即更新 UserContext 的 user_type，讓廣告依身份正確顯示（無需先進設定頁）
            if (loadUserType) {
              loadUserType().catch((userTypeError) => {
                console.error(
                  "❌ Error loading user type after auth:",
                  userTypeError,
                );
              });
            }

            // 導向主畫面後才關閉 Signing in，避免按鈕已還原但畫面還卡住
            console.log("🚀 Navigating to main app...");
            if (!hasNavigated) {
              setIsSigningIn(false);
              setIsAppleSigningIn(false);
              navigateToMainApp({ focusToday: true });
            } else {
              setIsSigningIn(false);
              setIsAppleSigningIn(false);
              console.log("⚠️ Navigation skipped - already navigated");
            }
          } catch (error) {
            console.error("Error in auth state change handler:", error);
          }
        } else if (event === "TOKEN_REFRESH_FAILED") {
          // Refresh token is invalid or expired — clear local session and sign out
          console.log("[Auth] Token refresh failed, signing out...");
          dataPreloadService.clearCache();
          setHasNavigated(false);
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (e) {
            // Ignore sign-out errors; SIGNED_OUT event will handle navigation
          }
        } else if (event === "SIGNED_OUT") {
          // 清除預載入緩存
          dataPreloadService.clearCache();

          // Navigate back to splash screen when user logs out
          setHasNavigated(false); // Reset navigation flag
          navigation.reset({
            index: 0,
            routes: [{ name: "Splash" }],
          });
        }
      });

    // Listen for custom auth success event from deep link handling
    const handleCustomAuthSuccess = (event) => {
      console.log("Custom auth success event received:", event.detail);
      navigateToMainApp({ focusToday: true });
    };

    // Add event listener for custom auth success (web only)
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("supabase-auth-success", handleCustomAuthSuccess);
    }

    // Cleanup auth subscription on unmount
    const cleanupAuthSubscription = () => {
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
      // Remove custom event listener (web only)
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener(
          "supabase-auth-success",
          handleCustomAuthSuccess,
        );
      }
    };

    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const seen = await AsyncStorage.getItem("onboarding_completed");
        if (!seen) {
          navigation.replace("Onboarding");
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[checkSession] Error getting session:", error);
          return;
        }

        if (session) {
          console.log("[checkSession] Existing session found!");
          console.log("[checkSession] Session user ID:", session.user?.id);
          console.log(
            "[checkSession] Session expires at:",
            new Date(session.expires_at * 1000).toISOString(),
          );

          // Check if session is expired
          const now = Math.floor(Date.now() / 1000);
          const isSessionExpired =
            session.expires_at && session.expires_at < now;

          if (isSessionExpired) {
            console.log(
              "[checkSession] Session expired, attempting refresh...",
            );
            // Try to refresh the session
            const {
              data: { session: refreshedSession },
              error: refreshError,
            } = await supabase.auth.refreshSession();

            if (refreshError || !refreshedSession) {
              console.error(
                "[checkSession] Failed to refresh expired session:",
                refreshError,
              );
              console.log(
                "[checkSession] Session expired, navigating to today page...",
              );
              // Session expired, navigate to MainTabs with today focus
              if (!hasNavigated) {
                navigateToMainApp({ focusToday: true });
              }
              return;
            }

            // Session refreshed successfully, continue with refreshed session
            console.log("[checkSession] Session refreshed successfully");
          }

          // Verify the user is still valid
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error(
              "[checkSession] Session invalid or user not found:",
              userError,
            );
            console.error(
              "[checkSession] Attempting to clear invalid session...",
            );
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error("[checkSession] Error signing out:", signOutError);
            }
            return;
          }

          console.log("[checkSession] User verified:", {
            id: user.id,
            email: user.email,
            provider: user.app_metadata?.provider,
          });

          // 立即開始預載入所有數據（不等待完成，在背景執行）
          dataPreloadService.preloadAllData().catch((preloadError) => {
            console.error("❌ Error preloading data:", preloadError);
          });

          console.log("[checkSession] Navigating to main app...");
          // Check if already navigated to prevent double navigation
          if (!hasNavigated) {
            navigateToMainApp({ focusToday: true });
          } else {
            console.log(
              "⚠️ [checkSession] Navigation skipped - already navigated",
            );
          }
        } else {
          console.log(
            "[checkSession] No existing session found, showing login screen",
          );
        }
      } catch (error) {
        console.error("[checkSession] Unexpected error:", error);
        console.error("[checkSession] Error stack:", error.stack);
      }
    };

    // Handle deep linking for OAuth redirects
    const handleDeepLink = async (event) => {
      if (event?.url) {
        console.log("🔗🔗🔗 [App.js Deep Link] Received:", event.url);

        // Check if this is an auth callback
        const isAuthCallback =
          event.url.includes("auth/callback") ||
          event.url.includes("access_token=") ||
          event.url.includes("code=") ||
          event.url.includes("error=");

        if (isAuthCallback) {
          console.log("🔗🔗🔗 [App.js Deep Link] Auth callback detected!");

          try {
            // Parse the URL - handle custom scheme URLs
            let params;
            if (event.url.includes("#")) {
              // Hash parameters (direct token flow)
              const hashPart = event.url.split("#")[1];
              params = new URLSearchParams(hashPart);
              console.log("🔗🔗🔗 [App.js Deep Link] Parsing from hash");
            } else if (event.url.includes("?")) {
              // Query parameters (PKCE flow)
              const queryPart = event.url.split("?")[1];
              params = new URLSearchParams(queryPart);
              console.log("🔗🔗🔗 [App.js Deep Link] Parsing from query");
            } else {
              console.error(
                "🔗🔗🔗 [App.js Deep Link] No parameters found in URL",
              );
              return;
            }

            const code = params.get("code");
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            const error = params.get("error");

            console.log("🔗🔗🔗 [App.js Deep Link] Params:", {
              hasCode: !!code,
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              hasError: !!error,
            });

            if (error) {
              console.error("🔗🔗🔗 [App.js Deep Link] OAuth error:", error);
              Alert.alert(
                "Authentication Error",
                params.get("error_description") || error,
              );
              return;
            }

            if (code) {
              // PKCE flow - exchange code for session
              console.log(
                "🔗🔗🔗 [App.js Deep Link] Exchanging code for session...",
              );

              const { data, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code);

              if (exchangeError) {
                console.error(
                  "🔗🔗🔗 [App.js Deep Link] ❌ Code exchange failed:",
                  exchangeError,
                );
                Alert.alert(
                  "Authentication Error",
                  "Failed to complete sign in. Please try again.",
                );
                return;
              }

              console.log(
                "🔗🔗🔗 [App.js Deep Link] ✅ Code exchanged successfully!",
              );
              console.log(
                "🔗🔗🔗 [App.js Deep Link] Session user:",
                data?.session?.user?.email,
              );

              // Wait for session to be fully established and onAuthStateChange to trigger
              // Don't navigate here - let auth state listener handle it
              console.log(
                "🔗🔗🔗 [App.js Deep Link] ⏳ Waiting for auth state listener to navigate...",
              );
              console.log(
                "🔗🔗🔗 [App.js Deep Link] (SIGNED_IN event should trigger navigation)",
              );

              // Wait a moment for onAuthStateChange to fire
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Fallback: If navigation hasn't happened after 2 seconds, navigate manually
              setTimeout(() => {
                if (!hasNavigated) {
                  console.log(
                    "🔗🔗🔗 [App.js Deep Link] Fallback: Navigating to main app...",
                  );
                  navigateToMainApp({ focusToday: true });
                }
              }, 2000);
            } else if (accessToken && refreshToken) {
              // Direct token flow
              console.log(
                "🔗🔗🔗 [App.js Deep Link] Setting session with tokens...",
              );

              const { data, error: sessionError } =
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

              if (sessionError) {
                console.error(
                  "🔗🔗🔗 [App.js Deep Link] ❌ Set session failed:",
                  sessionError,
                );
                Alert.alert(
                  "Authentication Error",
                  "Failed to complete sign in. Please try again.",
                );
                return;
              }

              console.log(
                "🔗🔗🔗 [App.js Deep Link] ✅ Session set successfully!",
              );

              // Wait for session to be fully established and onAuthStateChange to trigger
              // Don't navigate here - let auth state listener handle it
              console.log(
                "🔗🔗🔗 [App.js Deep Link] ⏳ Waiting for auth state listener to navigate...",
              );
              console.log(
                "🔗🔗🔗 [App.js Deep Link] (SIGNED_IN event should trigger navigation)",
              );

              // Wait a moment for onAuthStateChange to fire
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Fallback: If navigation hasn't happened after 2 seconds, navigate manually
              setTimeout(() => {
                if (!hasNavigated) {
                  console.log(
                    "🔗🔗🔗 [App.js Deep Link] Fallback: Navigating to main app...",
                  );
                  navigateToMainApp({ focusToday: true });
                }
              }, 2000);
            } else {
              console.error(
                "🔗🔗🔗 [App.js Deep Link] No code or tokens found in callback",
              );
            }
          } catch (error) {
            console.error(
              "🔗🔗🔗 [App.js Deep Link] ❌ Error handling deep link:",
              error,
            );
            console.error(
              "🔗🔗🔗 [App.js Deep Link] Error stack:",
              error.stack,
            );
          }
        } else {
          console.log(
            "🔗🔗🔗 [App.js Deep Link] Not an auth callback, ignoring",
          );
        }
      }
    };

    // Check for initial URL if this is a web app
    const checkInitialUrl = async () => {
      if (Platform.OS === "web") {
        const url = new URL(window.location.href);
        // Check for OAuth callback in URL (hash or pathname)
        const hasAuthCallback =
          url.pathname.includes("auth/callback") ||
          url.hash.includes("access_token") ||
          url.hash.includes("error=") ||
          url.search.includes("code=");

        if (hasAuthCallback) {
          console.log("Initial URL is an auth callback:", url.href);
          console.log(
            "OAuth callback already handled at module level, skipping",
          );
          return;
        }
      } else {
        // For mobile, check if app was launched with a deep link
        console.log("Mobile platform detected, checking for initial URL...");

        try {
          const initialUrl = await Linking.getInitialURL();
          console.log("Initial URL:", initialUrl || "None");

          if (
            initialUrl &&
            (initialUrl.includes("auth/callback") ||
              initialUrl.includes("code=") ||
              initialUrl.includes("access_token="))
          ) {
            console.log("🔗🔗🔗 [App.js] App launched with auth callback URL!");
            // Process the deep link
            await handleDeepLink({ url: initialUrl });
            return;
          }
        } catch (error) {
          console.error("Error getting initial URL:", error);
        }

        // If no auth callback in initial URL, check for existing session with retry
        console.log("No auth callback in initial URL, checking for session...");

        // Try multiple times with delays to handle OAuth callback timing
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`Session check attempt ${attempt}/3...`);

            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              console.error(
                `Error checking session (attempt ${attempt}):`,
                error,
              );
            } else if (session) {
              console.log(
                `Mobile: Session found on attempt ${attempt}, navigating to main app`,
              );

              // 立即開始預載入所有數據（不等待完成，在背景執行）
              dataPreloadService.preloadAllData().catch((preloadError) => {
                console.error("❌ Error preloading data:", preloadError);
              });

              // Check if already in MainTabs to avoid resetting navigation
              const currentRoute =
                navigation.getState?.()?.routes?.[
                  navigation.getState?.()?.index
                ];
              if (currentRoute?.name !== "MainTabs") {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs" }],
                });
              } else {
                console.log(
                  "⚠️ [checkSession] Already in MainTabs, skipping reset to preserve current tab",
                );
              }
              return;
            } else {
              console.log(`No session found on attempt ${attempt}`);
            }

            // Wait before next attempt (except on last attempt)
            if (attempt < 3) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt),
              );
            }
          } catch (error) {
            console.error(
              `Error in mobile session check (attempt ${attempt}):`,
              error,
            );
          }
        }

        console.log(
          "All session check attempts completed, proceeding to check existing session",
        );
      }

      // If not an auth callback, check for existing session
      await checkSession();
    };

    // Add deep link listener
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Initial check for session or auth callback
    checkInitialUrl();

    // Add multiple fallback checks for OAuth
    const fallbackChecks = [
      setTimeout(async () => {
        await checkSessionAndNavigate();
      }, 2000),

      setTimeout(async () => {
        await checkSessionAndNavigate();
      }, 5000),

      setTimeout(async () => {
        await checkSessionAndNavigate();
      }, 10000),
    ];

    const checkSessionAndNavigate = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Fallback: Error getting session:", sessionError);
          return;
        }

        if (session) {
          console.log("Fallback: Session found, verifying user...");
          // Verify the user before navigating
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error("Fallback: User verification failed:", userError);
            return;
          }

          console.log("Fallback: User verified, navigating to main app");
          navigateToMainApp({ focusToday: true });
          return true; // Success
        } else {
          return false;
        }
      } catch (error) {
        console.error("Fallback: Error in session check:", error);
        return false;
      }
    };

    // Cleanup
    return () => {
      // Clear all fallback timeouts
      fallbackChecks.forEach((timeoutId) => clearTimeout(timeoutId));
      if (subscription?.remove) {
        subscription.remove();
      } else if (subscription) {
        // Fallback for older React Native versions
        Linking.removeEventListener("url", handleDeepLink);
      }
      cleanupAuthSubscription();
    };
  }, [navigation]);

  // Add a debug effect to log navigation state changes
  useEffect(() => {
    // Check if navigation and addListener are available
    if (navigation && typeof navigation.addListener === "function") {
      const unsubscribe = navigation.addListener("state", (e) => {
      });
      return unsubscribe;
    }
    // Return empty cleanup function if addListener is not available
    return () => {};
  }, [navigation]);

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isSigningIn) {
      return;
    }

    setIsSigningIn(true);
    try {

      if (!supabase) {
        console.error("CRITICAL: Supabase client is NOT initialized");
        throw new Error("Supabase client is not initialized");
      }

      // First, check for an existing session
      const {
        data: { session: existingSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("CRITICAL: Error checking session:", sessionError);
        throw sessionError;
      }

      if (existingSession) {
        // Let the auth state change listener handle navigation
        return;
      }

      // Use the correct redirect URL for Expo
      const getRedirectUrl = () => {
        if (Platform.OS !== "web") {
          // For standalone apps (iOS), use app scheme directly
          // This allows OAuth to redirect directly back to the app
          const currentEnv = process.env.EXPO_PUBLIC_APP_ENV || "production";
          console.log(
            "🔍 DEBUG - Current environment for redirect:",
            currentEnv,
          );
          console.log(
            "🔍 DEBUG - All EXPO_PUBLIC env vars:",
            Object.keys(process.env).filter((key) =>
              key.startsWith("EXPO_PUBLIC"),
            ),
          );
          console.log(
            "🔍 DEBUG - EXPO_PUBLIC_APP_ENV value:",
            process.env.EXPO_PUBLIC_APP_ENV,
          );

          // Get app scheme based on environment
          // Use the same scheme as defined in app.config.js
          const appScheme = "taskcal";


          // Use app scheme for direct deep link
          return `${appScheme}://auth/callback`;
        }

        // For web, always return the current origin
        // Supabase will redirect back to the same page with auth tokens/code
        const currentOrigin = window.location.origin;

        // For web (both localhost and production), return current origin
        // This allows Supabase to redirect back to the same page with auth data
        return currentOrigin;
      };

      const redirectUrl = getRedirectUrl();

      // Debug: Log current window location for web
      if (Platform.OS === "web") {
      }

      // Start the OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
          skipBrowserRedirect: Platform.OS !== "web", // Skip browser redirect on mobile
        },
      });

      if (error) {
        console.error("CRITICAL: OAuth sign-in failed:", error);
        throw error;
      }

      if (data?.url) {
        if (Platform.OS === "web") {
          // For web, we need to redirect to the auth URL
          // Use window.location.replace to avoid back button issues (web only)
          if (
            Platform.OS === "web" &&
            typeof window !== "undefined" &&
            window.location
          ) {
            window.location.replace(data.url);
          }
        } else {
          // For mobile, use WebBrowser which handles deep links properly

          // Use WebBrowser.openAuthSessionAsync for OAuth flow
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
          );

          // ✅ KEY FIX: The result.url contains the OAuth callback URL
          // We need to manually process it since iOS doesn't automatically trigger the deep link
          if (result.type === "success" && result.url) {
            console.log(
              "🎯 [CRITICAL] WebBrowser returned with URL, processing manually...",
            );
            console.log("🎯 [CRITICAL] Returned URL:", result.url);

            // Parse and handle the OAuth callback URL directly
            try {
              let params = null;
              let code, accessToken, refreshToken, error;

              // Try query parameters first (PKCE flow)
              if (result.url.includes("?")) {
                const queryPart = result.url.split("?")[1].split("#")[0]; // Remove hash if present
                if (queryPart) {
                  params = new URLSearchParams(queryPart);
                  console.log("🎯 [CRITICAL] Parsing from query");
                  code = params.get("code");
                  accessToken = params.get("access_token");
                  refreshToken = params.get("refresh_token");
                  error = params.get("error");
                }
              }

              // If no params found in query, try hash (direct token flow)
              if (!code && !accessToken && result.url.includes("#")) {
                const hashPart = result.url.split("#")[1];
                if (hashPart && hashPart.trim()) {
                  params = new URLSearchParams(hashPart);
                  console.log("🎯 [CRITICAL] Parsing from hash");
                  code = params.get("code");
                  accessToken = params.get("access_token");
                  refreshToken = params.get("refresh_token");
                  error = params.get("error");
                }
              }

              if (params && (code || accessToken || error)) {
                console.log("🎯 [CRITICAL] OAuth params:", {
                  hasCode: !!code,
                  hasAccessToken: !!accessToken,
                  hasRefreshToken: !!refreshToken,
                  hasError: !!error,
                });

                if (error) {
                  console.error("🎯 [CRITICAL] OAuth error:", error);
                  Alert.alert(
                    "Authentication Error",
                    params.get("error_description") || error,
                  );
                  return;
                }

                if (code) {
                  // Exchange code for session
                  console.log("🎯 [CRITICAL] Exchanging code for session...");

                  const { data: sessionData, error: exchangeError } =
                    await supabase.auth.exchangeCodeForSession(code);

                  if (exchangeError) {
                    console.error(
                      "🎯 [CRITICAL] ❌ Code exchange failed:",
                      exchangeError,
                    );
                    Alert.alert(
                      "Authentication Error",
                      "Failed to complete sign in. Please try again.",
                    );
                    return;
                  }

                  console.log("🎯 [CRITICAL] ✅ Code exchanged successfully!");
                  console.log("🎯 [CRITICAL] Session:", {
                    hasSession: !!sessionData?.session,
                    userEmail: sessionData?.session?.user?.email,
                  });

                  // Don't navigate here - let auth state listener handle it
                  // exchangeCodeForSession triggers SIGNED_IN event which will navigate
                  console.log(
                    "🎯 [CRITICAL] ⏳ Waiting for auth state listener to navigate...",
                  );
                  console.log(
                    "🎯 [CRITICAL] (SIGNED_IN event should trigger navigation)",
                  );

                  setIsSigningIn(false);
                  return;
                } else if (accessToken && refreshToken) {
                  // Direct token flow
                  console.log("🎯 [CRITICAL] Setting session with tokens...");

                  const { data: sessionData, error: sessionError } =
                    await supabase.auth.setSession({
                      access_token: accessToken,
                      refresh_token: refreshToken,
                    });

                  if (sessionError) {
                    console.error(
                      "🎯 [CRITICAL] ❌ Set session failed:",
                      sessionError,
                    );
                    Alert.alert(
                      "Authentication Error",
                      "Failed to complete sign in. Please try again.",
                    );
                    return;
                  }

                  console.log("🎯 [CRITICAL] ✅ Session set successfully!");

                  // Don't navigate here - let auth state listener handle it
                  console.log(
                    "🎯 [CRITICAL] ⏳ Waiting for auth state listener to navigate...",
                  );

                  setIsSigningIn(false);
                  return;
                }
              }
            } catch (error) {
              console.error(
                "🎯 [CRITICAL] ❌ Error processing OAuth callback:",
                error,
              );
              Alert.alert(
                "Authentication Error",
                "Failed to process authentication. Please try again.",
              );
              return;
            }

            return;
          } else if (result.type === "cancel") {
            setIsSigningIn(false);
            // Don't show alert for cancel - user might have closed browser due to redirect issue
            return;
          } else if (result.type === "dismiss") {
            setIsSigningIn(false);
            return;
          }

          // If we get here, something unexpected happened
          console.error("VERBOSE: Unexpected result type:", result.type);

          // Give the deep link handler more time to process the callback
          // The auth state listener will handle navigation automatically
          const checkSessionWithRetry = async (
            attempt = 1,
            maxAttempts = 5,
          ) => {
            console.log(
              `[Auth Fallback] Session check attempt ${attempt}/${maxAttempts}...`,
            );

            const {
              data: { session: newSession },
              error: sessionCheckError,
            } = await supabase.auth.getSession();

            if (sessionCheckError) {
              console.error(
                "[Auth Fallback] Error checking session:",
                sessionCheckError,
              );
              if (attempt >= maxAttempts) {
                setIsSigningIn(false);
                Alert.alert(
                  "Authentication Error",
                  "Failed to complete sign in. Please try again.",
                );
              }
              return;
            }

            if (!newSession) {
              console.log(
                `[Auth Fallback] No session found on attempt ${attempt}`,
              );

              // Retry if we haven't reached max attempts
              if (attempt < maxAttempts) {
                const delay = 2000 * attempt; // Increasing delay: 2s, 4s, 6s, 8s
                setTimeout(
                  () => checkSessionWithRetry(attempt + 1, maxAttempts),
                  delay,
                );
              } else {
                console.error(
                  "[Auth Fallback] All attempts exhausted, no session found",
                );
                setIsSigningIn(false);
                Alert.alert(
                  "Sign In Issue",
                  "Authentication completed but session was not established. Please try signing in again.\n\nIf this persists, try restarting the app.",
                );
              }
            } else {
              console.log(
                `[Auth Fallback] ✅ Session found on attempt ${attempt}!`,
              );
              console.log("[Auth Fallback] User:", newSession.user?.email);

              // Manually trigger navigation if auth listener hasn't done it yet
              console.log("[Auth Fallback] Manually triggering navigation...");
              setIsSigningIn(false);
              navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
              });
            }
          };

          // Start checking after 2 seconds
          setTimeout(() => checkSessionWithRetry(1, 5), 2000);
        }
      } else {
      }
    } catch (error) {
      console.error("CRITICAL: Authentication Error:", {
        name: error?.name || "Unknown Error",
        message: error?.message || "No error message available",
        code: error?.code || "N/A",
        stack: error?.stack || "No stack trace available",
      });

      let errorMessage =
        "An unexpected error occurred during sign in. Please try again.";

      if (error?.message?.includes("popup_closed_by_user")) {
        errorMessage = "Sign in was cancelled. Please try again.";
      } else if (error?.message?.includes("network error")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (error?.message?.includes("invalid_grant")) {
        errorMessage = "Invalid credentials. Please try again.";
      } else if (error?.message?.includes("invalid_redirect_uri")) {
        errorMessage = `Invalid redirect URI. Please ensure ${redirectUrl} is added to your Supabase project's authorized redirect URLs.`;
      } else if (error?.message?.includes("OAuth provider not found")) {
        errorMessage =
          "Google OAuth is not properly configured. Please contact support.";
      } else if (error?.message?.includes("network error")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      }

      Alert.alert(
        "Sign In Error",
        errorMessage,
        [
          {
            text: "OK",
            style: "default",
            onPress: () => setIsSigningIn(false),
          },
          {
            text: "Retry",
            onPress: () => {
              setIsSigningIn(false);
              setTimeout(() => handleGoogleSignIn(), 100);
            },
            style: "cancel",
          },
        ],
        { cancelable: true },
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isAppleSigningIn || isSigningIn) {
      return;
    }

    // Check if Apple Authentication is available
    if (!isAppleAvailable) {
      Alert.alert(
        "Not Available",
        "Sign in with Apple is not available on this device.",
      );
      return;
    }

    setIsAppleSigningIn(true);

    try {
      if (!supabase) {
        console.error("CRITICAL: Supabase client is NOT initialized");
        throw new Error("Supabase client is not initialized");
      }

      // First, check for an existing session
      const {
        data: { session: existingSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("CRITICAL: Error checking session:", sessionError);
        throw sessionError;
      }

      if (existingSession) {
        setIsAppleSigningIn(false);
        return;
      }

      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("🍎 Apple credential received:", {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        givenName: credential.fullName?.givenName,
        familyName: credential.fullName?.familyName,
      });

      // Log detailed fullName structure
      if (credential.fullName) {
        console.log(
          "🍎 fullName object:",
          JSON.stringify(credential.fullName, null, 2),
        );
      } else {
        console.log(
          "🍎 No fullName in credential (this happens on subsequent logins)",
        );
      }

      // Decode identity token to check audience (bundle ID)
      if (credential.identityToken) {
        try {
          const tokenParts = credential.identityToken.split(".");
          if (tokenParts.length >= 2) {
            // Decode base64 URL-safe string
            const base64Url = tokenParts[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split("")
                .map(
                  (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
                )
                .join(""),
            );
            const payload = JSON.parse(jsonPayload);
            console.log("🍎 ID Token payload:", {
              aud: payload.aud,
              iss: payload.iss,
              sub: payload.sub,
            });
            console.log("⚠️ Bundle ID in token (aud):", payload.aud);
            console.log("⚠️ Expected Bundle ID:", "com.cty0305.too.doo.list");
            console.log(
              "⚠️ Current EXPO_PUBLIC_APP_ENV:",
              process.env.EXPO_PUBLIC_APP_ENV || "not set",
            );
          }
        } catch (e) {
          console.warn("Could not decode identity token:", e);
        }
      }

      // Get the identity token from Apple
      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Sign in with Supabase using Apple identity token
      // Add retry mechanism for 502 errors (Bad Gateway)
      let data, error;
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      while (retryCount <= maxRetries) {
        const result = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
          nonce: credential.nonce || undefined,
        });

        data = result.data;
        error = result.error;

        // If no error, break the retry loop
        if (!error) {
          break;
        }

        // Check if it's a retryable error (502, 503, 504, or network errors)
        const isRetryableError =
          error?.status === 502 ||
          error?.status === 503 ||
          error?.status === 504 ||
          error?.name === "AuthRetryableFetchError" ||
          (error?.message && error.message.includes("fetch"));

        if (isRetryableError && retryCount < maxRetries) {
          retryCount++;
          console.log(
            `⚠️ Retryable error (${
              error?.status || "unknown"
            }), retrying... (${retryCount}/${maxRetries})`,
          );
          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * retryCount),
          );
          continue;
        } else {
          // Not retryable or max retries reached
          break;
        }
      }

      if (error) {
        console.error("CRITICAL: Supabase sign-in failed:", error);
        console.error("Error status:", error?.status);
        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        throw error;
      }

      if (data?.user) {
        console.log("🍎 ✅ Apple sign-in successful!");
        console.log("User:", data.user.email || data.user.id);
        console.log("Current user_metadata:", data.user.user_metadata);

        // Update user metadata if we got name from Apple
        // Note: Apple only returns fullName on the FIRST sign-in
        if (credential.fullName) {
          const fullName = credential.fullName
            ? `${credential.fullName.givenName || ""} ${
                credential.fullName.familyName || ""
              }`.trim()
            : null;

          if (fullName) {
            console.log("🍎 Got fullName from Apple:", fullName);

            // Check if user_metadata already has a name or display_name
            const existingName =
              data.user.user_metadata?.name ||
              data.user.user_metadata?.display_name;

            // Only update if we don't have a name yet, or if the new name is different
            if (!existingName || existingName !== fullName) {
              try {
                console.log(
                  "🍎 Updating user_metadata (name and display_name) to:",
                  fullName,
                );
                const { data: updateData, error: updateError } =
                  await supabase.auth.updateUser({
                    data: {
                      name: fullName,
                      display_name: fullName, // Also set display_name for Supabase Auth users table
                    },
                  });

                if (updateError) {
                  console.error("❌ Failed to update user name:", updateError);
                  console.error(
                    "Update error details:",
                    JSON.stringify(updateError, null, 2),
                  );
                } else {
                  console.log("✅ User name updated successfully:", fullName);
                  console.log(
                    "Updated user_metadata:",
                    JSON.stringify(updateData?.user?.user_metadata, null, 2),
                  );

                  // Verify the update by fetching the user again
                  try {
                    const { data: verifyData, error: verifyError } =
                      await supabase.auth.getUser();
                    if (verifyError) {
                      console.error(
                        "❌ Error verifying user update:",
                        verifyError,
                      );
                    } else {
                      console.log(
                        "🔍 Verification - user_metadata after update:",
                        JSON.stringify(
                          verifyData?.user?.user_metadata,
                          null,
                          2,
                        ),
                      );
                      console.log(
                        "🔍 Verification - name:",
                        verifyData?.user?.user_metadata?.name,
                      );
                      console.log(
                        "🔍 Verification - display_name:",
                        verifyData?.user?.user_metadata?.display_name,
                      );
                    }
                  } catch (verifyErr) {
                    console.warn("⚠️ Could not verify user update:", verifyErr);
                  }

                  // display_name 會自動在 updateUserSettings 中同步，無需手動同步
                }
              } catch (updateError) {
                console.error("❌ Error updating user name:", updateError);
              }
            } else {
              console.log(
                "ℹ️ User name already exists and matches:",
                existingName,
              );
            }
          } else {
            console.warn("⚠️ fullName is empty after processing");
            // If fullName is empty, use email prefix as fallback
            const emailPrefix = data.user.email?.split("@")[0] || "User";
            console.log("🍎 Using email prefix as display_name:", emailPrefix);

            const existingName =
              data.user.user_metadata?.name ||
              data.user.user_metadata?.display_name;

            if (!existingName || existingName === emailPrefix) {
              try {
                console.log(
                  "🍎 Setting display_name from email prefix:",
                  emailPrefix,
                );
                const { data: updateData, error: updateError } =
                  await supabase.auth.updateUser({
                    data: {
                      name: emailPrefix,
                      display_name: emailPrefix,
                    },
                  });

                if (updateError) {
                  console.error(
                    "❌ Failed to set email prefix as name:",
                    updateError,
                  );
                } else {
                  console.log(
                    "✅ Email prefix set as display_name:",
                    emailPrefix,
                  );

                  // display_name 會自動在 updateUserSettings 中同步，無需手動同步
                }
              } catch (updateError) {
                console.error(
                  "❌ Error setting email prefix as name:",
                  updateError,
                );
              }
            }
          }
        } else {
          console.log(
            "ℹ️ No fullName from Apple (this is normal for returning users)",
          );
          console.log(
            "Current user_metadata.name:",
            data.user.user_metadata?.name,
          );
          console.log(
            "Current user_metadata.display_name:",
            data.user.user_metadata?.display_name,
          );

          // If user doesn't have a name yet, set a default from email
          const existingName =
            data.user.user_metadata?.name ||
            data.user.user_metadata?.display_name;

          if (!existingName && data.user.email) {
            const emailPrefix = data.user.email.split("@")[0];
            console.log(
              "🍎 Setting default display_name from email:",
              emailPrefix,
            );

            try {
              const { data: updateData, error: updateError } =
                await supabase.auth.updateUser({
                  data: {
                    name: emailPrefix,
                    display_name: emailPrefix,
                  },
                });

              if (updateError) {
                console.error("❌ Failed to set default name:", updateError);
              } else {
                console.log("✅ Default name set successfully:", emailPrefix);

                // Also update display_name in user_settings table
                try {
                  await UserService.updateUserSettings({
                    display_name: emailPrefix,
                  });
                  console.log("✅ display_name synced to user_settings table");
                } catch (settingsError) {
                  console.warn(
                    "⚠️ Failed to sync display_name to user_settings:",
                    settingsError,
                  );
                }
              }
            } catch (updateError) {
              console.error("❌ Error setting default name:", updateError);
            }
          }
        }

        // The auth state change listener will handle navigation
      } else {
        throw new Error("No user data returned from Supabase");
      }
    } catch (error) {
      // Handle user cancellation silently - this is not an error
      if (error?.code === "ERR_REQUEST_CANCELED") {
        console.log("🍎 Apple sign-in cancelled by user");
        setIsAppleSigningIn(false);
        return;
      }

      // Log other errors
      console.error("CRITICAL: Apple Authentication Error:", {
        name: error?.name || "Unknown Error",
        message: error?.message || "No error message available",
        code: error?.code || "N/A",
        fullError: error,
      });

      // Log full error details for debugging
      console.error("Full error object:", JSON.stringify(error, null, 2));
      console.error("Error stack:", error?.stack);

      let errorMessage =
        "An unexpected error occurred during sign in. Please try again.";

      if (
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504
      ) {
        errorMessage =
          "Server is temporarily unavailable. Please try again in a few moments.";
      } else if (error?.name === "AuthRetryableFetchError") {
        if (error?.status === 502) {
          errorMessage =
            "Server error (502). The authentication service is temporarily unavailable. Please try again later.";
        } else {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        }
      } else if (error?.message?.includes("network error")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (error?.message?.includes("Apple provider not found")) {
        errorMessage =
          "Apple sign-in is not properly configured. Please contact support.";
      } else if (error?.message?.includes("unacceptable audience")) {
        errorMessage =
          "Apple sign-in configuration error. The app bundle ID does not match. Please contact support.";
      } else if (error?.message) {
        // Show the actual error message if available
        errorMessage = error.message;
      }

      Alert.alert(t.signInError, errorMessage, [
        {
          text: t.ok,
          style: "default",
          onPress: () => setIsAppleSigningIn(false),
        },
      ]);
    } finally {
      setIsAppleSigningIn(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Image
          source={require("./assets/logo-login.png")}
          style={{ width: 120, height: 120, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: theme.text,
            marginBottom: 48,
            letterSpacing: 1,
          }}
        >
          {Platform.OS === "web"
            ? getAppDisplayName()
            : Application.applicationName || getAppDisplayName()}
        </Text>
        <View style={{ width: 260 }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderWidth: 1,
              borderRadius: 4,
              paddingVertical: 12,
              justifyContent: "center",
              marginBottom: 10,
              width: "100%",
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme.shadowOpacity,
              shadowRadius: 2,
              elevation: 1,
              opacity: isSigningIn ? 0.5 : 1,
            }}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn || isAppleSigningIn}
          >
            {isSigningIn && !isAppleSigningIn ? (
              <>
                <Image
                  source={require("./assets/google-logo.png")}
                  style={{ width: 28, height: 28, marginRight: 4 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    color: theme.mode === "dark" ? theme.text : "#4285F4",
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  Signing in...
                </Text>
              </>
            ) : (
              <>
                <Image
                  source={require("./assets/google-logo.png")}
                  style={{ width: 28, height: 28, marginRight: 4 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    color: theme.mode === "dark" ? theme.text : "#4285F4",
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  {t.signInWithGoogle || "Sign in with Google"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isAppleAvailable && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderWidth: 1,
                borderRadius: 4,
                paddingVertical: 12,
                justifyContent: "center",
                marginBottom: 10,
                width: "100%",
                shadowColor: theme.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: theme.shadowOpacity,
                shadowRadius: 2,
                elevation: 1,
                opacity: isAppleSigningIn ? 0.5 : 1,
              }}
              onPress={handleAppleSignIn}
              disabled={isAppleSigningIn || isSigningIn}
            >
              {isAppleSigningIn && !isSigningIn ? (
                <>
                  <Image
                    source={
                      theme.mode === "dark"
                        ? require("./assets/apple-100(dark).png")
                        : require("./assets/apple-90(light).png")
                    }
                    style={{ width: 24, height: 24, marginRight: 8 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      color: theme.mode === "dark" ? theme.text : "#000000",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <Image
                    source={
                      theme.mode === "dark"
                        ? require("./assets/apple-100(dark).png")
                        : require("./assets/apple-90(light).png")
                    }
                    style={{ width: 24, height: 24, marginRight: 8 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      color: theme.mode === "dark" ? theme.text : "#000000",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {t.signInWithApple || "Sign in with Apple"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {t.byContinuing}{" "}
          <Text
            style={{ color: theme.primary, fontWeight: "bold" }}
            onPress={() => setTermsModalVisible(true)}
          >
            {t.terms}
          </Text>{" "}
          {t.and}{" "}
          <Text
            style={{ color: theme.primary, fontWeight: "bold" }}
            onPress={() => setPrivacyModalVisible(true)}
          >
            {t.privacy}
          </Text>
          .
        </Text>
      </View>
      <Modal
        visible={termsModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <TermsScreen onClose={() => setTermsModalVisible(false)} />
      </Modal>
      <Modal
        visible={privacyModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <PrivacyScreen onClose={() => setPrivacyModalVisible(false)} />
      </Modal>
    </SafeAreaView>
  );
};

// Loading Skeleton Component
const TaskSkeleton = ({ theme }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Web platform doesn't support useNativeDriver
    const useNativeDriver = Platform.OS !== "web";

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.taskItemRow}>
      <View style={styles.checkbox}>
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
            },
            { opacity },
          ]}
        />
      </View>
      <View
        style={[
          styles.taskItem,
          {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.mode === "dark" ? "rgb(58, 58, 60)" : "#fff",
          },
        ]}
      >
        <View style={styles.taskTextContainer}>
          <Animated.View
            style={[
              {
                height: 16,
                borderRadius: 4,
                backgroundColor:
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                width: "80%",
              },
              { opacity },
            ]}
          />
        </View>
        <View style={styles.taskTimeContainer}>
          <Animated.View
            style={[
              {
                height: 14,
                borderRadius: 4,
                backgroundColor:
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                width: 50,
              },
              { opacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

function MainTabs() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const [tabIndex, setTabIndex] = React.useState(0);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      setTimeout(() => {
        document.title = getAppDisplayName();
      }, 0);
    }
  });

  // iOS 26+: stable references to prevent native tab bar appearance flicker
  const ios26Routes = React.useMemo(() => [
    {
      key: "calendar",
      title: t.tasks || "Tasks",
      focusedIcon: { sfSymbol: "checkmark.square.fill" },
      unfocusedIcon: { sfSymbol: "checkmark.square" },
    },
    {
      key: "settings",
      title: t.settings || "Settings",
      focusedIcon: { sfSymbol: "gearshape.fill" },
      unfocusedIcon: { sfSymbol: "gearshape" },
    },
  ], [t.tasks, t.settings]);

  const ios26RenderScene = React.useCallback(({ route }) => {
    switch (route.key) {
      case "calendar":
        return <CalendarScreen />;
      case "settings":
        return <SettingScreen />;
      default:
        return null;
    }
  }, []);

  const ios26TabBarStyle = React.useMemo(() => ({ backgroundColor: "transparent" }), []);

  // iOS 26+: native UITabBar with Liquid Glass
  if (isIOS26Plus) {
    return (
      <TabView
        navigationState={{ index: tabIndex, routes: ios26Routes }}
        onIndexChange={setTabIndex}
        renderScene={ios26RenderScene}
        scrollEdgeAppearance="transparent"
        tabBarActiveTintColor={theme?.tabBarActive}
        tabBarInactiveTintColor={theme?.tabBarInactive}
        tabBarStyle={ios26TabBarStyle}
      />
    );
  }

  // iOS < 26: standard React Navigation bottom tabs (proper centering)
  const verticalPad = Math.round(insets.bottom * 0.5);
  const isDark = theme?.mode === "dark";
  const tabBgColor = theme?.tabBarBackground || (isDark ? "#1c1c1e" : "#f9f9f9");
  const tabActiveColor = theme?.tabBarActive || (isDark ? "#60A5FA" : "#3B82F6");
  const tabInactiveColor = theme?.tabBarInactive || (isDark ? "#636366" : "#999999");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Calendar") {
            return (
              <MaterialCommunityIcons
                name="checkbox-marked-outline"
                size={size}
                color={color}
              />
            );
          } else {
            return (
              <MaterialCommunityIcons
                name={focused ? "cog" : "cog-outline"}
                size={size}
                color={color}
              />
            );
          }
        },
        tabBarActiveTintColor: tabActiveColor,
        tabBarInactiveTintColor: tabInactiveColor,
        tabBarStyle: {
          backgroundColor: tabBgColor,
          borderTopColor: isDark ? "#1c1c1e" : "#e0e0e0",
          paddingTop: verticalPad,
          paddingBottom: verticalPad,
        },
      })}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: t.tasks || "Tasks" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingScreen}
        options={{ title: t.settings || "Settings" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_700Bold,
  });

  useEffect(() => {
    // Add Google Fonts for web only - keep it simple for native
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const cleanupElements = [];

      // Add Google Fonts links
      const fontsLink = document.createElement("link");
      fontsLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap";
      fontsLink.rel = "stylesheet";
      document.head.appendChild(fontsLink);
      cleanupElements.push(fontsLink);

      // Apply fonts using more specific selectors to avoid icon interference
      const style = document.createElement("style");
      style.textContent = `
        /* Apply to all text content containers, but not icons */
        [dir] > * {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans TC',
            system-ui, sans-serif !important;
        }
        
        /* Exclude icons and SVG elements */
        [dir] > svg,
        [dir] > * > svg,
        [dir] [role="img"],
        [dir] [aria-label*="icon" i] {
          font-family: inherit !important;
        }
        
        /* Apply to input fields */
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

  const [language, setLanguageState] = useState("en");
  const [loadingLang, setLoadingLang] = useState(true);
  const [themeMode, setThemeModeState] = useState("auto"); // 預設跟隨系統
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [userType, setUserTypeState] = useState("general");
  const [loadingUserType, setLoadingUserType] = useState(true);

  // 檢測系統顏色模式
  const systemColorScheme = useColorScheme();

  // 監聽系統主題變化（確保 auto 模式能即時響應 iOS 設定）
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log(`🎨 System theme changed to: ${colorScheme}`);
      // useColorScheme hook 會自動更新，這裡只是記錄日誌
    });

    return () => subscription.remove();
  }, []);

  // 版本更新狀態
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isSimulatingUpdate, setIsSimulatingUpdate] = useState(false);

  // Load theme function (定義在外部，可以在登入後重新調用)
  // 注意：這個函數會在 App 啟動時和登入後調用
  // 在 App 啟動時，會通過 useEffect 中的 startEarlyPreload 來協調
  const loadTheme = React.useCallback(async () => {
    try {
      console.log("🎨 Loading theme settings...");

      // 檢查預載入是否正在進行中
      if (dataPreloadService.isPreloading) {
        console.log(
          "⏳ [Theme] Preload in progress, waiting for userSettings...",
        );
        try {
          // 等待預載入的 userSettings 部分完成
          await new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 40; // 最多檢查 40 次（2秒）
            const checkInterval = setInterval(() => {
              checkCount++;
              const cachedData = dataPreloadService.getCachedData();
              if (cachedData?.userSettings) {
                console.log(
                  `✅ [Theme] UserSettings found after ${checkCount * 50}ms`,
                );
                clearInterval(checkInterval);
                resolve();
                return;
              }
              // 最多等待 2 秒
              if (checkCount >= maxChecks) {
                console.log(
                  `⏳ [Theme] Timeout after ${maxChecks * 50}ms, proceeding...`,
                );
                clearInterval(checkInterval);
                resolve();
              }
            }, 50); // 每 50ms 檢查一次
          });
        } catch (error) {
          console.log("⏳ [Theme] Preload wait error:", error);
        }
      }

      // 優先檢查預載入緩存
      const cachedData = dataPreloadService.getCachedData();
      let userSettings = cachedData?.userSettings;

      if (userSettings) {
        console.log("📦 [Theme] Using preloaded user settings");
      } else {
        // 如果還是沒有緩存，才從 API 載入（加逾時避免登入後卡住）
        console.log("📥 [Theme] Loading theme settings from Supabase...");
        const THEME_LOAD_TIMEOUT_MS = 5000;
        try {
          userSettings = await Promise.race([
            UserService.getUserSettings(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Theme load timeout")),
                THEME_LOAD_TIMEOUT_MS,
              ),
            ),
          ]);
        } catch (timeoutErr) {
          if (timeoutErr?.message === "Theme load timeout") {
            console.warn(
              `⚠️ [Theme] Supabase timeout after ${THEME_LOAD_TIMEOUT_MS}ms, using default theme`,
            );
            userSettings = { theme: "light" };
          } else {
            throw timeoutErr;
          }
        }
      }

      console.log("📦 Theme settings received:", userSettings);
      console.log(
        "📦 Theme value:",
        userSettings.theme,
        "Type:",
        typeof userSettings.theme,
      );

      // 明確檢查 theme 值（支援 auto, dark, light）
      if (userSettings.theme === "dark" || userSettings.theme === "light" || userSettings.theme === "auto") {
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
      // 錯誤時使用預設值（跟隨系統）
      setThemeModeState("auto");
    } finally {
      setLoadingTheme(false);
    }
  }, []);

  const loadUserType = useCallback(async () => {
    try {
      setLoadingUserType(true);

      // 先等待預載入開始
      const preloadPromise = dataPreloadService.preloadPromise;
      if (preloadPromise) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 2000),
          );
          await Promise.race([preloadPromise, timeoutPromise]);
        } catch (error) {
          console.log("⏳ [UserType] Preload wait error:", error);
        }
      }

      // 優先檢查預載入緩存
      const cachedData = dataPreloadService.getCachedData();
      let userSettings = cachedData?.userSettings;

      if (!userSettings) {
        userSettings = await UserService.getUserSettings();
      }

      if (userSettings && userSettings.user_type) {
        setUserTypeState(userSettings.user_type);
      }
    } catch (error) {
      console.error("❌ Error loading user type settings:", error);
    } finally {
      setLoadingUserType(false);
    }
  }, []);

  // Request notification permissions on app start (native only)
  useEffect(() => {
    if (Platform.OS !== "web") {
      const requestNotificationPermissions = async () => {
        try {
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

  useEffect(() => {
    // Set browser tab title
    if (typeof document !== "undefined") {
      document.title = getAppDisplayName();
    }

    // 初始化 Google Analytics (僅 Web 平台且 Production 環境)
    if (Platform.OS === "web") {
      const env = getCurrentEnvironment();
      if (env === "production") {
        ReactGA.initialize(process.env.EXPO_PUBLIC_GA_WEB_ID || "G-EW2TBM5EML");
        console.log("✅ [GA] Web Production 環境 - 已初始化");
      } else {
        console.log(
          `🔧 [GA] Web ${env} 環境 - 跳過初始化（僅 Production 追蹤）`,
        );
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
    // 這樣可以確保 loadLanguage/loadTheme 能使用預載入緩存
    const startEarlyPreload = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          console.log("🚀 [App] Starting early preload...");
          // 開始預載入，但不等待完成
          dataPreloadService.preloadAllData().catch((preloadError) => {
            console.error("❌ [App] Error in early preload:", preloadError);
          });
          return true; // 返回 true 表示預載入已開始
        }
        return false; // 沒有 session，不預載入
      } catch (error) {
        console.error(
          "❌ [App] Error checking session for early preload:",
          error,
        );
        return false;
      }
    };

    // 先啟動預載入（如果有的話）
    const preloadStartedPromise = startEarlyPreload();

    // Load language from Supabase user settings
    const loadLanguage = async () => {
      try {
        console.log("🌐 Loading language settings...");

        // 等待預載入開始（如果有的話）
        const preloadStarted = await preloadStartedPromise;

        // 如果預載入已開始，等待 userSettings 載入完成（最多等待 2 秒）
        if (preloadStarted && dataPreloadService.isPreloading) {
          console.log(
            "⏳ [Language] Preload in progress, waiting for userSettings...",
          );
          try {
            // 等待預載入的 userSettings 部分完成
            await new Promise((resolve) => {
              let checkCount = 0;
              const maxChecks = 40; // 最多檢查 40 次（2秒）
              const checkInterval = setInterval(() => {
                checkCount++;
                const cachedData = dataPreloadService.getCachedData();
                if (cachedData?.userSettings) {
                  console.log(
                    `✅ [Language] UserSettings found after ${checkCount * 50}ms`,
                  );
                  clearInterval(checkInterval);
                  resolve();
                  return;
                }
                // 最多等待 2 秒
                if (checkCount >= maxChecks) {
                  console.log(
                    `⏳ [Language] Timeout after ${maxChecks * 50}ms, proceeding...`,
                  );
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 50); // 每 50ms 檢查一次
            });
          } catch (error) {
            console.log("⏳ [Language] Preload wait error:", error);
          }
        }

        // 優先檢查預載入緩存
        const cachedData = dataPreloadService.getCachedData();
        let userSettings = cachedData?.userSettings;

        if (userSettings) {
          console.log("📦 [Language] Using preloaded user settings");
        } else {
          // 如果還是沒有緩存，才從 API 載入
          console.log(
            "📥 [Language] Loading language settings from Supabase...",
          );
          userSettings = await UserService.getUserSettings();
        }

        console.log("📦 User settings received:", userSettings);

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
            deviceLocale === "zh" || deviceLocale === "es" ? deviceLocale : "en";
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
    // 這樣可以確保它們能使用預載入緩存
    (async () => {
      await preloadStartedPromise;
      loadLanguage();
      loadTheme();
      loadUserType();
    })();

    updatePlatformOnStart();
  }, [loadTheme]);

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

        // 如果偵測到更新的版本，不受 24 小時限制
        if (versionService.compareVersions(latestVersion, version) > 0) {
          return true;
        }

        // 否則檢查是否超過 24 小時 (24 * 60 * 60 * 1000)
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return now - timestamp > oneDay;
      } catch (error) {
        console.error("Error checking version prompt frequency:", error);
        return true; // 發生錯誤時預設顯示，確保用戶看到更新
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

            // 記錄本次提示的版本與時間
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

    // EAS OTA：僅在 production build 檢查並套用 JS 更新（dev client 不執行）
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

    // 延遲一下再檢查，避免與啟動流程競爭資源；OTA 先跑（2s），商店版本檢查 3s
    const otaTimer = setTimeout(checkAndApplyOTA, 2000);
    const storeTimer = setTimeout(checkUpdateProactively, 3000);
    return () => {
      clearTimeout(otaTimer);
      clearTimeout(storeTimer);
    };
  }, []);

  const setLanguage = async (lang) => {
    console.log(`🌐 Setting language to: ${lang}`);
    setLanguageState(lang);

    // Clear version service cache when language changes
    // This ensures release notes are fetched in the new language
    versionService.clearCache();
    console.log("🗑️ Version cache cleared for language change");

    try {
      // Save to Supabase user settings (platform 會自動更新)
      const result = await UserService.updateUserSettings({
        language: lang,
      });
      console.log("✅ Language saved to Supabase:", result);

      // 更新預載入緩存，確保 reminder_settings 等設定保持最新
      // 使用 Supabase 返回的完整結果更新緩存，這樣可以保留 reminder_settings
      if (result) {
        dataPreloadService.updateCachedUserSettings(result);
      }
    } catch (error) {
      // 檢查是否為網絡錯誤
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
      // Fallback to AsyncStorage
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  };

  const setThemeMode = async (mode) => {
    console.log(`🎨 Setting theme to: ${mode}`);
    setThemeModeState(mode);

    try {
      // Save to Supabase user settings (platform 會自動更新)
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

  // 計算實際使用的 theme（如果是 auto 則使用系統設定）
  const actualThemeMode = React.useMemo(() => {
    if (themeMode === "auto") {
      const systemTheme = systemColorScheme || Appearance.getColorScheme() || "light";
      console.log(`🎨 [Auto Mode] systemColorScheme: ${systemColorScheme}, Appearance.getColorScheme(): ${Appearance.getColorScheme()}, final: ${systemTheme}`);
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = getTheme(actualThemeMode);

  // Wait for fonts and language to load
  // Add timeout fallback to prevent infinite white screen
  const [fontTimeout, setFontTimeout] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Font loading timeout - continuing anyway");
      setFontTimeout(true);
    }, 3000); // Reduced from 5s to 3s
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

  // Show branded loading screen while fonts/language/theme are loading
  if ((!fontsLoaded || loadingLang || loadingTheme || loadingUserType) && !fontTimeout) {
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
              initialRouteName="Splash"
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

// ...

// Helper function to get font family based on platform and language
const getFontFamily = (language = "en", weight = "regular") => {
  const isChinese = language === "zh";

  if (Platform.OS === "web") {
    // For web, use CSS font family with fallback
    return isChinese
      ? '"Noto Sans TC", -apple-system, system-ui, sans-serif'
      : '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  }

  // For native apps: system font (SF Pro) for non-Chinese, NotoSansTC for Chinese
  if (!isChinese) {
    return undefined; // React Native defaults to SF Pro on iOS
  }
  if (weight === "bold") {
    return "NotoSansTC_700Bold";
  } else if (weight === "medium") {
    return "NotoSansTC_500Medium";
  }
  return "NotoSansTC_400Regular";
};

const styles = StyleSheet.create({
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  checkbox: {
    marginRight: 2,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTextChecked: {
    textDecorationLine: "line-through",
    color: "#bbb",
  },
  fabAddButton: {
    position: "absolute",
    right: 20,
    bottom: 8,
    zIndex: 10,
    borderRadius: 32,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  // ...
  // Removed bottomMenuBar style, handled by Tab.Navigator now

  container: {
    flex: 1,
    flexDirection: "column",
    // backgroundColor moved to inline style to use theme
  },
  calendarSection: {
    flexShrink: 0,
    paddingVertical: 4, // Reduced from 8 to give more space to task area
    // backgroundColor moved to inline style to use theme
  },
  taskAreaContainer: {
    // backgroundColor moved to inline style to use theme
    width: "100%",
    flex: 1,
  },
  taskArea: {
    flex: 1,
    // backgroundColor moved to inline style to use theme
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  fixedHeader: {
    backgroundColor: "transparent",
    zIndex: 10,
  },
  currentMonthTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  weekDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16, // 8 (original) + 8 (to compensate for marginHorizontal)
    paddingBottom: 6, // Reduced from 8
    marginHorizontal: -8, // Extend border line to edges (matches customCalendar marginHorizontal)
    borderBottomWidth: 1,
  },
  // Scroll container
  calendarDivider: {
    height: 1,
    backgroundColor: "#bbbbbb",
    marginBottom: 4,
  },
  calendarScrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  scrollSpacer: {
    height: 4, // Reduced from 10 to minimize space
  },
  // Month container
  monthContainer: {
    marginBottom: 0,
  },
  customCalendar: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    padding: 4,
    paddingBottom: 6, // Extra bottom padding to ensure task dots are visible
    marginHorizontal: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    fontWeight: "400",
    minWidth: 40,
    maxWidth: 40,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44, // Reduced from 50 to make calendar more compact
    paddingHorizontal: 4,
  },
  emptyDate: {
    width: 40,
    height: 40,
    margin: 2,
  },
  hiddenDate: {
    opacity: 0,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: 8,
    zIndex: 1,
    minWidth: 40,
    maxWidth: 40,
    minHeight: 40,
    maxHeight: 40,
    overflow: "visible", // Ensure task dots are visible
  },
  calendarDayContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible", // Ensure task dots are visible
  },
  dateContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible", // Ensure task dots are visible
  },
  calendarDayText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
  selectedDay: {
    backgroundColor: "#e8e7fc", // Light mode selected background
    zIndex: 3,
    elevation: 2,
    minWidth: 40,
    maxWidth: 40,
    minHeight: 40,
    maxHeight: 40,
  },
  selectedDayText: {
    color: "#3B82F6", // Light mode selected text color
    fontWeight: "700",
    zIndex: 4,
  },
  otherMonthText: {
    color: "#999999",
  },
  calendarDayMoveTarget: {
    borderColor: "#ffb300",
    borderWidth: 2,
  },
  taskDot: {
    position: "absolute",
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    zIndex: 10,
  },
  todayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  todayText: {
    color: "#ffffff", // Always white for better contrast on purple background
    fontWeight: "600",
    fontSize: 14,
  },
  dateTextContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  dayViewDateContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  dayViewDayButton: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    position: "relative",
  },
  dayViewDayNumber: {
    fontSize: 48,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 56,
  },
  selectedDayLarge: {
    backgroundColor: "#e8e7fc",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  todayCircleLarge: {
    backgroundColor: "#3B82F6",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  todayTextLarge: {
    color: "white",
    fontWeight: "700",
  },
  selectedDateLarge: {
    // No additional styling needed
  },
  taskDotLarge: {
    position: "absolute",
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  noTaskContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDate: {
    // No background color, just text color change
  },
  selectedDayText: {
    color: "#3B82F6", // Same as add button color
    fontWeight: "600",
  },
  tasksContainer: {
    flex: 1,
    backgroundColor: "#f7f7fa",
  },
  taskAreaContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  taskArea: {
    flex: 1,
    backgroundColor: "#f7f7fa",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  tasksHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 12,
    width: "100%",
    backgroundColor: "#f7f7fa", // Match tasks container background
    paddingTop: 8,
  },
  tasksHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d3d4e",
    flex: 1,
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  addButton: {
    marginLeft: 12,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
  },
  addButtonText: {
    fontSize: 20,
    lineHeight: 24,
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  taskList: {
    width: "100%",
    paddingHorizontal: 12,
  },
  taskItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  taskTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    flexShrink: 1,
  },
  taskText: {
    fontSize: 16,
    color: "#333",
    textDecorationLine: "none",
    flexShrink: 1,
    maxWidth: "100%",
  },
  taskTimeContainer: {
    flexShrink: 0,
    alignItems: "flex-end",
    minWidth: 60,
  },
  moveHint: {
    color: "#ffb300",
    fontWeight: "700",
    marginLeft: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#3d3d4e",
  },
  linkInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    height: 50,
  },
  linkInputContainerFocused: {
    borderColor: "#3B82F6",
  },
  linkInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "transparent",
    textAlignVertical: "center",
    borderRadius: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        lineHeight: 50, // iOS: 使用 lineHeight 實現垂直置中
      },
      android: {
        textAlignVertical: "center",
      },
    }),
  },
  linkPreviewButton: {
    padding: 8,
    marginLeft: 8,
  },
  placeholderText: {
    color: "#888",
  },
  timeInput: {
    height: 50,
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  timeInputSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#f0f0ff",
  },
  timeInputText: {
    fontSize: 16,
    color: "#888",
    flex: 1,
  },
  timeInputTextFilled: {
    color: "#222",
    fontWeight: "500",
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  timePickerCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  timePickerBody: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  timeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeWheel: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  timeWheelLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  timeWheelList: {
    height: 200,
    width: 80,
  },
  timeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B82F6",
    marginHorizontal: 10,
  },
  timeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  timeWheelItemSelected: {
    backgroundColor: "#3B82F6",
  },
  timeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  timeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  timeWheelHighlight: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  timePickerActions: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  simpleTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  simpleTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  simpleTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  simpleTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  simpleTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  simpleTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerDoneText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  simpleTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  simpleTimeInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleTimeInput: {
    alignItems: "center",
    flex: 1,
  },
  simpleTimeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  simpleTimeTextInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    width: 80,
    backgroundColor: "#f9f9f9",
  },
  simpleTimeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B82F6",
    marginHorizontal: 20,
  },
  timeInputContainer: {
    padding: 20,
    alignItems: "center",
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeNumberInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    width: 60,
    backgroundColor: "#f9f9f9",
  },
  timeColon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#666",
    marginHorizontal: 10,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  timePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeWheel: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  timeWheelList: {
    height: 200,
    width: 80,
  },
  timeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  timeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  timeWheelItemSelected: {
    backgroundColor: "#3B82F6",
  },
  timeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  timeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  timeWheelHighlight: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B82F6",
    marginHorizontal: 10,
  },
  spinnerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    alignItems: "center",
  },
  spinnerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  spinnerColumn: {
    alignItems: "center",
    flex: 1,
  },
  spinnerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  spinner: {
    height: 120,
    width: 60,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  spinnerList: {
    flex: 1,
  },
  spinnerContent: {
    paddingVertical: 40,
  },
  spinnerItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerText: {
    fontSize: 16,
    color: "#333",
  },
  spinnerColon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginHorizontal: 10,
  },
  spinnerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  spinnerCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  spinnerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  spinnerDone: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  spinnerDoneText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  taskTimeRight: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
    textAlign: "right",
  },
  timePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  timeWheelContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
  },
  timeWheel: {
    height: 200,
    width: 80,
    position: "relative",
    overflow: "hidden",
  },
  timeWheelItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timeWheelItemSelected: {
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 20,
  },
  timeWheelText: {
    fontSize: 20,
    color: "#888",
  },
  timeWheelTextSelected: {
    fontSize: 24,
    color: "#3B82F6",
    fontWeight: "600",
  },
  timeWheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 40,
    marginTop: -20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#3B82F6",
    zIndex: -1,
  },
  timeSeparator: {
    fontSize: 28,
    marginHorizontal: 8,
    color: "#3B82F6",
    fontWeight: "600",
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
  timePickerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d3d4e",
  },
  timePickerClose: {
    padding: 8,
  },
  timePickerBody: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timePicker: {
    width: "100%",
  },
  timePicker: {
    width: "100%",
  },
  doneButton: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
  },
  doneButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
    ...(Platform.OS === "web" && {
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputFilled: {
    borderColor: "#3B82F6",
  },
  noteInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  modalButtons: {
    minHeight: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  modalBackButton: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    zIndex: 999,
    backgroundColor: "transparent",
  },
  modalHeaderSpacer: {
    width: 48,
  },
  modalCloseButton: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#ff5a5f",
    fontWeight: "500",
    fontSize: 14,
  },
  taskContent: {
    flex: 1,
  },
  taskUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  userDisplayName: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  // 簡化時間選擇器樣式
  simpleTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  simpleTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  simpleTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  simpleTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  simpleTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  simpleTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  simpleTimePickerDoneText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  simpleTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  simpleTimeWheelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleTimeWheel: {
    height: 200,
    width: 80,
    marginHorizontal: 10,
  },
  simpleTimeWheelContent: {
    alignItems: "center",
    paddingVertical: 75,
  },
  simpleTimeWheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  simpleTimeWheelItemSelected: {
    backgroundColor: "#3B82F6",
  },
  simpleTimeWheelText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  simpleTimeWheelTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  simpleTimeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B82F6",
    marginHorizontal: 10,
  },
  // 原生時間選擇器樣式
  nativeTimePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  nativeTimePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  nativeTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  nativeTimePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nativeTimePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  nativeTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  nativeTimePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nativeTimePickerDoneText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  nativeTimePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: "center",
  },
  nativeDateTimePicker: {
    width: 200,
    height: 200,
  },
  // 簡化的時間選擇器樣式
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  timePickerBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: "center",
  },
  dateTimePicker: {
    width: 200,
    height: 200,
  },
  // Web 時間選擇器樣式
  webTimePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  webTimePickerRow: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  webTimePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  webTimePickerColumn: {
    height: 200,
    width: 60,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  webTimePickerContent: {
    alignItems: "center",
    paddingVertical: 84, // 讓當前時間顯示在中間
  },
  webTimePickerItem: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 1,
    borderRadius: 4,
  },
  webTimePickerItemSelected: {
    backgroundColor: "#3B82F6",
  },
  webTimePickerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  webTimePickerTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  webTimePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  webTimePickerColumn: {
    alignItems: "center",
    marginHorizontal: 15,
  },
  webTimePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  webTimePickerList: {
    height: 200,
    width: 80,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  webTimePickerContent: {
    paddingVertical: 85, // 讓中間的項目居中顯示
  },
  webTimePickerItem: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 1,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  webTimePickerItemSelected: {
    backgroundColor: "#3B82F6",
  },
  webTimePickerText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  webTimePickerTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  webTimeSeparator: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3B82F6",
    marginHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 0,
  },
  dayNavButton: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayViewHeaderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  dayViewDateText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  dayViewDateNumber: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  dayViewMonthYear: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 2,
  },
  dayViewCalendarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    minHeight: 120,
  },
  dayViewContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  todayButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  todayButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  taskAreaContent: {
    flex: 1,
  },
  tasksScrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 8, // Minimal padding for last item visibility
  },
});
