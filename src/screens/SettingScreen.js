import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Animated,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Application from "expo-application";
import * as Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as StoreReview from "expo-store-review";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  cancelAllTaskNotifications,
  registerForPushNotificationsAsync,
  scheduleDailySummaryNotification,
  cancelDailySummaryNotification,
  DAILY_SUMMARY_ENABLED_KEY,
} from "../services/notificationService";
import AdBanner from "../components/AdBanner";
import IOSSectionHeader from "../components/IOSSectionHeader";
import { ProfileCard } from "../components/settings/ProfileCard";
import { DeveloperToolsCard } from "../components/settings/DeveloperToolsCard";
import { GeneralSettingsCard } from "../components/settings/GeneralSettingsCard";
import { SupportLegalCard } from "../components/settings/SupportLegalCard";
import { AboutVersionCard } from "../components/settings/AboutVersionCard";

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
    // shimmer 只有載入中才有視覺用途，載入完成後主動停止，
    // 不要只靠 unmount 才停（Settings 畫面常駐掛載數分鐘）
    if (!isLoadingProfile && !isLoadingSettings) {
      return undefined;
    }
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
  }, [isLoadingProfile, isLoadingSettings, shimmerAnim]);
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
  const handleUserTypeChange = useCallback(
    async (newType) => {
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
    },
    [setUserType, t],
  );

  // Developer Tools: 測試更新彈窗
  const handleTestUpdateModal = useCallback(async () => {
    const result = await versionService.checkForUpdates(true, language);
    setUpdateInfo({
      latestVersion: result.latestVersion,
      releaseNotes: result.releaseNotes,
      forceUpdate: result.forceUpdate,
      updateUrl: result.updateUrl,
    });
    setIsUpdateModalVisible(true);
  }, [language, setUpdateInfo, setIsUpdateModalVisible]);

  // Developer Tools: 切換模擬更新狀態
  const handleToggleSimulateUpdate = useCallback(() => {
    setIsSimulatingUpdate(!isSimulatingUpdate);
  }, [isSimulatingUpdate, setIsSimulatingUpdate]);

  // Developer Tools: 強制登出並重置 onboarding 狀態
  const handleForceLogoutOnboarding = useCallback(async () => {
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
  }, [navigation]);

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
  const handleVersionPress = useCallback(async () => {
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
  }, [hasUpdate, versionInfo, setUpdateInfo, setIsUpdateModalVisible]);

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
  const toggleDailySummary = useCallback(
    async (value) => {
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
          t.dailySummaryToggleError ||
            "Something went wrong. Please try again.",
        );
      }
    },
    [t],
  );

  const handleDailySummaryToggle = useCallback(
    (value) => {
      toggleDailySummary(value).catch((error) =>
        console.error("Error toggling daily summary:", error),
      );
    },
    [toggleDailySummary],
  );

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
  const updateReminderSettings = useCallback(
    async (newSettings) => {
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
        // 在背景執行，不阻塞 UI（只取消任務提醒，保留每日摘要通知）
        cancelAllTaskNotifications().catch((error) => {
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
    },
    [reminderSettings],
  );

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

      // 清除預載入緩存和啟動快取，避免刪帳號後短時間內登入其他帳號
      // 讀到已刪除用戶殘留在記憶體快取中的設定/任務（cache TTL 內都會命中）
      dataPreloadService.clearCache();
      clearSessionCache();

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
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.modalBackground }}
    >
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
        <ProfileCard
          theme={theme}
          t={t}
          isLoadingProfile={isLoadingProfile}
          userProfile={userProfile}
          userName={userName}
          shimmerAnim={shimmerAnim}
        />

        {/* Developer Tools */}
        {__DEV__ && (
          <DeveloperToolsCard
            theme={theme}
            t={t}
            userType={userType}
            isSimulatingUpdate={isSimulatingUpdate}
            onSwitchUserType={handleUserTypeChange}
            onTestUpdateModal={handleTestUpdateModal}
            onToggleSimulateUpdate={handleToggleSimulateUpdate}
            onForceLogoutOnboarding={handleForceLogoutOnboarding}
          />
        )}

        {/* General Section */}
        <IOSSectionHeader title={t.general} theme={theme} />
        <GeneralSettingsCard
          theme={theme}
          t={t}
          switchTrackOff={switchTrackOff}
          language={language}
          setLanguage={setLanguage}
          languageDropdownVisible={languageDropdownVisible}
          setLanguageDropdownVisible={setLanguageDropdownVisible}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          themeDropdownVisible={themeDropdownVisible}
          setThemeDropdownVisible={setThemeDropdownVisible}
          reminderSettings={reminderSettings}
          isLoadingSettings={isLoadingSettings}
          reminderDropdownVisible={reminderDropdownVisible}
          setReminderDropdownVisible={setReminderDropdownVisible}
          shimmerAnim={shimmerAnim}
          onUpdateReminderSettings={updateReminderSettings}
          dailySummaryEnabled={dailySummaryEnabled}
          onToggleDailySummary={handleDailySummaryToggle}
        />

        {/* Support & Legal Section */}
        <IOSSectionHeader
          title={t.legalAndSupport || "Support & Legal"}
          theme={theme}
        />
        <SupportLegalCard theme={theme} t={t} navigation={navigation} />

        {/* About Section */}
        {Platform.OS !== "web" && (
          <>
            <IOSSectionHeader title={t.about || "About"} theme={theme} />
            <AboutVersionCard
              theme={theme}
              t={t}
              effectiveHasUpdate={effectiveHasUpdate}
              effectiveVersionInfo={effectiveVersionInfo}
              onVersionPress={handleVersionPress}
            />
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
