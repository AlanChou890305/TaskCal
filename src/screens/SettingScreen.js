import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  Dimensions,
  Linking,
  StyleSheet,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Application from "expo-application";
import * as Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as StoreReview from "expo-store-review";
import Svg, { Path, Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext, ThemeContext, UserContext } from "../contexts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";
import { UserService } from "../services/userService";
import { versionService } from "../services/versionService";
import { getUpdateUrl } from "../config/updateUrls";
import { mixpanelService } from "../services/mixpanelService";
import { dataPreloadService } from "../services/dataPreloadService";
import { clearSessionCache } from "../services/sessionCache";
import { widgetService } from "../services/widgetService";
import {
  cancelAllNotifications,
  registerForPushNotificationsAsync,
  scheduleDailySummaryNotification,
  cancelDailySummaryNotification,
  DAILY_SUMMARY_ENABLED_KEY,
} from "../services/notificationService";
import AdBanner from "../components/AdBanner";
import IOSCard from "../components/IOSCard";
import IOSSectionHeader from "../components/IOSSectionHeader";

function SettingScreen() {
  const { language, setLanguage, t } = useContext(LanguageContext);
  const { theme, themeMode, setThemeMode } = useContext(ThemeContext);
  // iOS Switch 關閉時的軌道色需用「不透明」灰色；用半透明色會讓底下預設藍透出，
  // 造成關閉狀態出現左藍右灰的兩色錯覺。沿用 iOS 系統標準關閉色。
  const switchTrackOff = theme.mode === "dark" ? "#39393D" : "#E9E9EA";
  const {
    userType,
    loadingUserType,
    setUserType,
    setUpdateInfo,
    setIsUpdateModalVisible,
    isSimulatingUpdate,
    setIsSimulatingUpdate,
  } = useContext(UserContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState("");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const [userName, setUserName] = useState("User");
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [themeDropdownVisible, setThemeDropdownVisible] = useState(false);
  const [userTypeDropdownVisible, setUserTypeDropdownVisible] = useState(false);
  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    times: [30, 10, 5], // 預設30分鐘、10分鐘和5分鐘前提醒
  });
  // 遞增序號：只有「最新一次」updateReminderSettings 呼叫的背景回應/錯誤回退
  // 可以覆蓋 UI，避免使用者連續切換時，較舊的回應晚到蓋掉較新的操作意圖
  const reminderUpdateSeqRef = useRef(0);
  const [reminderDropdownVisible, setReminderDropdownVisible] = useState(false);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  // 模擬更新資料
  const effectiveHasUpdate = isSimulatingUpdate ? true : hasUpdate;
  const effectiveVersionInfo = isSimulatingUpdate
    ? {
        version: "1.2.1", // 模擬當前是舊版
        latestVersion: "1.2.2", // 模擬最新是 1.2.2
        releaseNotes: "這是一條模擬的更新說明，讓您測試非最新版使用者的畫面。",
        forceUpdate: false,
        updateUrl: "https://apps.apple.com/app/id6753785239",
      }
    : versionInfo;

  const [isCheckingVersion, setIsCheckingVersion] = useState(false);
  const navigation = useNavigation();

  const userProfileCache = useRef(null); // Cache user profile to avoid redundant API calls

  // 使用者類型切換處理 (僅限開發模式)
  const handleUserTypeChange = async (newType) => {
    try {
      setUserType(newType);
      await UserService.updateUserSettings({ user_type: newType });
      // 更新緩存
      dataPreloadService.updateCachedUserSettings({ user_type: newType });
      if (Platform.OS !== "web") {
        Alert.alert(t.devTools, t.userTypeUpdated);
      } else {
        alert(t.userTypeUpdated);
      }
    } catch (error) {
      console.error("Error updating user type:", error);
      if (Platform.OS !== "web") {
        Alert.alert(t.error, t.failedToUpdateUserType);
      } else {
        alert(t.failedToUpdateUserType);
      }
    }
  };

  // Function to open App Store write review page
  const openAppStoreReview = async () => {
    try {
      const appId = "6753785239";
      const writeReviewUrl = `itms-apps://itunes.apple.com/app/id${appId}?action=write-review`;
      const regularUrl = `itms-apps://itunes.apple.com/app/id${appId}`;
      const httpsWriteReviewUrl = `https://apps.apple.com/app/id${appId}?action=write-review`;
      const httpsUrl = `https://apps.apple.com/app/id${appId}`;

      if (Platform.OS === "web") {
        window.open(httpsWriteReviewUrl, "_blank");
        return;
      }

      if (Platform.OS === "android") {
        const playStoreUrl = `https://play.google.com/store/apps/details?id=com.cty0305.too.doo.list`;
        try {
          await Linking.openURL(playStoreUrl);
        } catch (error) {
          await WebBrowser.openBrowserAsync(playStoreUrl);
        }
        return;
      }

      // iOS: Try multiple methods to open App Store write review page
      let opened = false;

      // First try: itms-apps:// with write-review action (iOS 10.3+)
      try {
        const canOpen = await Linking.canOpenURL(writeReviewUrl);
        if (canOpen) {
          await Linking.openURL(writeReviewUrl);
          opened = true;
          console.log("✅ [RateUs] Opened App Store write review page");
        }
      } catch (itmsError) {
        console.warn(
          "⚠️ [RateUs] itms-apps:// write-review failed:",
          itmsError,
        );
      }

      // Second try: Regular itms-apps:// URL
      if (!opened) {
        try {
          const canOpen = await Linking.canOpenURL(regularUrl);
          if (canOpen) {
            await Linking.openURL(regularUrl);
            opened = true;
            console.log("✅ [RateUs] Opened App Store page");
          }
        } catch (regularError) {
          console.warn(
            "⚠️ [RateUs] Regular itms-apps:// failed:",
            regularError,
          );
        }
      }

      // Third try: HTTPS URL with write-review action via WebBrowser
      if (!opened) {
        try {
          await WebBrowser.openBrowserAsync(httpsWriteReviewUrl);
          opened = true;
          console.log(
            "✅ [RateUs] Opened App Store via WebBrowser (write-review)",
          );
        } catch (browserError) {
          console.warn(
            "⚠️ [RateUs] WebBrowser write-review failed:",
            browserError,
          );
        }
      }

      // Fourth try: Regular HTTPS URL via WebBrowser
      if (!opened) {
        try {
          await WebBrowser.openBrowserAsync(httpsUrl);
          opened = true;
          console.log("✅ [RateUs] Opened App Store via WebBrowser");
        } catch (browserError) {
          console.warn("⚠️ [RateUs] WebBrowser failed:", browserError);
        }
      }

      // Final fallback: HTTPS with Linking
      if (!opened) {
        try {
          await Linking.openURL(httpsUrl);
          opened = true;
          console.log("✅ [RateUs] Opened App Store via Linking (fallback)");
        } catch (linkingError) {
          console.error("❌ [RateUs] All methods failed:", linkingError);
          Alert.alert(
            t.rateUs || "Rate Us",
            "無法開啟 App Store，請手動前往 App Store 搜尋「TaskCal」進行評分和評論。",
          );
        }
      }
    } catch (error) {
      console.error("❌ [RateUs] Error opening App Store:", error);
      Alert.alert(
        t.rateUs || "Rate Us",
        "無法開啟 App Store，請手動前往 App Store 搜尋「TaskCal」進行評分和評論。",
      );
    }
  };

  // Check for app updates
  useEffect(() => {
    const checkVersion = async () => {
      if (Platform.OS === "web") {
        return; // Skip version check on web
      }

      setIsCheckingVersion(true);
      try {
        const updateInfo = await versionService.checkForUpdates(
          false,
          language,
        );
        const currentVersionInfo = versionService.getCurrentVersionInfo();

        // Combine current version info with update info
        setVersionInfo({
          ...currentVersionInfo,
          latestVersion: updateInfo.latestVersion,
          updateUrl: updateInfo.updateUrl,
          releaseNotes: updateInfo.releaseNotes,
          forceUpdate: updateInfo.forceUpdate,
        });
        setHasUpdate(updateInfo.hasUpdate);

        if (updateInfo.hasUpdate) {
          console.log(
            "🔔 [SettingScreen] Update available:",
            updateInfo.latestVersion,
          );
        }
      } catch (error) {
        console.error("❌ [SettingScreen] Error checking version:", error);
        const currentVersionInfo = versionService.getCurrentVersionInfo();
        setVersionInfo({
          ...currentVersionInfo,
          latestVersion: null,
          updateUrl: getUpdateUrl("production"),
        });
        setHasUpdate(false);
      } finally {
        setIsCheckingVersion(false);
      }
    };

    checkVersion();
  }, []);

  // Handle version item press - open App Store
  const handleVersionPress = async () => {
    if (Platform.OS === "web") {
      return;
    }

    // 如果有更新，顯示詳細的更新彈窗
    if (hasUpdate && versionInfo) {
      setUpdateInfo({
        ...versionInfo,
        releaseNotes: versionInfo.releaseNotes || "",
        forceUpdate: versionInfo.forceUpdate || false,
      });
      setIsUpdateModalVisible(true);
      return;
    }

    try {
      const httpsUrl = versionInfo?.updateUrl || getUpdateUrl("production");
      const appId = "6753785239"; // TaskCal App ID

      // Extract app ID from URL if not hardcoded
      const appIdMatch = httpsUrl.match(/\/id(\d+)/);
      const finalAppId = appIdMatch ? appIdMatch[1] : appId;

      // Check if running on simulator (simulator typically can't open itms-apps://)
      // In simulator, use HTTPS URL directly to avoid errors
      const isSimulator =
        Constants.deviceName?.includes("Simulator") ||
        Constants.isDevice === false ||
        __DEV__;

      if (isSimulator) {
        // In simulator, use HTTPS URL directly
        try {
          await Linking.openURL(httpsUrl);
          console.log(
            "🔗 [SettingScreen] Opened App Store (HTTPS - Simulator):",
            httpsUrl,
          );
          return;
        } catch (httpsError) {
          // Fallback to WebBrowser in simulator
          try {
            await WebBrowser.openBrowserAsync(httpsUrl);
            console.log(
              "🔗 [SettingScreen] Opened App Store (WebBrowser - Simulator):",
              httpsUrl,
            );
            return;
          } catch (browserError) {
            console.warn(
              "⚠️ [SettingScreen] Failed to open App Store in simulator:",
              browserError,
            );
          }
        }
      }

      // For real devices, try itms-apps:// first, then fallback to HTTPS
      const itmsUrl = `itms-apps://itunes.apple.com/app/id${finalAppId}`;

      // Check if we can open itms-apps:// URL scheme (silently catch errors)
      let canOpenItms = false;
      try {
        canOpenItms = await Linking.canOpenURL(itmsUrl);
      } catch (checkError) {
        // Silently ignore canOpenURL errors, will fallback to HTTPS
        canOpenItms = false;
      }

      if (canOpenItms) {
        // Try itms-apps:// first (best for real devices)
        try {
          await Linking.openURL(itmsUrl);
          console.log(
            "🔗 [SettingScreen] Opened App Store (itms-apps):",
            itmsUrl,
          );
          return;
        } catch (itmsError) {
          console.warn(
            "⚠️ [SettingScreen] itms-apps:// failed, trying HTTPS:",
            itmsError,
          );
        }
      }

      // Fallback to HTTPS URL
      try {
        await Linking.openURL(httpsUrl);
        console.log("🔗 [SettingScreen] Opened App Store (HTTPS):", httpsUrl);
      } catch (httpsError) {
        // Last resort: try using WebBrowser
        try {
          await WebBrowser.openBrowserAsync(httpsUrl);
          console.log(
            "🔗 [SettingScreen] Opened App Store (WebBrowser):",
            httpsUrl,
          );
        } catch (browserError) {
          console.warn(
            "⚠️ [SettingScreen] All methods failed to open App Store",
          );
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ [SettingScreen] Error opening App Store:",
        error.message,
      );
    }
  };

  useEffect(() => {
    const getUserProfile = async () => {
      setIsLoadingProfile(true);
      try {
        // 先檢查預載入的數據
        const cachedData = dataPreloadService.getCachedData();
        if (cachedData && cachedData.userProfile) {
          console.log("📦 [SettingScreen] Using preloaded user profile");
          userProfileCache.current = cachedData.userProfile;
          setUserProfile(cachedData.userProfile);
          setUserName(cachedData.userProfile.name);
          setIsLoadingProfile(false);
          return;
        }

        // Check cache first
        if (userProfileCache.current) {
          console.log("📦 [Cache] Using cached user profile");
          setUserProfile(userProfileCache.current);
          setUserName(userProfileCache.current.name);
          setIsLoadingProfile(false);
          return;
        }

        const profile = await UserService.getUserProfile();
        if (profile) {
          userProfileCache.current = profile; // Cache the profile
          setUserProfile(profile);
          setUserName(profile.name);
        } else {
          setUserName("User");
        }
      } catch (error) {
        console.error("Error retrieving user profile:", error);
        setUserName("User");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    getUserProfile();
  }, []);

  // 使用 ref 來追蹤是否已經載入過 reminder 設定，避免重新掛載時重置
  const reminderSettingsLoadedRef = useRef(false);

  // 載入提醒設定
  useEffect(() => {
    const loadReminderSettings = async () => {
      // 如果已經載入過且當前狀態不是預設值，不要重新載入
      // 這可以防止組件重新掛載時重置用戶的設定
      if (
        reminderSettingsLoadedRef.current &&
        JSON.stringify(reminderSettings) !==
          JSON.stringify({ enabled: true, times: [30, 10, 5] })
      ) {
        console.log(
          "📦 [SettingScreen] Reminder settings already loaded, skipping reload",
        );
        return;
      }

      setIsLoadingSettings(true);
      try {
        // 先檢查預載入的數據
        const cachedData = dataPreloadService.getCachedData();
        let settings = cachedData?.userSettings;

        if (!settings) {
          settings = await UserService.getUserSettings();
        } else {
          console.log("📦 [SettingScreen] Using preloaded user settings");
        }

        // getUserSettings 可能回傳 null，統一防護避免存取屬性 crash
        settings = settings || {};

        if (settings.user_type) {
          setUserType(settings.user_type);
        }

        if (
          settings.reminder_settings &&
          typeof settings.reminder_settings === "object"
        ) {
          const isEnabled = settings.reminder_settings.enabled === true;

          // 如果 enabled 為 false，只設置 enabled: false（不包含 times）
          // 如果 enabled 為 true，才包含 times 陣列
          if (isEnabled && Array.isArray(settings.reminder_settings.times)) {
            setReminderSettings({
              enabled: true,
              times: settings.reminder_settings.times || [30, 10, 5],
            });
          } else {
            // enabled 為 false 或沒有 times 陣列
            setReminderSettings({
              enabled: false,
              times: [30, 10, 5], // UI 顯示用，但不會存到 Supabase
            });
          }
        } else {
          // 確保有預設值
          setReminderSettings({
            enabled: true,
            times: [30, 10, 5],
          });
        }

        reminderSettingsLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading reminder settings:", error);
        // 錯誤時使用預設值
        setReminderSettings({
          enabled: true,
          times: [30, 10, 5],
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadReminderSettings();
  }, []); // 只在組件掛載時執行一次

  // 載入每日待辦提醒開關狀態（本地儲存）
  useEffect(() => {
    const loadDailySummarySetting = async () => {
      try {
        const value = await AsyncStorage.getItem(DAILY_SUMMARY_ENABLED_KEY);
        setDailySummaryEnabled(value === "true");
      } catch (error) {
        console.error("Error loading daily summary setting:", error);
      }
    };
    loadDailySummarySetting();
  }, []);

  // 切換每日待辦提醒（早上 7 點）
  const toggleDailySummary = async (value) => {
    try {
      if (value) {
        // 開啟：先請求通知權限
        const granted = await registerForPushNotificationsAsync();
        if (!granted) {
          // 權限被拒：還原開關並引導使用者到系統設定
          setDailySummaryEnabled(false);
          Alert.alert(
            t.notificationPermission || "Notification Permission",
            t.notificationPermissionMessage ||
              "Please enable notifications in Settings to receive daily reminders.",
            [
              { text: t.cancel || "Cancel", style: "cancel" },
              {
                text: t.enableNotifications || "Enable Notifications",
                onPress: () => Linking.openSettings(),
              },
            ],
          );
          return;
        }
        const ok = await scheduleDailySummaryNotification(t);
        if (ok) {
          await AsyncStorage.setItem(DAILY_SUMMARY_ENABLED_KEY, "true");
          setDailySummaryEnabled(true);
        } else {
          setDailySummaryEnabled(false);
        }
      } else {
        // 關閉：取消排程
        await cancelDailySummaryNotification();
        await AsyncStorage.setItem(DAILY_SUMMARY_ENABLED_KEY, "false");
        setDailySummaryEnabled(false);
      }
    } catch (error) {
      console.error("Error toggling daily summary:", error);
      // 還原開關並告知使用者，避免 Switch 無聲彈回原位
      setDailySummaryEnabled(!value);
      Alert.alert(
        t.error || "Error",
        t.dailySummaryToggleError || "Something went wrong. Please try again.",
      );
    }
  };

  // 注意：不再在語言切換時從緩存同步 reminder 設定
  // 因為用戶可能剛剛更新了 reminder 設定，應該保持當前狀態
  // 只有在組件首次載入時才從緩存讀取 reminder 設定

  // 當頁面獲得焦點時，關閉所有下拉選單
  useFocusEffect(
    React.useCallback(() => {
      setLanguageDropdownVisible(false);
      setThemeDropdownVisible(false);
      setReminderDropdownVisible(false);
    }, []),
  );

  // 更新提醒設定
  const updateReminderSettings = async (newSettings) => {
    const isEnabled = newSettings.enabled === true;
    const wasEnabled = reminderSettings?.enabled === true;

    // 如果 enabled 為 false，只存儲 { enabled: false }
    // 如果 enabled 為 true，才包含 times 陣列
    // 如果從 disabled 切換到 enabled，預設開啟所有三個時間
    const normalizedSettings = isEnabled
      ? {
          enabled: true,
          times:
            Array.isArray(newSettings.times) && newSettings.times.length > 0
              ? newSettings.times
              : [30, 10, 5], // 啟用時預設全開
        }
      : {
          enabled: false,
        };

    // 保存之前的設定，以便錯誤時恢復
    const previousSettings = { ...reminderSettings };

    // 標記這次呼叫的序號；之後只有仍是「最新一次」呼叫時才允許覆蓋 UI
    const mySeq = ++reminderUpdateSeqRef.current;

    // 樂觀更新：先更新 UI，讓用戶立即看到變化
    setReminderSettings(normalizedSettings);

    // 如果用戶關閉提醒，取消所有已安排的任務通知
    if (!isEnabled) {
      console.log(
        "Reminder notifications disabled, cancelling all task notifications",
      );
      // 在背景執行，不阻塞 UI
      cancelAllNotifications().catch((error) => {
        console.error("Error cancelling notifications:", error);
      });
    }

    // 在背景更新 Supabase，不阻塞 UI
    try {
      const result = await UserService.updateUserSettings({
        reminder_settings: normalizedSettings,
      });

      // 更新緩存，確保語言切換時不會讀取到舊的 reminder 設定
      if (result) {
        dataPreloadService.updateCachedUserSettings(result);
      }

      // 這次呼叫還在等待背景回應時，使用者已經又觸發了更新的一次呼叫，
      // 代表這裡拿到的是舊的回應，不該再覆蓋已經更新過的 UI
      if (reminderUpdateSeqRef.current !== mySeq) {
        return;
      }

      // 如果 Supabase 返回的結果與我們保存的不同，使用 Supabase 的結果
      // 這可以處理競態條件：如果用戶在更新期間切換語言，確保狀態一致
      if (result && result.reminder_settings) {
        const savedSettings = result.reminder_settings;
        const isSavedEnabled = savedSettings.enabled === true;
        if (isSavedEnabled && Array.isArray(savedSettings.times)) {
          // 只有當 Supabase 的結果與當前 UI 狀態不同時才更新
          if (
            savedSettings.enabled !== normalizedSettings.enabled ||
            JSON.stringify(savedSettings.times) !==
              JSON.stringify(normalizedSettings.times)
          ) {
            setReminderSettings({
              enabled: true,
              times: savedSettings.times || [30, 10, 5],
            });
          }
        } else if (!isSavedEnabled && normalizedSettings.enabled) {
          // Supabase 返回 disabled，但我們設置為 enabled，使用 Supabase 的結果
          setReminderSettings({
            enabled: false,
            times: [30, 10, 5],
          });
        }
      }
    } catch (error) {
      // 同上：這次呼叫已經不是最新一次，不該用它的錯誤回退覆蓋更新過的 UI
      if (reminderUpdateSeqRef.current !== mySeq) {
        return;
      }

      // 檢查是否為網絡錯誤
      const isNetworkError =
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("network") ||
        (!error.code && error.message);

      if (isNetworkError) {
        console.warn(
          "⚠️ Network error updating reminder settings. UI will revert to previous state.",
        );
        // 發生網絡錯誤時恢復之前的設定
        setReminderSettings(previousSettings);
      } else {
        console.error("❌ Error updating reminder settings:", {
          code: error.code,
          message: error.message,
        });
        // 發生其他錯誤時也恢復之前的設定
        setReminderSettings(previousSettings);
      }
    }
  };

  const openModal = (text) => {
    setModalText(text);
    setModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      setLogoutModalVisible(false);

      // Mixpanel: 追蹤登出事件
      mixpanelService.track("User Signed Out", {
        platform: Platform.OS,
      });
      mixpanelService.reset();

      // 清除預載入緩存和啟動快取
      dataPreloadService.clearCache();
      clearSessionCache();
      UserService.clearCachedAuthUser();
      AsyncStorage.removeItem("APP_SETTINGS_CACHE").catch(() => {});
      // 清除 Widget 資料，避免登出後 Widget 仍殘留上一位使用者的任務。
      // 直接呼叫而非依賴 onAuthStateChange 監聽器：SplashScreen 在登入成功後
      // 會被 navigation.reset 卸載，之後從此處登出時它的監聽器早已不存在。
      widgetService.clearWidgetData().catch((error) => {
        console.error("Failed to clear widget data on logout:", error);
      });

      // Try to log out (using Supabase's signOut API)
      // Even if this fails (e.g., network error), we should still navigate to splash
      // because the local session will be cleared
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn("Log out error (continuing anyway):", error);
          // Continue with navigation even if signOut fails
        }
      } catch (signOutError) {
        console.warn("Log out exception (continuing anyway):", signOutError);
        // Continue with navigation even if signOut throws
      }

      // Navigate back to splash screen immediately after logout
      // This should happen regardless of whether signOut succeeded or failed
      navigation.reset({
        index: 0,
        routes: [{ name: "Splash" }],
      });
    } catch (error) {
      console.error("Error logging out:", error);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        stack: error?.stack,
      });

      // Even if there's an error, try to navigate to splash screen
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: "Splash" }],
        });
      } catch (navError) {
        console.error("Error navigating to splash:", navError);
      }

      // Show detailed error message
      const errorMessage =
        error?.message || "Failed to log out. Please try again.";
      setModalText(t.logoutError || errorMessage);
      setModalVisible(true);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteAccountModalVisible(false);

      // Call deleteUser service
      await UserService.deleteUser();

      // Navigate back to splash screen after successful deletion
      navigation.reset({
        index: 0,
        routes: [{ name: "Splash" }],
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      const errorMessage =
        error?.message ||
        t.deleteAccountError ||
        "Failed to delete account. Please try again.";
      setModalText(errorMessage);
      setModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.modalBackground }}>
      <View
        style={{
          backgroundColor: theme.modalBackground,
          paddingHorizontal: 22,
          paddingTop: 16,
          paddingBottom: 14,
        }}
      >
        <Text
          style={{
            fontFamily:
              theme.typography?.monoKicker?.fontFamily ||
              "JetBrainsMono_500Medium",
            fontSize: 10,
            fontWeight: "500",
            letterSpacing: 2,
            textTransform: "uppercase",
            color: theme.primary,
            marginBottom: 4,
          }}
        >
          {t.settings}
        </Text>
        <Text
          style={{
            fontFamily: theme.typography?.title1?.fontFamily,
            fontSize: 30,
            fontWeight: "600",
            letterSpacing: -1.1,
            color: theme.text,
          }}
        >
          {t.preferences}
        </Text>
      </View>
      <ScrollView
        style={{
          flex: 1,
          paddingHorizontal: 0,
          backgroundColor: theme.modalBackground,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 6,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.rule,
            overflow: "hidden",
          }}
        >
          {/* Profile row */}
          <View
            style={{
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            {isLoadingProfile ? (
              <>
                <Animated.View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.shimmer,
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Animated.View
                    style={{
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: theme.shimmer,
                      width: "55%",
                      marginBottom: 7,
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.7],
                      }),
                    }}
                  />
                  <Animated.View
                    style={{
                      height: 12,
                      borderRadius: 4,
                      backgroundColor: theme.shimmer,
                      width: "40%",
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.7],
                      }),
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.primary,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: theme.typography?.title1?.fontFamily,
                        color: theme.buttonText || "#F2F1EB",
                        fontSize: 16,
                        fontWeight: "600",
                        letterSpacing: -0.4,
                      }}
                    >
                      {(userProfile?.name || userName || "U")
                        .split(" ")
                        .map((w) => w.charAt(0))
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: theme.typography?.title1?.fontFamily,
                      color: theme.text,
                      fontSize: 15,
                      fontWeight: "600",
                      letterSpacing: -0.2,
                    }}
                  >
                    {userProfile?.name || userName || "User"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: theme.typography?.body?.fontFamily,
                      color: theme.textSecondary,
                      fontSize: 12,
                      letterSpacing: 0,
                    }}
                  >
                    {userProfile?.email || "No email available"}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Login Method row */}
          {!isLoadingProfile && (
            <>
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.rule,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography?.body?.fontFamily,
                    color: theme.primary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {t.loginMethod}
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {userProfile?.provider === "google" ? (
                    <Svg width="16" height="16" viewBox="0 0 24 24">
                      <Path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <Path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <Path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <Path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </Svg>
                  ) : userProfile?.provider === "apple" ? (
                    <Ionicons name="logo-apple" size={16} color={theme.text} />
                  ) : null}
                  <Text
                    style={{
                      fontFamily: theme.typography?.body?.fontFamily,
                      color: theme.text,
                      fontSize: 14,
                    }}
                  >
                    {userProfile?.provider === "google"
                      ? "Google"
                      : userProfile?.provider === "apple"
                        ? "Apple"
                        : userProfile?.provider
                          ? userProfile.provider.charAt(0).toUpperCase() +
                            userProfile.provider.slice(1)
                          : "—"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Developer Tools */}
        {__DEV__ && (
          <>
            <IOSSectionHeader
              title={t.devTools || "Developer Tools"}
              theme={theme}
              style={{ paddingHorizontal: 28 }}
            />
            <IOSCard
              theme={theme}
              style={{ marginHorizontal: 20, padding: 0, overflow: "hidden" }}
            >
              <TouchableOpacity
                onPress={() => handleUserTypeChange("member")}
                activeOpacity={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  backgroundColor:
                    userType === "member"
                      ? theme.primaryTint || theme.backgroundSecondary
                      : "transparent",
                }}
              >
                <MaterialIcons
                  name="card-membership"
                  size={20}
                  color={
                    userType === "member" ? theme.primary : theme.textSecondary
                  }
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: userType === "member" ? theme.primary : theme.text,
                    fontSize: 15,
                    fontWeight: userType === "member" ? "600" : "400",
                  }}
                >
                  {t.switchToMember || "Switch to Member"}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.divider,
                  marginHorizontal: 20,
                }}
              />

              <TouchableOpacity
                onPress={() => handleUserTypeChange("general")}
                activeOpacity={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  backgroundColor:
                    userType === "general"
                      ? theme.primaryTint || theme.backgroundSecondary
                      : "transparent",
                }}
              >
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color={
                    userType === "general" ? theme.primary : theme.textSecondary
                  }
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: userType === "general" ? theme.primary : theme.text,
                    fontSize: 15,
                    fontWeight: userType === "general" ? "600" : "400",
                  }}
                >
                  {t.switchToGeneral || "Switch to General"}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.divider,
                  marginHorizontal: 20,
                }}
              />

              <TouchableOpacity
                onPress={async () => {
                  const result = await versionService.checkForUpdates(
                    true,
                    language,
                  );
                  setUpdateInfo({
                    latestVersion: result.latestVersion,
                    releaseNotes: result.releaseNotes,
                    forceUpdate: result.forceUpdate,
                    updateUrl: result.updateUrl,
                  });
                  setIsUpdateModalVisible(true);
                }}
                activeOpacity={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                }}
              >
                <MaterialIcons
                  name="system-update"
                  size={20}
                  color={theme.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ color: theme.text, fontSize: 15 }}>
                  {"Test Update Modal"}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.divider,
                  marginHorizontal: 20,
                }}
              />

              <TouchableOpacity
                onPress={() => setIsSimulatingUpdate(!isSimulatingUpdate)}
                activeOpacity={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  backgroundColor: isSimulatingUpdate
                    ? theme.primary + "10"
                    : "transparent",
                }}
              >
                <MaterialIcons
                  name={isSimulatingUpdate ? "toggle-on" : "toggle-off"}
                  size={24}
                  color={
                    isSimulatingUpdate ? theme.primary : theme.textSecondary
                  }
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: isSimulatingUpdate ? theme.primary : theme.text,
                      fontSize: 15,
                      fontWeight: isSimulatingUpdate ? "600" : "400",
                    }}
                  >
                    {"Simulate Update Available"}
                  </Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                    {"Force Settings UI to show 'Update Available'"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.divider,
                  marginHorizontal: 20,
                }}
              />

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem("onboarding_completed");
                    mixpanelService.track("Dev Force Logout + Onboarding");
                    mixpanelService.reset();
                    dataPreloadService.clearCache();
                    UserService.clearCachedAuthUser();
                    widgetService.clearWidgetData().catch(() => {});
                    try {
                      await supabase.auth.signOut({ scope: "local" });
                    } catch (e) {
                      console.warn("SignOut error (continuing):", e);
                    }
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "Onboarding" }],
                    });
                  } catch (error) {
                    console.error("Force logout + onboarding error:", error);
                    Alert.alert("Error", error.message);
                  }
                }}
                activeOpacity={0.6}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                }}
              >
                <MaterialIcons
                  name="restart-alt"
                  size={20}
                  color="#FF3B30"
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {"Force Logout + Onboarding"}
                  </Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                    {"Sign out and reset onboarding state"}
                  </Text>
                </View>
              </TouchableOpacity>
            </IOSCard>
          </>
        )}

        {/* General Section */}
        <IOSSectionHeader title={t.general} theme={theme} />
        <View
          style={{
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: theme.rule,
            overflow: "hidden",
          }}
        >
          {/* Language Selection */}
          <TouchableOpacity
            onPress={() => {
              setLanguageDropdownVisible(!languageDropdownVisible);
              setThemeDropdownVisible(false);
              setReminderDropdownVisible(false);
            }}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
              borderBottomWidth: 1,
              borderBottomColor: languageDropdownVisible
                ? "transparent"
                : theme.rule,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <MaterialIcons
                name="language"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.language}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: theme.textTertiary,
                  fontSize: 13,
                  letterSpacing: -0.1,
                  marginRight: 4,
                }}
              >
                {language === "en"
                  ? t.english
                  : language === "zh"
                    ? t.chinese
                    : t.spanish}
              </Text>
              <MaterialIcons
                name={
                  languageDropdownVisible
                    ? "keyboard-arrow-up"
                    : "chevron-right"
                }
                size={14}
                color={theme.textTertiary}
              />
            </View>
          </TouchableOpacity>

          {languageDropdownVisible && (
            <>
              {[
                { value: "en", label: t.english },
                { value: "zh", label: t.chinese },
                { value: "es", label: t.spanish },
              ].map((option) => {
                const active = language === option.value;
                return (
                  <React.Fragment key={option.value}>
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: theme.rule,
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setLanguage(option.value);
                        setLanguageDropdownVisible(false);
                      }}
                      activeOpacity={0.6}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 14,
                        paddingHorizontal: 22,
                        backgroundColor: active
                          ? theme.primaryTint
                          : theme.background,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: theme.typography?.body?.fontFamily,
                          color: active ? theme.primary : theme.text,
                          fontSize: 15,
                          fontWeight: active ? "600" : "400",
                          letterSpacing: -0.2,
                        }}
                      >
                        {option.label}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* Theme Selection */}
          <TouchableOpacity
            onPress={() => {
              setThemeDropdownVisible(!themeDropdownVisible);
              setLanguageDropdownVisible(false);
              setReminderDropdownVisible(false);
            }}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
              borderBottomWidth: 1,
              borderBottomColor: themeDropdownVisible
                ? "transparent"
                : theme.rule,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <MaterialIcons
                name="palette"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.theme}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: theme.textTertiary,
                  fontSize: 13,
                  letterSpacing: -0.1,
                  marginRight: 4,
                }}
              >
                {themeMode === "light"
                  ? t.lightMode
                  : themeMode === "dark"
                    ? t.darkMode
                    : t.autoMode || "Auto"}
              </Text>
              <MaterialIcons
                name={
                  themeDropdownVisible ? "keyboard-arrow-down" : "chevron-right"
                }
                size={14}
                color={theme.textTertiary}
              />
            </View>
          </TouchableOpacity>

          {themeDropdownVisible && (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.rule,
              }}
            >
              {[
                {
                  value: "auto",
                  label: t.autoModeShort || "Auto",
                  icon: "contrast-outline",
                },
                {
                  value: "light",
                  label: t.lightModeShort || "Light",
                  icon: "sunny-outline",
                },
                {
                  value: "dark",
                  label: t.darkModeShort || "Dark",
                  icon: "moon-outline",
                },
              ].map((option) => {
                const active = themeMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setThemeMode(option.value);
                      setThemeDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 16,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? theme.primary : theme.rule,
                      backgroundColor: active
                        ? theme.primaryTint
                        : theme.background,
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={active ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={{
                        fontFamily: theme.typography?.body?.fontFamily,
                        color: active ? theme.primary : theme.text,
                        fontSize: 13,
                        fontWeight: active ? "600" : "400",
                        letterSpacing: -0.1,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Reminder Settings */}
          <TouchableOpacity
            onPress={() => {
              setReminderDropdownVisible(!reminderDropdownVisible);
              setLanguageDropdownVisible(false);
              setThemeDropdownVisible(false);
            }}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              {isLoadingSettings ? (
                <Animated.View
                  style={{
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: theme.shimmer,
                    width: "60%",
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  }}
                />
              ) : (
                <>
                  <MaterialIcons
                    name="notifications"
                    size={18}
                    color={theme.textSecondary}
                    style={{ marginRight: 14 }}
                  />
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 15,
                      fontWeight: "500",
                      letterSpacing: -0.2,
                    }}
                  >
                    {t.reminderSettings}
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {!isLoadingSettings && (
                <Text
                  style={{
                    color: theme.textTertiary,
                    fontSize: 13,
                    letterSpacing: -0.1,
                    marginRight: 4,
                  }}
                >
                  {reminderSettings?.enabled === true
                    ? t.reminderEnabled || "Enable"
                    : t.reminderOffShort || "Off"}
                </Text>
              )}
              <MaterialIcons
                name={
                  reminderDropdownVisible
                    ? "keyboard-arrow-down"
                    : "chevron-right"
                }
                size={14}
                color={theme.textTertiary}
              />
            </View>
          </TouchableOpacity>

          {reminderDropdownVisible && (
            <>
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.rule,
                }}
              />

              {/* Enable reminders toggle row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 14,
                  paddingHorizontal: 22,
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography?.body?.fontFamily,
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "500",
                    letterSpacing: -0.2,
                  }}
                >
                  {t.enableReminders || "Enable reminders"}
                </Text>
                <Switch
                  value={reminderSettings?.enabled === true}
                  onValueChange={(value) => {
                    try {
                      const newTimes = value
                        ? [30, 10, 5]
                        : Array.isArray(reminderSettings?.times)
                          ? reminderSettings.times
                          : [30, 10, 5];
                      updateReminderSettings({
                        enabled: value,
                        times: newTimes,
                      });
                    } catch (error) {
                      console.error("Error toggling reminder enabled:", error);
                    }
                  }}
                  trackColor={{
                    false: switchTrackOff,
                    true: theme.primary,
                  }}
                  ios_backgroundColor={switchTrackOff}
                />
              </View>

              {reminderSettings?.enabled !== false && (
                <>
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: theme.rule,
                    }}
                  />

                  {/* NOTIFY BEFORE TASK kicker */}
                  <View
                    style={{
                      paddingHorizontal: 22,
                      paddingTop: 12,
                      paddingBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily:
                          theme.typography?.monoKicker?.fontFamily ||
                          "JetBrainsMono_500Medium",
                        fontSize: 10,
                        fontWeight: "500",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: theme.textTertiary,
                      }}
                    >
                      {t.notifyBeforeTask || "Notify before task"}
                    </Text>
                  </View>

                  {/* Pill buttons row */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingBottom: 14,
                    }}
                  >
                    {[
                      { value: 30, label: t.reminder30minShort || "30 min" },
                      { value: 10, label: t.reminder10minShort || "10 min" },
                      { value: 5, label: t.reminder5minShort || "5 min" },
                    ].map((option) => {
                      const times = Array.isArray(reminderSettings.times)
                        ? reminderSettings.times
                        : [30, 10, 5];
                      const isSelected = times.includes(option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            const currentTimes = Array.isArray(
                              reminderSettings.times,
                            )
                              ? reminderSettings.times
                              : [30, 10, 5];
                            const newTimes = isSelected
                              ? currentTimes.filter(
                                  (time) => time !== option.value,
                                )
                              : [...currentTimes, option.value].sort(
                                  (a, b) => b - a,
                                );
                            updateReminderSettings({
                              ...reminderSettings,
                              times: newTimes,
                            });
                          }}
                          activeOpacity={0.7}
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 13,
                            borderRadius: 50,
                            borderWidth: 1.5,
                            borderColor: isSelected
                              ? theme.primary
                              : theme.rule,
                            backgroundColor: isSelected
                              ? theme.primaryTint
                              : theme.background,
                            gap: 5,
                          }}
                        >
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color={theme.primary}
                            />
                          )}
                          <Text
                            style={{
                              fontFamily: theme.typography?.body?.fontFamily,
                              color: isSelected ? theme.primary : theme.text,
                              fontSize: 14,
                              fontWeight: isSelected ? "600" : "400",
                              letterSpacing: -0.1,
                            }}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: theme.rule,
                    }}
                  />
                  <View style={{ paddingHorizontal: 22, paddingVertical: 10 }}>
                    <Text
                      style={{
                        fontFamily: theme.typography?.caption?.fontFamily,
                        color: theme.textTertiary,
                        fontSize: 12,
                        letterSpacing: -0.1,
                      }}
                    >
                      {t.reminderNote}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}

          {/* Divider above daily to-do reminder */}
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.rule,
            }}
          />

          {/* Daily to-do reminder (07:00 local time) toggle row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                marginRight: 12,
              }}
            >
              <MaterialIcons
                name="wb-sunny"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "500",
                    letterSpacing: -0.2,
                  }}
                >
                  {t.dailySummaryReminder || "Daily to-do reminder"}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.typography?.caption?.fontFamily,
                    color: theme.textTertiary,
                    fontSize: 12,
                    letterSpacing: -0.1,
                    marginTop: 2,
                  }}
                >
                  {t.dailySummaryCaption ||
                    "A 7:00 AM nudge to check today's to-dos"}
                </Text>
              </View>
            </View>
            <Switch
              value={dailySummaryEnabled}
              onValueChange={(value) => {
                toggleDailySummary(value).catch((error) =>
                  console.error("Error toggling daily summary:", error),
                );
              }}
              trackColor={{
                false: switchTrackOff,
                true: theme.primary,
              }}
              ios_backgroundColor={switchTrackOff}
            />
          </View>
        </View>

        {/* Support & Legal Section */}
        <IOSSectionHeader
          title={t.legalAndSupport || "Support & Legal"}
          theme={theme}
        />
        <View
          style={{
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: theme.rule,
            overflow: "hidden",
          }}
        >
          {/* Send Feedback Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Support")}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
              borderBottomWidth: 1,
              borderBottomColor: theme.rule,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <MaterialIcons
                name="feedback"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.feedback || "Send Feedback"}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={14}
              color={theme.textTertiary}
            />
          </TouchableOpacity>

          {/* Terms of Use */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Terms")}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
              borderBottomWidth: 1,
              borderBottomColor: theme.rule,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <MaterialIcons
                name="description"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.terms}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={14}
              color={theme.textTertiary}
            />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Privacy")}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <MaterialIcons
                name="privacy-tip"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.privacy}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={14}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        {Platform.OS !== "web" && (
          <>
            <IOSSectionHeader title={t.about || "About"} theme={theme} />
            <View
              style={{
                marginHorizontal: 16,
                borderWidth: 1,
                borderColor: theme.rule,
                overflow: "hidden",
              }}
            >
              {effectiveHasUpdate ? (
                <TouchableOpacity
                  onPress={handleVersionPress}
                  activeOpacity={0.6}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 22,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <MaterialIcons
                      name="system-update"
                      size={18}
                      color={theme.textSecondary}
                      style={{ marginRight: 14 }}
                    />
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 15,
                        fontWeight: "500",
                        letterSpacing: -0.2,
                      }}
                    >
                      {t.version}{" "}
                      {effectiveVersionInfo?.version ||
                        Application.nativeApplicationVersion ||
                        "1.2.9"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: theme.primary + "20",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: theme.primary + "60",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          fontSize: 10,
                          fontWeight: "700",
                          letterSpacing: 0.3,
                        }}
                      >
                        {t.updateAvailable || "Download Latest"}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="open-in-new"
                      size={14}
                      color={theme.primary}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 22,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={theme.textSecondary}
                      style={{ marginRight: 14 }}
                    />
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 15,
                        fontWeight: "500",
                        letterSpacing: -0.2,
                      }}
                    >
                      {t.version}{" "}
                      {effectiveVersionInfo?.version ||
                        Application.nativeApplicationVersion ||
                        "1.2.9"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.textTertiary,
                      fontSize: 13,
                      letterSpacing: -0.1,
                    }}
                  >
                    {t.latestVersion || "Latest"}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Log Out Button */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 32,
            borderWidth: 1,
            borderColor: theme.rule,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setLogoutModalVisible(true);
            }}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              paddingHorizontal: 22,
            }}
          >
            <MaterialIcons
              name="logout"
              size={18}
              color={theme.error}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: theme.error,
                fontSize: 15,
                fontWeight: "600",
                letterSpacing: -0.2,
              }}
            >
              {t.logout || "Log out"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <TouchableOpacity
          onPress={() => {
            setDeleteAccountModalVisible(true);
          }}
          activeOpacity={0.6}
          style={{
            alignItems: "center",
            marginTop: 12,
            marginBottom: 40,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              opacity: 0.8,
            }}
          >
            <MaterialIcons
              name="delete-outline"
              size={16}
              color={theme.textTertiary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: theme.textTertiary,
                fontSize: 13,
                fontWeight: "500",
                textDecorationLine: "underline",
              }}
            >
              {t.deleteAccount || "Delete Account"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Developer Tools (Only in __DEV__ mode) */}
        {/* Banner Ad at bottom of settings */}
        <AdBanner
          position="bottom"
          size="banner"
          userType={userType}
          loadingUserType={loadingUserType}
        />
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
        accessibilityViewIsModal={true}
        accessibilityLabel="Information Modal"
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.modalBackground,
              padding: 32,
              borderRadius: 12,
              minWidth: 220,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18, color: theme.text, marginBottom: 16 }}>
              {modalText}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 8,
                paddingVertical: 6,
                paddingHorizontal: 18,
                backgroundColor: theme.button,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: theme.buttonText, fontSize: 16 }}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
        accessibilityViewIsModal={true}
        accessibilityLabel="Logout Confirmation Modal"
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setLogoutModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.modalBackground,
              borderRadius: 12,
              minWidth: 280,
              maxWidth: 320,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 24, paddingBottom: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.text,
                  textAlign: "center",
                  fontWeight: "600",
                  lineHeight: 24,
                }}
              >
                {t.logoutConfirm}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.divider,
                width: "100%",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                width: "100%",
              }}
            >
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRightWidth: 1,
                  borderRightColor: theme.divider,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 17,
                    fontWeight: "400",
                  }}
                >
                  {t.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.error,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  {t.logout}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteAccountModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteAccountModalVisible(false)}
        accessibilityViewIsModal={true}
        accessibilityLabel="Delete Account Confirmation Modal"
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.modalOverlay,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setDeleteAccountModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.modalBackground,
              borderRadius: 12,
              minWidth: 280,
              maxWidth: 320,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 24, paddingBottom: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.text,
                  textAlign: "center",
                  fontWeight: "600",
                  lineHeight: 24,
                  marginBottom: 12,
                }}
              >
                {t.deleteAccount || "Delete Account"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {t.deleteAccountConfirm}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.divider,
                width: "100%",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                width: "100%",
              }}
            >
              <TouchableOpacity
                onPress={() => setDeleteAccountModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRightWidth: 1,
                  borderRightColor: theme.divider,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 17,
                    fontWeight: "400",
                  }}
                >
                  {t.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.error,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  {t.delete}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default SettingScreen;
