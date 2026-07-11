import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";
import * as StoreReview from "expo-store-review";
import * as WebBrowser from "expo-web-browser";
import { mixpanelService } from "./mixpanelService";

// App Store 評論引導服務
// 策略：在「爽點時刻」（累計完成待辦達里程碑）以原生 in-app 彈窗請求評分，
// 並加上自家節流，避免打擾使用者。

const APP_STORE_ID = "6753785239";
const ANDROID_PACKAGE = "com.cty0305.too.doo.list";

// AsyncStorage keys
const COMPLETED_COUNT_KEY = "review_completed_count";
const LAST_PROMPT_AT_KEY = "review_last_prompt_at";
const PROMPT_COUNT_KEY = "review_prompt_count"; // 同時作為「下一個門檻」的索引
const DISTINCT_DAYS_KEY = "review_distinct_days"; // 完成過待辦的不同日子數
const LAST_ACTIVE_DAY_KEY = "review_last_active_day"; // 最近一次完成待辦的日期 (YYYY-MM-DD)

// 觸發門檻：累計完成待辦數 >= 門檻時嘗試請求評分（依序使用）
// 針對「少量、低頻、多數人最多建 3 個 Task」的真實使用行為設計：
// 第一次在完成第 3 個待辦後觸發，後續門檻給少數重度使用者
const COMPLETION_THRESHOLDS = [3, 10, 30];

// 回訪過濾：至少在 N 個不同日子完成過待辦才請求評分
// 過濾掉裝了就走的使用者，換取更高品質的好評
const MIN_DISTINCT_DAYS = 2;

// 節流參數
const MIN_DAYS_BETWEEN_PROMPTS = 45;
const MAX_LIFETIME_PROMPTS = COMPLETION_THRESHOLDS.length;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * 取得今天的本地日期字串 (YYYY-MM-DD)。
 */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 記錄一次待辦完成，並在符合條件時請求 App Store 評分。
 * 應在使用者「完成待辦」成功後呼叫（爽點時刻）。
 * 此函式不會 throw，所有錯誤都會被吞掉，避免影響主流程。
 */
async function recordTaskCompletionAndMaybePrompt() {
  // 原生彈窗只在 iOS / Android 有意義
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  try {
    // 一次讀出這輪判斷需要的所有 key，取代原本 4 次序列化 getItem
    const entries = await AsyncStorage.multiGet([
      COMPLETED_COUNT_KEY,
      LAST_ACTIVE_DAY_KEY,
      DISTINCT_DAYS_KEY,
      PROMPT_COUNT_KEY,
      LAST_PROMPT_AT_KEY,
    ]);
    const values = Object.fromEntries(entries);

    // 1. 累計完成數 +1
    const count = parseInt(values[COMPLETED_COUNT_KEY] || "0", 10) + 1;

    // 2. 更新「完成過待辦的不同日子數」（回訪訊號）
    // 只在跟上次記錄的日期不同時 +1，計數有上界、不會無限成長。
    const today = todayKey();
    const isNewActiveDay = values[LAST_ACTIVE_DAY_KEY] !== today;
    let distinctDays = parseInt(values[DISTINCT_DAYS_KEY] || "0", 10);
    if (isNewActiveDay) distinctDays += 1;

    // 3. 取得已彈次數（同時作為下一個門檻的索引）
    const promptCount = parseInt(values[PROMPT_COUNT_KEY] || "0", 10);

    // 一次寫入本輪一定需要更新的 key，取代原本最多 2 次序列化 setItem
    const writes = [[COMPLETED_COUNT_KEY, String(count)]];
    if (isNewActiveDay) {
      writes.push([DISTINCT_DAYS_KEY, String(distinctDays)]);
      writes.push([LAST_ACTIVE_DAY_KEY, today]);
    }
    await AsyncStorage.multiSet(writes);

    // 4. 是否達成所有條件
    if (!shouldPrompt(count, distinctDays, promptCount)) return;

    // 5. 節流：兩次彈窗間隔天數
    if (!passesCooldown(values[LAST_PROMPT_AT_KEY])) return;

    // 6. 原生彈窗
    await requestNativeReview(count, promptCount);
  } catch (error) {
    console.warn("⚠️ [Review] recordTaskCompletionAndMaybePrompt failed:", error);
  }
}

