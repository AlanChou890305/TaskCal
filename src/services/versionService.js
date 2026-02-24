import { Platform } from "react-native";
import * as Application from "expo-application";
import { supabase } from "../../supabaseClient";
import { getUpdateUrl } from "../config/updateUrls";

/**
 * 版本檢查服務
 * 檢查當前版本是否為最新版本，並提供更新提示
 */
class VersionService {
  constructor() {
    this.currentVersion = Application.nativeApplicationVersion || "1.2.9";
    this.currentBuildNumber = Application.nativeBuildVersion || "17";
    this.latestVersion = null;
    this.updateUrl = null;
    // 快取機制：快取版本檢查結果 5 分鐘（依語言分別快取）
    this.cache = {
      data: null,
      timestamp: null,
      language: null, // 記錄快取的語言
      ttl: 5 * 60 * 1000, // 5 分鐘
    };
    // 追蹤版本登記狀態，避免重複查詢
    this.versionRegistrationChecked = false;
  }

  /**
   * 檢查快取是否有效
   * @param {string} language - 當前語言
   * @returns {boolean} 快取是否有效
   */
  isCacheValid(language) {
    if (!this.cache.data || !this.cache.timestamp || !this.cache.language) {
      return false;
    }
    // 如果語言不同，快取無效
    if (this.cache.language !== language) {
      return false;
    }
    const now = Date.now();
    return now - this.cache.timestamp < this.cache.ttl;
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;
    this.cache.language = null;
  }

  /**
   * 解析多語系 release notes
   * @param {string|object} releaseNotes - release notes (可以是字串或 JSON 物件)
   * @param {string} language - 使用者語言代碼 ('en', 'zh', 'es' 等)
   * @returns {string|null} 對應語言的 release notes
   */
  parseReleaseNotes(releaseNotes, language = "en") {
    if (!releaseNotes) return null;

    // 如果是字串，嘗試解析為 JSON
    if (typeof releaseNotes === "string") {
      try {
        const parsed = JSON.parse(releaseNotes);
        // 如果是物件，使用對應語言的版本
        if (typeof parsed === "object" && parsed !== null) {
          // 語言代碼映射：zh -> zh-TW
          const langKey = language === "zh" ? "zh-TW" : language;
          return parsed[langKey] || parsed["en"] || releaseNotes;
        }
        // 如果不是物件，返回原字串
        return releaseNotes;
      } catch (e) {
        // JSON 解析失敗，返回原字串
        console.warn("⚠️ [VersionCheck] Release notes JSON parse failed:", e.message);
        return releaseNotes;
      }
    }

    // 如果已經是物件，直接使用對應語言
    if (typeof releaseNotes === "object" && releaseNotes !== null) {
      const langKey = language === "zh" ? "zh-TW" : language;
      return releaseNotes[langKey] || releaseNotes["en"] || null;
    }

    return releaseNotes;
  }

