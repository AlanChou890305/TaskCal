import React, { useContext, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LanguageContext, ThemeContext } from "../contexts";

const SLIDES = [
  { key: "1", titleKey: "onboarding1Title", descKey: "onboarding1Desc", kicker: "Step · 01 / 03" },
  { key: "2", titleKey: "onboarding2Title", descKey: "onboarding2Desc", kicker: "Step · 02 / 03" },
  { key: "3", titleKey: "onboarding3Title", descKey: "onboarding3Desc", kicker: "Step · 03 / 03" },
];

// April 2026: April 1 = Wednesday → prev month overflow = Mar 29-31
const CAL_WEEKS = [
  [{d:29,o:true},{d:30,o:true},{d:31,o:true},{d:1},{d:2},{d:3},{d:4}],
  [{d:5},{d:6},{d:7},{d:8},{d:9},{d:10},{d:11}],
  [{d:12},{d:13},{d:14},{d:15},{d:16},{d:17},{d:18}],
  [{d:19},{d:20},{d:21},{d:22},{d:23},{d:24},{d:25}],
  [{d:26},{d:27},{d:28},{d:29},{d:30},{d:1,o:true},{d:2,o:true}],
];
const CAL_DOTS = new Set([3, 7, 8, 18, 22, 26]);
const CAL_SELECTED = 15;
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

const WIDGET_TASKS = [
  { label: "Draft Q2 plan", time: "14:00", done: false },
  { label: "Stand-up", time: "09:30", done: true },
];

