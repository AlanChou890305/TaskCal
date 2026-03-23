import { useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { versionService } from "../services/versionService";

const LAST_UPDATE_PROMPT_KEY = "LAST_UPDATE_PROMPT_INFO";

export const useVersionCheck = (language) => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isSimulatingUpdate, setIsSimulatingUpdate] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const checkShouldShowPrompt = async (latestVersion, forceUpdate) => {
      if (forceUpdate) return true;

      try {
        const storedInfo = await AsyncStorage.getItem(LAST_UPDATE_PROMPT_KEY);
        if (!storedInfo) return true;

        const { version, timestamp } = JSON.parse(storedInfo);

        if (versionService.compareVersions(latestVersion, version) > 0) {
          return true;
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return now - timestamp > oneDay;
      } catch (error) {
        console.error("Error checking version prompt frequency:", error);
        return true;
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

    const otaTimer = setTimeout(checkAndApplyOTA, 2000);
    const storeTimer = setTimeout(checkUpdateProactively, 3000);
    return () => {
      clearTimeout(otaTimer);
      clearTimeout(storeTimer);
    };
  }, []);

  return {
    updateInfo,
    setUpdateInfo,
    isUpdateModalVisible,
    setIsUpdateModalVisible,
    isSimulatingUpdate,
    setIsSimulatingUpdate,
  };
};