/**
 * 判斷是否達成請求評分的條件（不含時間節流）。
 * - 已彈次數未達終生上限
 * - 累計完成數 >= 對應門檻
 * - 完成過待辦的不同日子數 >= 回訪門檻
 */
function shouldPrompt(count, distinctDays, promptCount) {
  if (promptCount >= MAX_LIFETIME_PROMPTS) return false;
  if (distinctDays < MIN_DISTINCT_DAYS) return false;

  const threshold = COMPLETION_THRESHOLDS[promptCount];
  if (count < threshold) return false;

  return true;
}

/**
 * 節流：兩次彈窗至少間隔 MIN_DAYS_BETWEEN_PROMPTS 天。
 * @param {string|null} lastPromptAt - 上次彈窗時間（已由呼叫端批次讀出）
 */
function passesCooldown(lastPromptAt) {
  if (lastPromptAt) {
    const elapsed = Date.now() - new Date(lastPromptAt).getTime();
    if (elapsed < MIN_DAYS_BETWEEN_PROMPTS * DAY_IN_MS) return false;
  }
  return true;
}

/**
 * 呼叫原生 in-app 評論彈窗，並記錄已彈出。
 * @param {number} count 觸發當下的累計完成數
 * @param {number} promptCount 彈出前的已彈次數（門檻索引）
 */
async function requestNativeReview(count, promptCount) {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      console.log("ℹ️ [Review] StoreReview not available on this device");
      return;
    }

    await StoreReview.requestReview();

    // 記錄彈出（注意：requestReview 不保證一定顯示，由系統決定，
    // 但我們仍計入節流，避免過度嘗試）
    await AsyncStorage.multiSet([
      [PROMPT_COUNT_KEY, String(promptCount + 1)],
      [LAST_PROMPT_AT_KEY, new Date().toISOString()],
    ]);

    mixpanelService.track("Review Prompt Shown", {
      completed_count: count,
      platform: Platform.OS,
      prompt_count: promptCount + 1,
    });

    console.log(
      `✅ [Review] requestReview shown at completed_count=${count} (prompt #${promptCount + 1})`,
    );
  } catch (error) {
    console.warn("⚠️ [Review] requestNativeReview failed:", error);
  }
}

/**
 * 開啟 App Store 評論頁（URL fallback）。
 * 供「給我們評分」按鈕等明確使用者操作呼叫，會把使用者導離 app。
 * 回傳是否成功開啟。
 */
async function openStoreReviewPage() {
  try {
    const writeReviewUrl = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
    const regularUrl = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}`;
    const httpsWriteReviewUrl = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
    const httpsUrl = `https://apps.apple.com/app/id${APP_STORE_ID}`;

    if (Platform.OS === "web") {
      window.open(httpsWriteReviewUrl, "_blank");
      return true;
    }

    if (Platform.OS === "android") {
      const playStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
      try {
        await Linking.openURL(playStoreUrl);
      } catch (error) {
        await WebBrowser.openBrowserAsync(playStoreUrl);
      }
      return true;
    }

    // iOS：依序嘗試多種方式
    const attempts = [
      async () => {
        if (await Linking.canOpenURL(writeReviewUrl)) {
          await Linking.openURL(writeReviewUrl);
          return true;
        }
        return false;
      },
      async () => {
        if (await Linking.canOpenURL(regularUrl)) {
          await Linking.openURL(regularUrl);
          return true;
        }
        return false;
      },
      async () => {
        await WebBrowser.openBrowserAsync(httpsWriteReviewUrl);
        return true;
      },
      async () => {
        await Linking.openURL(httpsUrl);
        return true;
      },
    ];

    for (const attempt of attempts) {
      try {
        if (await attempt()) return true;
      } catch (error) {
        // 嘗試下一種方式
      }
    }
    return false;
  } catch (error) {
    console.error("❌ [Review] openStoreReviewPage failed:", error);
    return false;
  }
}

export const reviewService = {
  recordTaskCompletionAndMaybePrompt,
  openStoreReviewPage,
};
