// 日期和時間格式化工具函數

/**
 * 將 "YYYY-MM-DD" 字串解析為本地時間的 Date（避免 new Date(str) 以 UTC 午夜
 * 解析，導致負時區用戶讀取到前一天）
 * @param {string} dateStr - "YYYY-MM-DD" 格式的日期字串
 * @returns {Date}
 */
export function parseLocalDateStr(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 格式化時間為 HH:MM（移除秒數）
 * @param {string} time - 時間字串，例如 "13:49:07" 或 "13:49"
 * @returns {string} 格式化後的時間字串 "13:49"
 */
export function formatTimeDisplay(time) {
  if (!time) return "";
  if (typeof time !== "string") return time;

  // 如果是 HH:MM:SS 格式，只取 HH:MM
  if (time.length > 5 && time.includes(":")) {
    return time.substring(0, 5);
  }

  return time;
}