export default function OnboardingScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const { width: windowWidth, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [flatListHeight, setFlatListHeight] = useState(0);
  const SCREEN_WIDTH = containerWidth > 0 ? containerWidth : windowWidth;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleDone = async () => {
    await AsyncStorage.setItem("onboarding_completed", "true");
    navigation.replace("Splash");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    } else {
      handleDone();
    }
  };

  const screenWidthRef = useRef(SCREEN_WIDTH);
  screenWidthRef.current = SCREEN_WIDTH;

  const onScroll = useRef((event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidthRef.current);
    setCurrentIndex(index);
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = (_, index) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const isLast = currentIndex === SLIDES.length - 1;
  // 背景跟隨主題（light: ink-blue #3B4B7A / dark: 深藍 #1F2440），與登入頁協調。
  // 文字固定為奶油紙色，避免 theme.buttonText 在深色模式翻成深字而看不清楚。
  const paperColor = "#F2F1EB";
  const washBg = theme.primaryWash || theme.primary;
  const mono = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sans = theme.typography?.largeTitle?.fontFamily || "InterTight_600SemiBold";
  const body = theme.typography?.body?.fontFamily || "InterTight_400Regular";

  const CARD_H = SCREEN_HEIGHT * 0.40;
  const CARD_MX = 22;
  const INK = "#1A1F2E";
  const PRIMARY = "#3B4B7A";
  const PAPER = "#F2F1EB";

  // ── Step 1: Calendar ─────────────────────────────────────────────
  const renderCalendarCard = () => (
    <View style={[styles.card, { marginHorizontal: CARD_MX, backgroundColor: PAPER }]}>
      {/* Header */}
      <View style={styles.calHeaderSection}>
        <Text style={[styles.calYear, { fontFamily: mono, color: PRIMARY }]}>2026</Text>
        <View style={styles.calHeaderRow}>
          <Text style={[styles.calMonth, { fontFamily: sans, color: INK }]}>April</Text>
          <View style={styles.calNav}>
            <View style={[styles.calNavBtn, { borderColor: `${INK}22` }]}>
              <Text style={[styles.calNavTxt, { fontFamily: mono, color: INK }]}>{"<"}</Text>
            </View>
            <View style={[styles.calNavBtn, { borderColor: `${INK}22` }]}>
              <Text style={[styles.calNavTxt, { fontFamily: mono, color: INK }]}>{">"}</Text>
            </View>
            <View style={[styles.calTodayBtn, { backgroundColor: `${INK}0D` }]}>
              <Text style={[styles.calTodayTxt, { fontFamily: body, color: INK }]}>Today</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.hairline, { backgroundColor: `${INK}14` }]} />

      {/* Day headers */}
      <View style={styles.calDayRow}>
        {DAY_HEADERS.map((d, i) => (
          <Text key={i} style={[styles.calDayHdr, { fontFamily: mono, color: INK }]}>{d}</Text>
        ))}
      </View>

      {/* Weeks */}
      {CAL_WEEKS.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((cell, di) => {
            const sel = !cell.o && cell.d === CAL_SELECTED;
            const hasDot = !cell.o && CAL_DOTS.has(cell.d);
            return (
              <View key={di} style={styles.calCell}>
                <View style={sel ? [styles.calCircle, { backgroundColor: PRIMARY }] : styles.calCircleEmpty}>
                  <Text style={[styles.calNum, { fontFamily: body, color: sel ? PAPER : (cell.o ? `${INK}28` : INK) }]}>
                    {cell.d}
                  </Text>
                </View>
                <View style={styles.calDotRow}>
                  {hasDot && <View style={[styles.calDot, { backgroundColor: PRIMARY }]} />}
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={{ paddingBottom: 10 }} />
    </View>
  );

  // ── Step 2: Task Detail ──────────────────────────────────────────
  const renderFormCard = () => (
    <View style={[styles.card, { marginHorizontal: CARD_MX, backgroundColor: PAPER }]}>
      {/* Title */}
      <View style={styles.detailTitleSection}>
        <Text style={[styles.detailKicker, { fontFamily: mono, color: PRIMARY }]}>TITLE</Text>
        <Text style={[styles.detailTitle, { fontFamily: sans, color: INK }]}>Draft Q2 plan</Text>
      </View>

      <View style={[styles.hairline, { backgroundColor: `${INK}14` }]} />

      {/* DATE */}
      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MaterialIcons name="calendar-today" size={16} color={`${INK}55`} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailRowKicker, { fontFamily: mono, color: `${INK}55` }]}>DATE</Text>
          <Text style={[styles.detailRowVal, { fontFamily: body, color: INK }]}>Wed, Apr 15</Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color={`${INK}38`} />
      </View>

      <View style={[styles.hairline, { backgroundColor: `${INK}14` }]} />

      {/* TIME */}
      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MaterialIcons name="access-time" size={16} color={`${INK}55`} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailRowKicker, { fontFamily: mono, color: `${INK}55` }]}>TIME</Text>
          <Text style={[styles.detailRowVal, { fontFamily: body, color: INK }]}>14:00 — 15:30</Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color={`${INK}38`} />
      </View>

      <View style={[styles.hairline, { backgroundColor: `${INK}14` }]} />

      {/* LINK */}
      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MaterialIcons name="link" size={16} color={`${INK}55`} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailRowKicker, { fontFamily: mono, color: `${INK}55` }]}>LINK</Text>
          <Text style={[styles.detailRowVal, { fontFamily: body, color: `${INK}40` }]}>Paste a link...</Text>
        </View>
      </View>

      <View style={[styles.hairline, { backgroundColor: `${INK}14` }]} />

      {/* NOTES */}
      <View style={[styles.detailRow, { alignItems: "flex-start" }]}>
        <View style={[styles.detailIcon, { marginTop: 2 }]}>
          <MaterialIcons name="notes" size={16} color={`${INK}55`} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailRowKicker, { fontFamily: mono, color: `${INK}55` }]}>NOTES</Text>
          <Text style={[styles.detailRowVal, { fontFamily: body, color: `${INK}40` }]}>
            Add context, links, or anything useful...
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Step 3: Widget ───────────────────────────────────────────────
  const renderWidgetCard = () => (
    <View style={[styles.widgetOuter, { height: CARD_H, marginHorizontal: CARD_MX }]}>
      <View style={[styles.widgetCard, { backgroundColor: PAPER }]}>
        {/* Left: date + done */}
        <View style={styles.widgetLeft}>
          <View>
            <Text style={[styles.widgetDateLabel, { fontFamily: mono, color: INK }]}>WED · APR</Text>
            <Text style={[styles.widgetDay, { fontFamily: mono, color: INK }]}>15</Text>
          </View>
          <View>
            <Text style={[styles.widgetDateLabel, { fontFamily: mono, color: INK }]}>DONE</Text>
            <Text style={[styles.widgetDone, { fontFamily: mono, color: INK }]}>0 / 2</Text>
          </View>
        </View>

        {/* Vertical divider */}
        <View style={[styles.widgetDivider, { backgroundColor: `${INK}14` }]} />

        {/* Right: tasks */}
        <View style={styles.widgetRight}>
          {WIDGET_TASKS.map((task, i) => (
            <View key={i} style={styles.widgetTaskRow}>
              <View style={[styles.checkbox, {
                borderColor: task.done ? PRIMARY : `${INK}38`,
                backgroundColor: task.done ? PRIMARY : "transparent",
              }]} />
              <Text
                style={[styles.widgetTaskLabel, { fontFamily: body, color: INK, opacity: task.done ? 0.38 : 0.85 }]}
                numberOfLines={1}
              >
                {task.label}
              </Text>
              <Text style={[styles.widgetTaskTime, { fontFamily: mono, color: INK }]}>{task.time}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const CARDS = [renderCalendarCard, renderFormCard, renderWidgetCard];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: washBg }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {SCREEN_WIDTH === 0 ? null : (
        <FlatList
          style={{ flex: 1 }}
          onLayout={(e) => setFlatListHeight(e.nativeEvent.layout.height)}
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH, height: flatListHeight > 0 ? flatListHeight : undefined }]}>
              <View style={styles.kickerRow}>
                <Text style={[styles.kicker, { color: paperColor, fontFamily: mono }]}>
                  {item.kicker}
                </Text>
                <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
                  <Text style={[styles.skipTxt, { color: paperColor, fontFamily: body }]}>
                    {t.onboardingSkip}
                  </Text>
                </TouchableOpacity>
              </View>

              {CARDS[index]?.()}

              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: paperColor, fontFamily: sans }]}>
                  {t[item.titleKey]}
                </Text>
                <Text style={[styles.desc, { color: `${paperColor}C7`, fontFamily: body }]}>
                  {t[item.descKey]}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressCount, { color: paperColor, fontFamily: mono }]}>
            {String(currentIndex + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </Text>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, {
                  backgroundColor: paperColor,
                  opacity: i === currentIndex ? 1 : 0.35,
                  width: i === currentIndex ? 22 : 6,
                }]}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: PAPER, borderRadius: theme.radius?.lg || 8 }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextTxt, { color: PRIMARY, fontFamily: theme.typography?.headline?.fontFamily }]}>
            {isLast ? `${t.onboardingGetStarted}  →` : `${t.onboardingNext}  →`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { flex: 1, flexDirection: "column" },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },
  kicker: { fontSize: 10, fontWeight: "500", letterSpacing: 2.0, textTransform: "uppercase", opacity: 0.85 },
  skipBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  skipTxt: { fontSize: 13, fontWeight: "500", letterSpacing: -0.1, opacity: 0.8 },

  // Card base (no padding — sections handle their own)
  card: { borderRadius: 12, overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth },

  // ── Calendar ──────────────────────────────────────────────────────
  calHeaderSection: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  calYear: { fontSize: 10, letterSpacing: 0.5, opacity: 0.7, marginBottom: 2 },
  calHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calMonth: { fontSize: 26, fontWeight: "600", letterSpacing: -0.8 },
  calNav: { flexDirection: "row", alignItems: "center", gap: 5 },
  calNavBtn: {
    width: 28, height: 24, borderWidth: 1, borderRadius: 5,
    alignItems: "center", justifyContent: "center",
  },
  calNavTxt: { fontSize: 11, fontWeight: "500" },
  calTodayBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  calTodayTxt: { fontSize: 12, fontWeight: "500" },
  calDayRow: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 },
  calDayHdr: { flex: 1, textAlign: "center", fontSize: 9, opacity: 0.4, letterSpacing: 0.5 },
  calWeekRow: { flexDirection: "row", paddingHorizontal: 14 },
  calCell: { flex: 1, alignItems: "center", paddingVertical: 2 },
  calCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  calCircleEmpty: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  calNum: { fontSize: 11, lineHeight: 13, textAlign: "center" },
  calDotRow: { height: 5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  calDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.6 },
  calDayBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 6,
  },
  calDayBarLabel: { fontSize: 9, letterSpacing: 1.2, opacity: 0.65, textTransform: "uppercase" },
  calDayBarDate: { fontSize: 17, fontWeight: "600", letterSpacing: -0.4 },
  calTaskRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  calTaskLabel: { flex: 1, fontSize: 13, letterSpacing: -0.1 },
  calTaskTime: { fontSize: 12, letterSpacing: -0.1 },

  // ── Task Detail ───────────────────────────────────────────────────
  detailTitleSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  detailKicker: { fontSize: 9, letterSpacing: 2.0, opacity: 0.7, textTransform: "uppercase", marginBottom: 4 },
  detailTitle: { fontSize: 24, fontWeight: "600", letterSpacing: -0.6 },
  detailRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  detailIcon: { width: 20, alignItems: "center" },
  detailRowKicker: { fontSize: 9, letterSpacing: 2.0, opacity: 0.8, textTransform: "uppercase", marginBottom: 2 },
  detailRowVal: { fontSize: 14, fontWeight: "500", letterSpacing: -0.1 },

  // ── Widget ────────────────────────────────────────────────────────
  widgetOuter: { justifyContent: "center", alignItems: "center" },
  widgetCard: {
    borderRadius: 16, flexDirection: "row", padding: 16, width: "90%",
    shadowColor: "#1A1F2E", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 24,
  },
  widgetLeft: { width: 72, justifyContent: "space-between", paddingRight: 12 },
  widgetDateLabel: { fontSize: 8, letterSpacing: 1.2, opacity: 0.45, textTransform: "uppercase", marginBottom: 2 },
  widgetDay: { fontSize: 38, fontWeight: "500", letterSpacing: -1.5, lineHeight: 42 },
  widgetDone: { fontSize: 16, fontWeight: "500", letterSpacing: -0.5 },
  widgetDivider: { width: StyleSheet.hairlineWidth, marginVertical: -16, marginRight: 12 },
  widgetRight: { flex: 1, justifyContent: "flex-start", gap: 10 },
  widgetTaskRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  widgetTaskLabel: { flex: 1, fontSize: 11, letterSpacing: -0.1 },
  widgetTaskTime: { fontSize: 10, letterSpacing: -0.1, opacity: 0.5 },

  // Shared checkbox
  checkbox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },

  // Text block
  textBlock: { flex: 1, justifyContent: "center", paddingHorizontal: 22, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: "600", letterSpacing: -1.3, lineHeight: 38, marginBottom: 14 },
  desc: { fontSize: 14, fontWeight: "400", letterSpacing: -0.05, lineHeight: 22 },

  // Footer
  footer: { paddingHorizontal: 22, paddingBottom: 28, gap: 18 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressCount: { fontSize: 11, fontWeight: "500", letterSpacing: 1.5, opacity: 0.78 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { height: 4, borderRadius: 2 },
  nextBtn: { width: "100%", height: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  nextTxt: { fontSize: 13, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
});
