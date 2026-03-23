import React, { useMemo } from "react";
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

// Side-effect: handle OAuth redirect before React initializes (web only)
import "./src/utils/oauthRedirect";

// Services
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

const LANGUAGE_STORAGE_KEY = "LANGUAGE_STORAGE_KEY";
const Stack = createStackNavigator();

const getRedirectUrl = () => "https://to-do-mvp.vercel.app";
const getAppDisplayName = () => "TaskCal";

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_700Bold,
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
  const setLanguage = async (lang) => {
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
  };

  // setThemeMode: save to Supabase
  const setThemeMode = async (mode) => {
    console.log(`🎨 Setting theme to: ${mode}`);
    setThemeModeState(mode);

    try {
      const result = await UserService.updateUserSettings({ theme: mode });
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

  const actualThemeMode = useMemo(() => {
    if (themeMode === "auto") {
      const systemTheme = systemColorScheme || Appearance.getColorScheme() || "light";
      console.log(`🎨 [Auto Mode] systemColorScheme: ${systemColorScheme}, Appearance.getColorScheme(): ${Appearance.getColorScheme()}, final: ${systemTheme}`);
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = getTheme(actualThemeMode);

  if (((!fontsLoaded || loadingLang || loadingTheme) && !fontTimeout) ||
      initialRoute === null) {
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
