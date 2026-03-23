import { useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";

export const useInitialRoute = () => {
  const [initialRoute, setInitialRoute] = useState(
    Platform.OS === "web" ? null : "Splash",
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let resolved = false;
    let subscription = null;
    let timeout = null;

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
          window.history.replaceState({}, document.title, "/app");
        } else {
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
          }
          if (event === "SIGNED_IN" && session) {
            resolve("MainTabs");
          }
        });
        subscription = data.subscription;
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

  return initialRoute;
};
