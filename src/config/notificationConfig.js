import { PRIMARY } from "./theme";

/**
 * 通知配置文件
 *
 * 在這裡集中管理所有通知相關的設定
 */

/**
 * 任務提醒時間點設定（任務開始前幾分鐘）
 *
 * 預設：任務前 30 分鐘提醒一次
 *
 * 範例設定：
 * - 單次提醒：[30]
 * - 雙重提醒：[30, 10]  （任務前 30 分鐘和 10 分鐘各提醒一次）
 * - 多次提醒：[60, 30, 10]  （任務前 1 小時、30 分鐘、10 分鐘各提醒一次）
 *
 * ⚠️ 注意事項：
 * 1. 時間點必須大於 0
 * 2. 建議按降序排列（從大到小）
 * 3. 如果提醒時間已過，該提醒會自動跳過
 * 4. 修改此設定後需要重新構建 app（不能 OTA 更新）
 */
export const REMINDER_MINUTES_BEFORE_TASK = [30];

// 未來可以改為：
// export const REMINDER_MINUTES_BEFORE_TASK = [30, 10];

/**
 * 通知設定
 */
export const NOTIFICATION_CONFIG = {
  // 通知圖示顏色（Android）
  color: PRIMARY,

  // 通知優先級（Android）
  priority: "high", // 'default' | 'high' | 'max'

  // 通知音效
  sound: true,

  // 震動
  vibrate: true,

  // 通知頻道（Android）
  channelId: "default",
  channelName: "Task Reminders",
};

/**
 * 開發模式設定
 */
export const DEV_CONFIG = {
  // 開發模式下啟用詳細日誌
  verboseLogging: __DEV__,

  // 測試模式：使用短提醒時間（方便測試）
  // 設為 true 時，提醒時間改為任務前 1 分鐘
  testMode: false,
};

// 如果是測試模式，覆蓋提醒時間
export const getActiveReminderMinutes = () => {
  if (DEV_CONFIG.testMode) {
    return [1]; // 測試模式：任務前 1 分鐘提醒
  }
  return REMINDER_MINUTES_BEFORE_TASK;
};

