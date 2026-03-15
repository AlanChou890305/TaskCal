/**
 * AdMob 廣告服務
 * 管理應用程式中的廣告顯示邏輯
 */

import { Platform } from "react-native";

// 動態導入 Google Mobile Ads，如果不可用則為 null
let mobileAds = null;

// Only import on native platforms
if (Platform.OS !== "web") {
  try {
    mobileAds = require("react-native-google-mobile-ads").default;
  } catch (error) {
    console.warn("Google Mobile Ads not available:", error.message);
  }
}

// AdMob Application ID（從 Info.plist 讀取，如果讀取失敗則使用測試 ID）
const ADMOB_APP_ID = Platform.select({
  ios: "ca-app-pub-3940256099942544~1458002511", // iOS 測試 App ID
  android: "ca-app-pub-3940256099942544~3347511713", // Android 測試 App ID
  default: null,
});

// 測試廣告單元 ID（開發時使用）
const TEST_AD_UNIT_IDS = {
  ios: {
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    rewarded: "ca-app-pub-3940256099942544/1712485313",
  },
  android: {
    banner: "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    rewarded: "ca-app-pub-3940256099942544/5224354917",
  },
  web: {
    banner: "ca-app-pub-3940256099942544/6300978111", // 使用 Android 測試 ID
  },
};

// 生產環境廣告單元 ID（從 AdMob 控制台建立後貼上，見 docs/ADMOB_AD_UNITS_GUIDE.md）
// 建議命名：TaskCal - iOS - Banner - Main / TaskCal - Android - Banner - Main
const PRODUCTION_AD_UNIT_IDS = {
  ios: {
    banner: "ca-app-pub-6912116995419220/6735713860", // TaskCal - iOS - Banner - Main
    interstitial: "ca-app-pub-6912116995419220/REPLACE_WITH_INTERSTITIAL_ID", // TaskCal - iOS - Interstitial
    rewarded: "ca-app-pub-6912116995419220/REPLACE_WITH_REWARDED_ID", // TaskCal - iOS - Rewarded
  },
  android: {
    banner: "ca-app-pub-6912116995419220/REPLACE_WITH_BANNER_ID", // TaskCal - Android - Banner - Main
    interstitial: "ca-app-pub-6912116995419220/REPLACE_WITH_INTERSTITIAL_ID",
    rewarded: "ca-app-pub-6912116995419220/REPLACE_WITH_REWARDED_ID",
  },
  web: {
    banner: "ca-app-pub-6912116995419220/REPLACE_WITH_BANNER_ID",
  },
};

class AdService {
  static initialized = false;
  static isTestMode = __DEV__; // 開發模式下使用測試廣告

  /**
   * 初始化 AdMob
   */
  static async initialize() {
    if (this.initialized) {
      return;
    }

    // 如果模組不可用，標記為已初始化但實際上不執行任何操作
    if (!mobileAds) {
      this.initialized = true;
      console.warn("AdMob module not available, ads will be disabled");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        // 明確傳入 application ID 以確保 SDK 能找到
        const initOptions = ADMOB_APP_ID
          ? {
              requestConfiguration: {
                testDeviceIdentifiers: [], // 可以添加測試設備 ID
              },
            }
          : undefined;

        await mobileAds().initialize(initOptions);

        this.initialized = true;
        console.log("AdMob initialized successfully");
      } else {
        // Web 平台使用不同的初始化方式
        this.initialized = true;
        console.log("AdMob initialized for web platform");
      }
    } catch (error) {
      console.error("Failed to initialize AdMob:", error);
      // 即使初始化失敗，也標記為已初始化，避免重複嘗試
      this.initialized = true;
    }
  }

  /**
   * 獲取當前平台的廣告單元 ID
   */
  static getAdUnitId(adType = "banner") {
    const platform =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : "web";
    const adUnitIds = this.isTestMode
      ? TEST_AD_UNIT_IDS
      : PRODUCTION_AD_UNIT_IDS;
    return (
      adUnitIds[platform]?.[adType] || TEST_AD_UNIT_IDS[platform]?.[adType]
    );
  }

  /**
   * 獲取 Banner 廣告單元 ID
   */
  static getBannerAdUnitId() {
    return this.getAdUnitId("banner");
  }

  /**
   * 獲取 Interstitial 廣告單元 ID
   */
  static getInterstitialAdUnitId() {
    return this.getAdUnitId("interstitial");
  }

  /**
   * 獲取 Rewarded 廣告單元 ID
   */
  static getRewardedAdUnitId() {
    return this.getAdUnitId("rewarded");
  }

  /**
   * 檢查是否為測試模式
   */
  static isInTestMode() {
    return this.isTestMode;
  }

  /**
   * 設置測試模式（用於生產環境測試）
   */
  static setTestMode(enabled) {
    this.isTestMode = enabled;
  }
}

// 自動初始化
AdService.initialize();

export default AdService;
