import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Linking,
  Platform,
} from "react-native";
import * as Application from "expo-application";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../services/supabaseClient";
import { ThemeContext, LanguageContext, UserContext } from "../contexts";
import { dataPreloadService } from "../services/dataPreloadService";
import { mixpanelService } from "../services/mixpanelService";
import { UserService } from "../services/userService";
import TermsScreen from "./TermsScreen";
import PrivacyScreen from "./PrivacyScreen";

const getAppDisplayName = () => {
  return "TaskCal";
};

const SplashScreen = ({ navigation }) => {
  const { theme, themeMode, loadTheme: reloadTheme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { loadUserType } = useContext(UserContext);
  const [hasNavigated, setHasNavigated] = useState(false);
  // On web, show loading indicator while OAuth code exchange is in progress
  const [isCheckingSession, setIsCheckingSession] = useState(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    const hasOAuthInUrl = url.search.includes("code=") || url.hash.includes("access_token");
    if (hasOAuthInUrl) {
      // Mark OAuth in progress in sessionStorage so remounts also stay in loading state
      sessionStorage.setItem("oauth_in_progress", "true");
      return true;
    }
    // Check if a previous mount already detected OAuth (e.g. after SIGNED_OUT remount)
    return sessionStorage.getItem("oauth_in_progress") === "true";
  });
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
                // Do NOT set isCheckingSession(false) here — the code may have already
                // been exchanged by detectSessionInUrl; the auth listener will navigate.
                // Fallback timeout or checkSessionAndNavigate will handle true failures.
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
        // Clear OAuth in-progress flag on successful navigation
        if (Platform.OS === "web" && typeof window !== "undefined") {
          sessionStorage.removeItem("oauth_in_progress");
        }
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
              // INITIAL_SESSION with no session means user is not logged in — show login buttons
              if (event === "INITIAL_SESSION") {
                setIsCheckingSession(false);
              }
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

            // 有帳號的 user 不需要 onboarding，確保登入後不會再跳回 Onboarding
            await AsyncStorage.setItem("onboarding_completed", "true");

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

          // If OAuth is in progress (e.g. TOKEN_REFRESH_FAILED during OAuth login),
          // don't reset navigation — the incoming SIGNED_IN event will navigate to MainTabs
          if (
            Platform.OS === "web" &&
            typeof window !== "undefined" &&
            sessionStorage.getItem("oauth_in_progress") === "true"
          ) {
            setHasNavigated(false);
            return;
          }

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
          // No session confirmed — reveal login buttons
          setIsCheckingSession(false);
        }
      } catch (error) {
        console.error("[checkSession] Unexpected error:", error);
        console.error("[checkSession] Error stack:", error.stack);
        setIsCheckingSession(false);
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
    // Safety fallback: if OAuth exchange takes too long, reveal login buttons
    const oauthCheckingTimeout = setTimeout(() => {
      setIsCheckingSession(false);
    }, 10000);

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
          // Truly no session — OAuth must have failed, reveal login buttons
          setIsCheckingSession(false);
          return false;
        }
      } catch (error) {
        console.error("Fallback: Error in session check:", error);
        return false;
      }
    };

    // Cleanup
    return () => {
      clearTimeout(oauthCheckingTimeout);
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
          source={require("../../assets/logo-login.png")}
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
        {isCheckingSession ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
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
                  source={require("../../assets/google-logo.png")}
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
                  source={require("../../assets/google-logo.png")}
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
                        ? require("../../assets/apple-100(dark).png")
                        : require("../../assets/apple-90(light).png")
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
                        ? require("../../assets/apple-100(dark).png")
                        : require("../../assets/apple-90(light).png")
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
        )}
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

export default SplashScreen;
