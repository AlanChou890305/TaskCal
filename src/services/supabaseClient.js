import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {
  getSupabaseConfig,
  getCurrentEnvironment,
} from "../config/environment";

// 獲取當前環境的 Supabase 配置
const supabaseConfig = getSupabaseConfig();
const currentEnv = getCurrentEnvironment();

// 環境資訊
console.log(`🌍 Environment: ${currentEnv === "production" ? "Production" : "Staging"}`);

// Supabase configuration - 優先使用 production 環境
// 默認使用 production Supabase，除非明確指定其他環境
let supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  supabaseConfig.url ||
  process.env.EXPO_PUBLIC_SUPABASE_URL_STAGING ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL_STAGING;

let supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  supabaseConfig.anonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING;

// 環境驗證：確保環境變數已正確設置
if (!supabaseConfig.url) {
  console.warn(
    `⚠️ Missing Supabase URL for ${currentEnv} environment. Please check your environment configuration.`
  );
}

// Validate required environment variables - but don't crash the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    `❌ Missing required environment variables for ${currentEnv} environment:`,
    "EXPO_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "✓" : "✗",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseAnonKey ? "✓" : "✗"
  );
  console.error(
    "⚠️ WARNING: App will continue with limited functionality. " +
      "Please check your environment configuration in .env files and app.config.js"
  );
  // Continue without throwing - this prevents SIGABRT crash
}

// Create a custom storage handler for React Native
const createStorage = () => {
  return {
    getItem: async (key) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error("Error getting item from storage:", error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error("Error setting item in storage:", error);
      }
    },
    removeItem: async (key) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error("Error removing item from storage:", error);
      }
    },
  };
};

// Common configuration
const commonConfig = {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    flowType: "pkce",
    storage: Platform.OS === "web" ? window.localStorage : createStorage(),
  },
};

// Validate Supabase configuration
// Log successful configuration

// Initialize Supabase client with safe fallback
let supabase;
try {
  // Use fallback values if environment variables are missing (should not happen in production)
  const url = supabaseUrl || "https://placeholder.supabase.co";
  const key = supabaseAnonKey || "placeholder-key";

  supabase = createClient(url, key, commonConfig);

  // Log successful initialization
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "⚠️ Supabase client initialized with placeholder values - limited functionality"
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Supabase client:", error);
  // Create a minimal mock client to prevent crashes
  supabase = {
    auth: {
      signInWithOAuth: async () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
      update: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
      delete: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
    }),
  };
}

// Handle deep links when the app is opened from a redirect
const handleOpenURL = async (event) => {
  console.log("🔗 ========================================");
  console.log("🔗 [Deep Link] Received URL:", event.url);
  console.log("🔗 [Deep Link] Current environment:", currentEnv);
  console.log("🔗 [Deep Link] Supabase URL:", supabaseUrl);
  console.log("🔗 ========================================");

  // Check if this is a Supabase auth callback
  const isAuthCallback =
    event.url.includes("access_token=") ||
    event.url.includes("code=") ||
    event.url.includes("error=");

  console.log("🔗 [Deep Link] Is auth callback:", isAuthCallback);

  if (isAuthCallback) {
    try {
      // Extract the URL parameters
      const url = new URL(event.url);

      // Try hash parameters first (direct token flow)
      let params = new URLSearchParams(url.hash.substring(1));

      // If no hash parameters, try query parameters (PKCE flow)
      if (!params.get("access_token") && !params.get("code")) {
        params = new URLSearchParams(url.search);
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        console.error(
          "🔗 [Deep Link] ❌ OAuth error from callback:",
          error,
          params.get("error_description")
        );
        return;
      }

      if (accessToken && refreshToken) {
        // Direct token flow
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("❌ Error setting session:", sessionError);
        }
      } else if (code) {
        // PKCE flow - exchange code for tokens
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("❌ Error exchanging code for session:", exchangeError);
        } else {
          // Wait a moment for session to be fully established
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Force auth state check to trigger navigation
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (!sessionError && session) {
            // Refresh the session to trigger all auth state listeners
            await supabase.auth.refreshSession();

            // For web platform, also dispatch custom event
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("supabase-auth-success", {
                  detail: { session },
                })
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error handling auth callback:", error);
    }
  }
};

// Initialize subscription variable at the top level
let subscription;

// For OAuth with Expo
const setupDeepLinking = () => {
  if (Platform.OS !== "web") {
    // Handle the initial URL in case the app was launched from a deep link
    const processInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          handleOpenURL({ url: initialUrl });
        }
      } catch (error) {
        console.error("❌ Error processing initial URL:", error);
      }
    };

    // Process any initial URL
    processInitialURL();

    // Listen for deep links when the app is opened from a URL
    console.log("🔗 [Setup] Adding URL event listener...");
    subscription = Linking.addEventListener("url", handleOpenURL);
    console.log("🔗 [Setup] ✅ URL event listener added");

    // Cleanup function to remove the event listener
    const cleanup = () => {
      console.log("🔗 [Setup] Cleaning up deep link listener");
      if (subscription && subscription.remove) {
        subscription.remove();
      } else {
        // Fallback for older versions of React Native
        Linking.removeEventListener("url", handleOpenURL);
      }
    };

    return cleanup;
  }

  console.log("🔗 [Setup] Web platform - skipping native deep linking setup");
  // Return a no-op cleanup function for web
  return () => {};
};

// Set up deep linking and get cleanup function
console.log("🔗 [Init] Starting deep link initialization...");
const cleanupDeepLinking = setupDeepLinking();
console.log("🔗 [Init] ✅ Deep linking initialized");

// Clean up event listener
const cleanupAuthListeners = () => {
  if (Platform.OS !== "web" && subscription?.remove) {
    subscription.remove();
  } else if (Platform.OS === "web") {
    window.removeEventListener("url", handleOpenURL);
    window.removeEventListener("beforeunload", cleanupAuthListeners);
  }
};

if (Platform.OS === "web") {
  window.addEventListener("beforeunload", cleanupAuthListeners);
}

// Export the supabase client and cleanup function
export { supabase, cleanupAuthListeners };
