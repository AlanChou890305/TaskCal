// Google Maps URL 的判斷 pattern，模組層級常數避免 isGoogleMapsUrl 每次呼叫都重建 RegExp
const GOOGLE_MAPS_URL_PATTERNS = [
  /^https?:\/\/(www\.)?(maps\.)?google\.(com|com\.\w{2,3}|co\.\w{2})\/maps/,
  /^https?:\/\/goo\.gl\/maps/,
  /^https?:\/\/maps\.app\.goo\.gl/,
];

/**
 * 檢測 URL 是否為 Google Maps 連結
 * @param {string} url - 要檢測的 URL
 * @returns {boolean} 是否為 Google Maps 連結
 */
export const isGoogleMapsUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  const normalizedUrl = url.trim().toLowerCase();

  return GOOGLE_MAPS_URL_PATTERNS.some((pattern) => pattern.test(normalizedUrl));
};

/**
 * 將 Google Maps URL 轉換為可在 WebView 中顯示的 URL
 * 對於 Google Maps，我們可以直接使用原始 URL，因為 Google Maps 會在移動端自動顯示地圖
 * 或者，我們可以將其轉換為 embed URL（需要用戶從 Google Maps 分享時選擇「嵌入地圖」）
 * 
 * 最簡單的方式：直接使用原始 URL，Google Maps 會自動適應
 * @param {string} url - Google Maps URL
 * @returns {string|null} 可用於 WebView 的 URL
 */
export const getGoogleMapsEmbedUrl = (url) => {
  if (!isGoogleMapsUrl(url)) return null;

  try {
    const normalizedUrl = url.trim();
    
    // 確保 URL 有協議前綴
    const fullUrl = normalizedUrl.startsWith("http") 
      ? normalizedUrl 
      : `https://${normalizedUrl}`;
    
    // 如果已經是 embed URL，直接返回
    if (fullUrl.includes("/embed")) {
      return fullUrl;
    }

    // 對於標準的 Google Maps URL，我們可以直接在 WebView 中顯示
    // Google Maps 會自動適應移動設備並顯示地圖
    return fullUrl;
  } catch (error) {
    console.error("Error getting Google Maps embed URL:", error);
    return null;
  }
};
