import { Platform } from "react-native";

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
  if (isOAuthCallback) {
    // Mark OAuth in progress immediately (before React renders) so SplashScreen
    // knows to show a loading indicator even if the URL params get cleared before it mounts
    sessionStorage.setItem("oauth_in_progress", "true");

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
