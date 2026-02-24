/**
 * 主題配置
 * 支援淺色模式（Light）和深色模式（Dark）
 */

// ============================================================
// 主題色（改這裡就能同步更新所有顏色）
// ============================================================
export const PRIMARY = "#6c63ff";
export const PRIMARY_LIGHT = "#8b84ff";
export const PRIMARY_DARK = "#5649d6";

// iOS Typography Scale (Apple HIG)
const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.37 },
  title1:     { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.36 },
  title2:     { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  title3:     { fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: 0.38 },
  headline:   { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.41 },
  body:       { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.41 },
  callout:    { fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.32 },
  subheadline:{ fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.24 },
  footnote:   { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
  caption1:   { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  caption2:   { fontSize: 11, lineHeight: 13, fontWeight: "400", letterSpacing: 0.07 },
};

// iOS Spacing Scale
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  listItemHeight: 44,
};

// iOS Border Radius Scale
const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 999,
};

export const lightTheme = {
  mode: "light",

  // 主要顏色
  primary: PRIMARY,
  primaryLight: PRIMARY_LIGHT,
  primaryDark: PRIMARY_DARK,

  // 背景色
  background: "#ffffff",
  backgroundSecondary: "#f5f5f5",
  backgroundTertiary: "#e8e8e8",

  // 卡片/容器
  card: "#ffffff",
  cardBorder: "#e0e0e0",

  // 文字顏色
  text: "#000000",
  textSecondary: "#666666",
  textTertiary: "#888888",
  textPlaceholder: "#888888",

  // 輸入框
  input: "#ffffff",
  inputBorder: "#ddd",
  inputBorderFocused: PRIMARY,

  // 按鈕
  button: PRIMARY,
  buttonText: "#ffffff",
  buttonSecondary: "#f0f0f0",
  buttonSecondaryText: "#333333",

  // 狀態顏色
  success: "#4caf50",
  error: "#ff4444",
  warning: "#ff9800",
  info: "#2196f3",

  // 分隔線
  divider: "#e0e0e0",

  // 陰影
  shadow: "#000000",
  shadowOpacity: 0.1,
  shadows: {
    card:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8,  elevation: 1 },
    elevated: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 },
    floating: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  },

  // Shimmer / skeleton 效果
  shimmer: "rgba(0,0,0,0.1)",

  // 複選框
  checkbox: PRIMARY,
  checkboxUnchecked: "#aaa",

  // Modal
  modalOverlay: "rgba(0, 0, 0, 0.5)",
  modalBackground: "#ffffff",

  // Tab Bar
  tabBarBackground: "#ffffff",
  tabBarActive: PRIMARY,
  tabBarInactive: "#999999",

  // Calendar
  calendarHeader: PRIMARY,
  calendarHeaderText: "#ffffff",
  calendarToday: PRIMARY,
  calendarTodayText: "#ffffff",
  calendarWeekend: "#ff5252",
  calendarSelected: "#ede9ff", // 淡紫色

  // Task
  taskChecked: "#999999",
  taskUnchecked: "#000000",
  taskTime: "#666666",

  // UI Tokens
  borderRadius: 12,
  borderRadiusSmall: 8,
  borderRadiusLarge: 16,

  // iOS Design System
  typography,
  spacing,
  radius,
};

export const darkTheme = {
  mode: "dark",

  // 主要顏色
  primary: PRIMARY_LIGHT,
  primaryLight: "#a39dff",
  primaryDark: PRIMARY,

  // 背景色 - 調整為更淺的灰色，避免純黑
  background: "#1c1c1e",
  backgroundSecondary: "#2c2c2e",
  backgroundTertiary: "rgb(58, 58, 60)",

  // 卡片/容器 - 與背景有明顯對比
  card: "rgb(58, 58, 60)",
  cardBorder: "#48484a",

  // 文字顏色 - 更接近白色，提高可讀性
  text: "#f5f5f5",
  textSecondary: "#d0d0d0",
  textTertiary: "#a0a0a0",
  textPlaceholder: "#808080",

  // 輸入框 - 調整為更淺的背景
  input: "#303030",
  inputBorder: "#505050",
  inputBorderFocused: PRIMARY_LIGHT,

  // 按鈕
  button: PRIMARY_LIGHT,
  buttonText: "#ffffff",
  buttonSecondary: "#303030",
  buttonSecondaryText: "#f5f5f5",

  // 狀態顏色
  success: "#66bb6a",
  error: "#ef5350",
  warning: "#ffa726",
  info: "#42a5f5",

  // 分隔線
  divider: "#353535",

  // 陰影
  shadow: "#000000",
  shadowOpacity: 0.3,
  shadows: {
    card:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 8,  elevation: 1 },
    elevated: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 3 },
    floating: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 5 },
  },

  // Shimmer / skeleton 效果
  shimmer: "rgba(255,255,255,0.1)",

  // 複選框
  checkbox: PRIMARY_LIGHT,
  checkboxUnchecked: "#f5f5f5", // 深色模式用白色

  // Modal
  modalOverlay: "rgba(0, 0, 0, 0.7)",
  modalBackground: "#1c1c1e",

  // Tab Bar
  tabBarBackground: "#252525",
  tabBarActive: PRIMARY_LIGHT,
  tabBarInactive: "#808080",

  // Calendar
  calendarHeader: PRIMARY_LIGHT,
  calendarHeaderText: "#ffffff",
  calendarToday: PRIMARY_LIGHT,
  calendarTodayText: "#ffffff",
  calendarWeekend: "#ef5350",
  calendarSelected: "#353550",

  // Task
  taskChecked: "#808080",
  taskUnchecked: "#f5f5f5",
  taskTime: "#d0d0d0",

  // UI Tokens
  borderRadius: 12,
  borderRadiusSmall: 8,
  borderRadiusLarge: 16,

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
