/**
 * 主題配置 — Indigo v2.0.0
 * 設計方向：ink-blue 墨水色 (#3B4B7A) 搭配暖奶油紙色 (#F2F1EB)
 */

// ============================================================
// 品牌常數
// ============================================================
export const PRIMARY       = "#3B4B7A";  // accent — ink-blue
export const PRIMARY_LIGHT = "#8B98D0";  // dark-mode accent
export const PRIMARY_SOFT  = "#D2D7E8";  // chip bg, subtle fills
export const PRIMARY_TINT  = "#E6E9F2";  // calendar-selected bg, info pill
export const PRIMARY_WASH  = "#3B4B7A";  // onboarding hero bg (rides on accent)

// ============================================================
// 字型家族常數（Commit 2 安裝字型後生效）
// ============================================================
export const FONT_SANS = "InterTight_400Regular";
export const FONT_MONO = "JetBrainsMono_500Medium";
export const FONT_TC   = "NotoSansTC_400Regular";

// ============================================================
// Indigo 字型 scale（editorial，全面負向 tracking）
// ============================================================
const typography = {
  display:     { fontFamily: "InterTight_600SemiBold", fontSize: 38, lineHeight: 40, fontWeight: "600", letterSpacing: -1.6 },
  largeTitle:  { fontFamily: "InterTight_600SemiBold", fontSize: 34, lineHeight: 36, fontWeight: "600", letterSpacing: -1.3 },
  title1:      { fontFamily: "InterTight_600SemiBold", fontSize: 28, lineHeight: 32, fontWeight: "600", letterSpacing: -0.8 },
  title2:      { fontFamily: "InterTight_600SemiBold", fontSize: 22, lineHeight: 28, fontWeight: "600", letterSpacing: -0.5 },
  title3:      { fontFamily: "InterTight_600SemiBold", fontSize: 20, lineHeight: 24, fontWeight: "600", letterSpacing: -0.5 },
  headline:    { fontFamily: "InterTight_600SemiBold", fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.2 },
  body:        { fontFamily: "InterTight_400Regular",  fontSize: 15, lineHeight: 22, fontWeight: "400", letterSpacing: -0.15 },
  callout:     { fontFamily: "InterTight_500Medium",   fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: -0.15 },
  subheadline: { fontFamily: "InterTight_400Regular",  fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.1 },
  footnote:    { fontFamily: "InterTight_400Regular",  fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  caption1:    { fontFamily: "InterTight_500Medium",   fontSize: 11, lineHeight: 14, fontWeight: "500", letterSpacing: 0 },
  caption2:    { fontFamily: "InterTight_500Medium",   fontSize: 10, lineHeight: 13, fontWeight: "500", letterSpacing: 0 },
  // Mono styles — timestamps, kickers, day numbers, counters, version stamps
  monoTime:    { fontFamily: "JetBrainsMono_500Medium", fontSize: 13, lineHeight: 16, fontWeight: "500", letterSpacing: -0.2 },
  monoKicker:  { fontFamily: "JetBrainsMono_500Medium", fontSize: 10, lineHeight: 14, fontWeight: "500", letterSpacing: 2.0 },
  monoSection: { fontFamily: "JetBrainsMono_500Medium", fontSize: 9,  lineHeight: 13, fontWeight: "500", letterSpacing: 1.5 },
  monoDay:     { fontFamily: "JetBrainsMono_500Medium", fontSize: 14, lineHeight: 18, fontWeight: "500", letterSpacing: -0.3 },
};

// ============================================================
// Spacing — cardPadding 從 16 提升到 20，其餘不變
// ============================================================
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 16,
  cardPadding: 20,
  sectionGap: 24,
  listItemHeight: 44,
};

// ============================================================
// Radius — 全面縮小，lg 預設從 12 降到 8
// ============================================================
const radius = {
  xs: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  pill: 999,
};