  /**
   * 檢查版本更新
   * @param {boolean} forceRefresh - 強制重新檢查，忽略快取
   * @param {string} language - 使用者語言代碼 ('en', 'zh', 'es')，用於取得對應語言的 release notes
   * @returns {Promise<{hasUpdate: boolean, latestVersion: string, updateUrl: string}>}
   */
  async checkForUpdates(forceRefresh = false, language = "en") {
    try {
      console.log("🔍 [VersionCheck] 開始檢查版本更新...");
      console.log("🔍 [VersionCheck] 當前版本:", this.currentVersion);
      console.log("🔍 [VersionCheck] 當前 Build:", this.currentBuildNumber);
      console.log("🔍 [VersionCheck] 當前平台:", Platform.OS);

      // Web 版本會自動更新，不需要檢查版本
      if (Platform.OS === "web") {
        console.log("🌐 [VersionCheck] Web 平台 - 跳過版本檢查（自動更新）");
        return {
          hasUpdate: false,
          latestVersion: this.currentVersion,
          updateUrl: null,
          releaseNotes: null,
          forceUpdate: false,
        };
      }

      // 檢查快取（包含語言檢查）
      if (!forceRefresh && this.isCacheValid(language)) {
        console.log("📦 [VersionCheck] 使用快取結果 (language:", language, ")");
        return this.cache.data;
      }

      // 確保當前版本已登記（僅在首次檢查時執行，避免重複查詢）
      if (!this.versionRegistrationChecked) {
        this.versionRegistrationChecked = true;
        this.ensureVersionRegistered().catch((err) => {
          // 靜默處理 RLS 錯誤（不影響版本檢查功能）
          if (err.code !== "42501") {
            console.warn("⚠️ [VersionCheck] 自動登記版本時出錯:", err);
          }
        });
      }

      // 從 Supabase 獲取最新版本資訊
      const { data, error } = await supabase
        .from("app_versions")
        .select(
          "version, build_number, update_url, force_update, release_notes",
        )
        .eq("platform", Platform.OS)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log("⚠️ [VersionCheck] 無法獲取版本資訊:", error.message);
        // 如果無法獲取版本資訊，根據環境使用預設值
        const defaultUpdateUrl = this.getDefaultUpdateUrl();
        const result = {
          hasUpdate: false,
          latestVersion: this.currentVersion,
          updateUrl: defaultUpdateUrl,
          releaseNotes: null,
          forceUpdate: false,
          buildNumber: this.currentBuildNumber,
        };
        // 即使錯誤也快取結果，避免頻繁查詢
        this.cache.data = result;
        this.cache.timestamp = Date.now();
        this.cache.language = language;
        return result;
      }

      this.latestVersion = data.version;
      // 如果資料庫中有 update_url，使用資料庫的值；否則根據環境決定
      this.updateUrl = data.update_url || this.getDefaultUpdateUrl();

      console.log("🔍 [VersionCheck] 最新版本:", this.latestVersion);
      console.log("🔍 [VersionCheck] 最新 Build:", data.build_number);

      // 比較版本號和 build number
      const versionComparison = this.compareVersions(
        this.currentVersion,
        this.latestVersion,
      );
      const buildComparison = this.compareBuildNumbers(
        this.currentBuildNumber,
        data.build_number,
      );

      // 如果版本號相同，則比較 build number
      const hasUpdate =
        versionComparison < 0 ||
        (versionComparison === 0 && buildComparison < 0);

      console.log("🔍 [VersionCheck] 需要更新:", hasUpdate);

      // 解析多語系 release notes
      const releaseNotes = this.parseReleaseNotes(data.release_notes, language);

      const result = {
        hasUpdate,
        latestVersion: this.latestVersion,
        updateUrl: this.updateUrl,
        releaseNotes,
        forceUpdate: data.force_update,
        buildNumber: data.build_number,
      };

      // 快取結果（包含語言）
      this.cache.data = result;
      this.cache.timestamp = Date.now();
      this.cache.language = language;

      return result;
    } catch (error) {
      console.error("❌ [VersionCheck] 版本檢查失敗:", error);
      const result = {
        hasUpdate: false,
        latestVersion: this.currentVersion,
        updateUrl: null,
        releaseNotes: null,
        forceUpdate: false,
        buildNumber: this.currentBuildNumber,
      };
      // 錯誤時也快取結果，避免頻繁查詢
      this.cache.data = result;
      this.cache.timestamp = Date.now();
      this.cache.language = language;
      return result;
    }
  }

  /**
   * 根據環境獲取預設更新連結
   * @returns {string} 更新連結
   */
  getDefaultUpdateUrl() {
    return getUpdateUrl("production");
  }

  /**
   * 比較版本號
   * @param {string} current - 當前版本
   * @param {string} latest - 最新版本
   * @returns {number} -1: 需要更新, 0: 相同, 1: 當前版本較新
   */
  compareVersions(current, latest) {
    if (!current || !latest) return 0;

    const currentParts = current.split(".").map(Number);
    const latestParts = latest.split(".").map(Number);

    // 確保兩個版本號都有相同的部分數
    const maxLength = Math.max(currentParts.length, latestParts.length);

    for (let i = 0; i < maxLength; i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (currentPart < latestPart) return -1;
      if (currentPart > latestPart) return 1;
    }

    return 0;
  }

  /**
   * 比較 Build Number
   * @param {string|number} current - 當前 Build Number
   * @param {string|number} latest - 最新 Build Number
   * @returns {number} -1: 需要更新, 0: 相同, 1: 當前版本較新
   */
  compareBuildNumbers(current, latest) {
    if (!current || !latest) return 0;

    const currentBuild =
      typeof current === "string" ? parseInt(current, 10) : current;
    const latestBuild =
      typeof latest === "string" ? parseInt(latest, 10) : latest;

    if (isNaN(currentBuild) || isNaN(latestBuild)) return 0;

    if (currentBuild < latestBuild) return -1;
    if (currentBuild > latestBuild) return 1;
    return 0;
  }

  /**
   * 開啟更新連結
   * @param {string} updateUrl - 更新 URL（可選，如果不提供則根據環境決定）
   */
  async openUpdateUrl(updateUrl = null) {
    try {
      const url = updateUrl || this.getDefaultUpdateUrl();
      console.log("🔗 [VersionCheck] 開啟更新連結:", url);

      const { openBrowserAsync } = await import("expo-web-browser");
      await openBrowserAsync(url);
    } catch (error) {
      console.error("❌ [VersionCheck] 無法開啟更新連結:", error);
    }
  }

  /**
   * 獲取當前版本資訊
   */
  getCurrentVersionInfo() {
    return {
      version: this.currentVersion,
      buildNumber: this.currentBuildNumber,
      platform: Platform.OS,
    };
  }

  /**
   * 自動登記版本到 Supabase
   * 在發布新版本時調用此函數，自動將版本資訊插入資料庫
   * @param {Object} options - 版本資訊選項
   * @param {string} options.version - 版本號（可選，預設使用當前版本）
   * @param {string} options.buildNumber - Build 號碼（可選，預設使用當前 Build）
   * @param {string} options.platform - 平台（可選，預設使用當前平台）
   * @param {string} options.updateUrl - 更新連結（可選，預設使用生產環境連結）
   * @param {boolean} options.forceUpdate - 是否為強制更新（可選，預設 false）
   * @param {string} options.releaseNotes - 更新說明（可選）
   * @param {boolean} options.setAsActive - 是否設為活躍版本並將舊版本設為非活躍（可選，預設 true）
   * @returns {Promise<{success: boolean, message: string, data?: any}>}
   */
  async registerVersion(options = {}) {
    try {
      // Web 平台不需要登記版本
      if (Platform.OS === "web") {
        return {
          success: false,
          message: "Web 平台不需要登記版本（自動更新）",
        };
      }

      const version = options.version || this.currentVersion;
      const buildNumber = options.buildNumber || this.currentBuildNumber;
      const platform = options.platform || Platform.OS;
      const updateUrl = options.updateUrl || this.getDefaultUpdateUrl();
      const forceUpdate = options.forceUpdate || false;
      const releaseNotes = options.releaseNotes || null;
      const setAsActive = options.setAsActive !== false; // 預設為 true

      console.log("📝 [VersionRegister] 開始登記版本:", {
        version,
        buildNumber,
        platform,
      });

      // 檢查版本是否已存在
      const { data: existingVersion, error: checkError } = await supabase
        .from("app_versions")
        .select("id, version, is_active")
        .eq("version", version)
        .eq("platform", platform)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 是 "not found" 錯誤，這是正常的
        console.error("❌ [VersionRegister] 檢查版本時出錯:", checkError);
        return {
          success: false,
          message: `檢查版本時出錯: ${checkError.message}`,
        };
      }

      if (existingVersion) {
        console.log("ℹ️ [VersionRegister] 版本已存在:", existingVersion);
        return {
          success: true,
          message: "版本已存在於資料庫中",
          data: existingVersion,
        };
      }

      // 如果需要設為活躍版本，先將舊版本設為非活躍
      if (setAsActive) {
        const { error: updateError } = await supabase
          .from("app_versions")
          .update({ is_active: false })
          .eq("platform", platform)
          .eq("is_active", true);

        if (updateError) {
          console.warn(
            "⚠️ [VersionRegister] 更新舊版本狀態時出錯:",
            updateError,
          );
          // 繼續執行，不中斷流程
        } else {
          console.log("✅ [VersionRegister] 已將舊版本設為非活躍");
        }
      }

      // 插入新版本記錄
      const { data: newVersion, error: insertError } = await supabase
        .from("app_versions")
        .insert({
          version,
          build_number: buildNumber,
          platform,
          is_active: setAsActive,
          update_url: updateUrl,
          force_update: forceUpdate,
          release_notes: releaseNotes,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ [VersionRegister] 插入版本記錄失敗:", insertError);
        return {
          success: false,
          message: `插入版本記錄失敗: ${insertError.message}`,
        };
      }

      console.log("✅ [VersionRegister] 版本登記成功:", newVersion);
      return {
        success: true,
        message: "版本登記成功",
        data: newVersion,
      };
    } catch (error) {
      console.error("❌ [VersionRegister] 登記版本時發生錯誤:", error);
      return {
        success: false,
        message: `登記版本時發生錯誤: ${error.message}`,
      };
    }
  }

  /**
   * 檢查並自動登記當前版本（如果版本不存在於資料庫中）
   * 在版本檢查時調用，確保當前版本已登記
   * @returns {Promise<void>}
   */
  async ensureVersionRegistered() {
    try {
      if (Platform.OS === "web") {
        return;
      }

      // 🛠️ 開發環境不自動註冊，避免誤觸發用戶更新提示
      if (__DEV__) {
        console.log("🛠️ [VersionRegister] 開發環境，跳過自動註冊");
        return;
      }

      const { data, error } = await supabase
        .from("app_versions")
        .select("id")
        .eq("version", this.currentVersion)
        .eq("platform", Platform.OS)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("⚠️ [VersionRegister] 檢查版本登記狀態時出錯:", error);
        return;
      }

      // 如果版本不存在，自動登記（但不設為活躍版本）
      if (!data) {
        console.log(
          "📝 [VersionRegister] 當前版本未登記，自動登記中...",
          this.currentVersion,
        );
        const result = await this.registerVersion({
          setAsActive: false, // 🔴 改為 false：新版本預設不活躍，需手動在 App Store 發布後才設為 true
        });
        if (result.success) {
          console.log("✅ [VersionRegister] 自動登記成功（is_active=false）");
        } else {
          console.warn("⚠️ [VersionRegister] 自動登記失敗:", result.message);
        }
      }
    } catch (error) {
      console.warn("⚠️ [VersionRegister] 確保版本登記時出錯:", error);
    }
  }
}

export const versionService = new VersionService();
