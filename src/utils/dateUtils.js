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
 * 格式化 Supabase 時間戳記為易讀格式
 * @param {string} timestamp - ISO 8601 格式的時間戳記，例如 "2025-12-21 13:49:07.803079+00"
 * @param {string} language - 語言代碼: "en", "zh-Hant", "es"
 * @param {boolean} includeTime - 是否包含時間（預設為 true）
 * @returns {string} 格式化後的時間字串
 *
 * @example
 * formatTimestamp("2025-12-21 13:49:07.803079+00", "zh-Hant")
 * // 返回: "2025年12月21日 13:49"
 *
 * formatTimestamp("2025-12-21 13:49:07.803079+00", "en")
 * // 返回: "Dec 21, 2025 1:49 PM"
 *
 * formatTimestamp("2025-12-21 13:49:07.803079+00", "es")
 * // 返回: "21 dic 2025 13:49"
 */
export function formatTimestamp(
  timestamp,
  language = "en",
  includeTime = true
) {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // 如果不是有效的日期，嘗試處理 Supabase 格式
      const cleanedTimestamp = timestamp.replace(/\.\d{6}/, ""); // 移除微秒
      const date2 = new Date(cleanedTimestamp);
      if (isNaN(date2.getTime())) {
        return timestamp; // 如果還是無效，返回原始值
      }
      return formatTimestamp(date2.toISOString(), language, includeTime);
    }

    if (language === "zh-Hant" || language === "zh") {
      // 繁體中文格式: "2025年12月21日 13:49"
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");

      if (includeTime) {
        return `${year}年${month}月${day}日 ${hours}:${minutes}`;
      } else {
        return `${year}年${month}月${day}日`;
      }
    } else if (language === "es") {
      // 西班牙文格式: "21 dic 2025 13:49"
      const months = [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");

      if (includeTime) {
        return `${day} ${month} ${year} ${hours}:${minutes}`;
      } else {
        return `${day} ${month} ${year}`;
      }
    } else {
      // 英文格式: "Dec 21, 2025 1:49 PM"
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;

      if (includeTime) {
        return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
      } else {
        return `${month} ${day}, ${year}`;
      }
    }
  } catch (error) {
    console.warn("Error formatting timestamp:", error);
    return timestamp;
  }
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