// ============================================================
// Light theme
// ============================================================
export const lightTheme = {
  mode: "light",

  // 品牌
  primary: PRIMARY,
  primaryLight: PRIMARY_LIGHT,
  primarySoft: PRIMARY_SOFT,
  primaryTint: PRIMARY_TINT,
  primaryWash: PRIMARY_WASH,

  // 背景 — paper system（兩層）
  background: "#F2F1EB",
  backgroundSecondary: "#E9E7DE",

  // 卡片
  card: "#F2F1EB",
  cardBorder: "rgba(26,31,46,0.12)",

  // 文字 — ink scale
  text: "#1A1F2E",
  textSecondary: "#454C66",
  textTertiary: "#8E94AA",
  textPlaceholder: "#8E94AA",

  // 輸入框
  input: "#F2F1EB",
  inputBorder: "rgba(26,31,46,0.12)",
  inputBorderFocused: PRIMARY,

  // 按鈕
  button: PRIMARY,
  buttonText: "#F2F1EB",
  buttonSecondary: "transparent",
  buttonSecondaryText: "#1A1F2E",
  buttonSecondaryBorder: "rgba(26,31,46,0.22)",

  // 狀態顏色 — 紙色友善的靜態色
  success: "#4F7B5A",
  error: "#B14A3E",
  warning: "#B07A2C",
  info: "#3B4B7A",

  // 分隔線 / 規則線
  divider: "rgba(26,31,46,0.12)",
  rule: "rgba(26,31,46,0.12)",
  ruleStrong: "rgba(26,31,46,0.22)",

  // 陰影 — Indigo 走 flat，只有 elevated/floating/FAB 保留
  shadow: "#1A1F2E",
  shadowOpacity: 0.08,
  shadows: {
    card:        {},  // none — hairline 取代 shadow
    elevated:    { shadowColor: "#1A1F2E", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,  elevation: 2 },
    floating:    { shadowColor: "#1A1F2E", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 6 },
    primaryGlow: { shadowColor: "#3B4B7A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 14, elevation: 4 },
  },

  // Shimmer / skeleton
  shimmer: "rgba(26,31,46,0.06)",

  // 複選框
  checkbox: PRIMARY,
  checkboxUnchecked: "#8E94AA",

  // Modal
  modalOverlay: "rgba(26,31,46,0.55)",
  modalBackground: "#F2F1EB",

  // Tab Bar
  tabBarBackground: "#F2F1EB",
  tabBarActive: PRIMARY,
  tabBarInactive: "#8E94AA",

  // Calendar
  calendarHeader: "#1A1F2E",
  calendarHeaderText: "#1A1F2E",
  calendarToday: PRIMARY,
  calendarTodayText: "#F2F1EB",
  calendarWeekend: "#1A1F2E",
  calendarSelected: "#3B4B7A",

  // Task rows
  taskChecked: "#8E94AA",
  taskUnchecked: "#1A1F2E",
  taskTime: "#454C66",

  // 向下相容的快捷圓角 token
  borderRadius: 8,
  borderRadiusSmall: 4,
  borderRadiusLarge: 12,

  // iOS Design System
  typography,
  spacing,
  radius,
};

// ============================================================
// Dark theme
// ============================================================
export const darkTheme = {
  mode: "dark",

  // 品牌 — 深色背景上提亮 accent 確保可讀性
  primary: PRIMARY_LIGHT,
  primaryLight: "#9AAEE0",
  primarySoft: "#2A2F4D",
  primaryTint: "#1F2440",
  primaryWash: "#1F2440",

  // 背景 — deep paper
  background: "#14182A",
  backgroundSecondary: "#1E2438",

  // 卡片
  card: "#1E2438",
  cardBorder: "rgba(255,255,255,0.08)",

  // 文字
  text: "#ECE9E2",
  textSecondary: "#B4B8CA",
  textTertiary: "#7C8198",
  textPlaceholder: "#7C8198",

  // 輸入框
  input: "#1E2438",
  inputBorder: "rgba(255,255,255,0.08)",
  inputBorderFocused: PRIMARY_LIGHT,

  // 按鈕
  button: PRIMARY_LIGHT,
  buttonText: "#14182A",
  buttonSecondary: "transparent",
  buttonSecondaryText: "#ECE9E2",
  buttonSecondaryBorder: "rgba(255,255,255,0.16)",

  // 狀態顏色
  success: "#6A9B75",
  error: "#D4736A",
  warning: "#CFA050",
  info: PRIMARY_LIGHT,

  // 分隔線
  divider: "rgba(255,255,255,0.08)",
  rule: "rgba(255,255,255,0.08)",
  ruleStrong: "rgba(255,255,255,0.16)",

  // 陰影 — 深色模式 opacity 約 2.5×
  shadow: "#000000",
  shadowOpacity: 0.40,
  shadows: {
    card:        {},
    elevated:    { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.40, shadowRadius: 8,  elevation: 2 },
    floating:    { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 6 },
    primaryGlow: { shadowColor: "#8B98D0", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 4 },
  },

  // Shimmer
  shimmer: "rgba(255,255,255,0.06)",

  // 複選框
  checkbox: PRIMARY_LIGHT,
  checkboxUnchecked: "#7C8198",

  // Modal
  modalOverlay: "rgba(0,0,0,0.65)",
  modalBackground: "#14182A",

  // Tab Bar
  tabBarBackground: "#14182A",
  tabBarActive: PRIMARY_LIGHT,
  tabBarInactive: "#7C8198",

  // Calendar
  calendarHeader: "#ECE9E2",
  calendarHeaderText: "#ECE9E2",
  calendarToday: PRIMARY_LIGHT,
  calendarTodayText: "#14182A",
  calendarWeekend: "#ECE9E2",
  calendarSelected: PRIMARY_LIGHT,

  // Task rows
  taskChecked: "#7C8198",
  taskUnchecked: "#ECE9E2",
  taskTime: "#B4B8CA",

  // 向下相容
  borderRadius: 8,
  borderRadiusSmall: 4,
  borderRadiusLarge: 12,

  // iOS Design System
  typography,
  spacing,
  radius,
};

/**
 * 根據主題模式返回對應的主題
 */
export const getTheme = (mode) => {
  return mode === "dark" ? darkTheme : lightTheme;
};
