/**
 * AdMob Banner 廣告組件
 * 可在應用程式的任何位置顯示橫幅廣告
 */

import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import AdService from "../services/adService";
import { UserService } from "../services/userService";
import { dataPreloadService } from "../services/dataPreloadService";

// 動態導入 Google Mobile Ads，如果不可用則為 null
let BannerAd = null;
let BannerAdSize = null;

// Only import on native platforms
if (Platform.OS !== "web") {
  try {
    const adsModule = require("react-native-google-mobile-ads");
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
  } catch (error) {
    console.warn("Google Mobile Ads components not available:", error.message);
  }
}

// 廣告暫停開關：設為 true 時全部用戶不顯示廣告，架構保留供日後重新啟用
const ADS_PAUSED = true;

/**
 * AdBanner 組件
 * @param {Object} props
 * @param {string} props.position - 廣告位置: 'top' | 'bottom' | 'center'
 * @param {string} props.size - 廣告尺寸: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBanner'
 * @param {boolean} props.enabled - 是否啟用廣告（可用於控制是否顯示）
 * @param {string} props.userType - 使用者類型（'general' | 'member'）
 * @param {boolean} props.loadingUserType - 是否正在載入 user_type（true 時不顯示廣告，避免 member 閃爍）
 * @param {Function} props.onAdLoaded - 廣告載入成功回調
 * @param {Function} props.onAdFailedToLoad - 廣告載入失敗回調
 */
const AdBanner = ({
  position = "bottom",
  size = "banner",
  enabled = true,
  userType,
  loadingUserType,
  onAdLoaded,
  onAdFailedToLoad,
  style,
}) => {
  const [adUnitId, setAdUnitId] = useState(null);
  const [adSize, setAdSize] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState(true);

  // 監聽傳入的 userType
  useEffect(() => {
    if (userType !== undefined && userType !== null) {
      setIsMember(userType === "member");
      setIsLoadingUserStatus(false);
    }
  }, [userType]);

  useEffect(() => {
    // 如果已經有傳入 userType，就不需要重複檢查
    if (userType) return;

    const checkUserStatus = async () => {
      try {
        // 優先檢查預載入緩存
        const cachedData = dataPreloadService.getCachedData();
        if (cachedData && cachedData.userSettings) {
          setIsMember(cachedData.userSettings.user_type === "member");
          setIsLoadingUserStatus(false);
          return;
        }

        // 如果沒有緩存，從 UserService 獲取
        const settings = await UserService.getUserSettings();
        if (settings) {
          setIsMember(settings.user_type === "member");
        }
      } catch (error) {
        console.error("Error checking user status for ads:", error);
      } finally {
        setIsLoadingUserStatus(false);
      }
    };

    checkUserStatus();
  }, []);

  useEffect(() => {
    // 如果模組不可用，不設置任何值
    if (!BannerAd || !BannerAdSize) {
      return;
    }

    // 獲取廣告單元 ID
    const unitId = AdService.getBannerAdUnitId();
    setAdUnitId(unitId);

    // 設置廣告尺寸
    const sizeMap = {
      banner: BannerAdSize.BANNER,
      largeBanner: BannerAdSize.LARGE_BANNER,
      mediumRectangle: BannerAdSize.MEDIUM_RECTANGLE,
      fullBanner: BannerAdSize.FULL_BANNER,
      leaderboard: BannerAdSize.LEADERBOARD,
      smartBanner: BannerAdSize.SMART_BANNER,
    };
    setAdSize(sizeMap[size] || BannerAdSize.BANNER);
  }, [size]);

  // 若從 Context 傳入 loadingUserType，尚未確認身份前不顯示廣告（避免 member 看到約 1 秒閃爍）
  const stillLoading =
    loadingUserType === true ||
    (loadingUserType !== false && isLoadingUserStatus);

  // 廣告暫停時直接不顯示
  if (ADS_PAUSED) {
    return null;
  }

  // 如果模組不可用、未啟用、是會員、正在載入用戶狀態、沒有廣告單元 ID 或是 Web 平台，不顯示廣告
  if (
    !BannerAd ||
    !enabled ||
    isMember ||
    stillLoading ||
    !adUnitId ||
    !adSize ||
    Platform.OS === "web"
  ) {
    return null;
  }

  const containerStyle = [
    styles.container,
    position === "top" && styles.topContainer,
    position === "bottom" && styles.bottomContainer,
    position === "center" && styles.centerContainer,
    style,
  ];

  return (
    <View style={containerStyle}>
      <BannerAd
        unitId={adUnitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false, // 可設置為 true 以符合 GDPR
        }}
        onAdLoaded={(ad) => {
          console.log("Banner ad loaded:", ad);
          onAdLoaded && onAdLoaded(ad);
        }}
        onAdFailedToLoad={(error) => {
          console.error("Banner ad failed to load:", error);
          onAdFailedToLoad && onAdFailedToLoad(error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  topContainer: {
    paddingTop: 8,
  },
  bottomContainer: {
    paddingBottom: 8,
  },
  centerContainer: {
    paddingVertical: 8,
  },
});

export default AdBanner;
