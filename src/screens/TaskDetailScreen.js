import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemeContext, LanguageContext } from "../contexts";
import { TaskService } from "../services/taskService";
import { mixpanelService } from "../services/mixpanelService";
import { invokeCallback } from "../utils/navigationCallbacks";
import { formatTimeDisplay } from "../utils/dateUtils";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES_EN = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDetailDate(dateStr, language) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (language === "zh-Hant") {
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${DAY_NAMES_ZH[d.getDay()]}`;
  }
  return `${DAY_NAMES_EN[d.getDay()]}, ${MONTH_NAMES_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function TaskDetailScreen({ navigation, route }) {
  const { task: initialTask } = route.params;
  const { theme, themeMode } = useContext(ThemeContext);
  const { t, language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState(initialTask);
  const [titleValue, setTitleValue] = useState(initialTask.title);
  const [noteValue, setNoteValue] = useState(initialTask.note || "");
  const [linkValue, setLinkValue] = useState(initialTask.link || "");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [tempTime, setTempTime] = useState(null);
  const [noteInputHeight, setNoteInputHeight] = useState(80);
  const saveDebounceRef = useRef(null);
  const taskRef = useRef(initialTask); // always tracks latest task for goBack sync

  const isZH = language === "zh-Hant";

  const monoKicker = {
    fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  };

  // ── Persistence ────────────────────────────────────────────────
  // inline save: update local state only, no navigation
  const persistUpdate = async (fields) => {
    const previous = taskRef.current;
    const optimistic = { ...previous, ...fields };
    taskRef.current = optimistic;
    setTask(optimistic);
    try {
      const result = await TaskService.updateTask(task.id, fields);
      if (result) {
        taskRef.current = result;
        setTask(result);
      }
    } catch (err) {
      console.error("updateTask error:", err);
      taskRef.current = previous;
      setTask(previous);
    }
  };

  const saveField = (fields) => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => persistUpdate(fields), 300);
  };

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = () => {
    const doDelete = async () => {
      mixpanelService.track("Task Deleted", { task_id: task.id, platform: Platform.OS });
      TaskService.deleteTask(task.id).catch((err) => console.error("deleteTask error:", err));
      invokeCallback(route.params.callbackId, "onDelete", task.id, task.date);
      navigation.goBack();
    };
    if (Platform.OS === "web") {
      if (window.confirm(t.deleteConfirm)) doDelete();
    } else {
      Alert.alert(t.deleteConfirm, "", [
        { text: t.cancel, style: "cancel" },
        { text: t.delete, onPress: doDelete, style: "destructive" },
      ]);
    }
  };

  const handleGoBack = () => {
    invokeCallback(route.params.callbackId, "onUpdate", taskRef.current);
    navigation.goBack();
  };


  // ── Meta row ───────────────────────────────────────────────────
  const MetaRow = ({ icon, labelKey, value, onPress, isPlaceholder }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.metaRow}
    >
      <View style={styles.metaIcon}>
        <MaterialIcons name={icon} size={18} color={theme.textSecondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[monoKicker, { color: theme.textTertiary, marginBottom: 1 }]}>
          {labelKey}
        </Text>
        <Text style={{
          fontFamily: theme.typography?.body?.fontFamily,
          fontSize: 15,
          fontWeight: "500",
          color: isPlaceholder ? theme.textTertiary : theme.text,
          letterSpacing: -0.2,
        }}>
          {value}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={16} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  const RowDivider = () => (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.rule }} />
  );

  // ── Date picker overlay ────────────────────────────────────────
  const renderDatePickerOverlay = () => {
    if (!datePickerVisible || Platform.OS === "web") return null;
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View
            style={{ backgroundColor: theme.backgroundSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingBottom: insets.bottom }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={{ padding: 6, minWidth: 60 }}>
                <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "500", letterSpacing: -0.2, color: theme.textSecondary }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "600", letterSpacing: -0.2, color: theme.text }}>
                {isZH ? "日期" : "Date"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (tempDate) {
                    const y = tempDate.getFullYear();
                    const m = String(tempDate.getMonth() + 1).padStart(2, "0");
                    const d = String(tempDate.getDate()).padStart(2, "0");
                    const newDate = `${y}-${m}-${d}`;
                    persistUpdate({ date: newDate });
                  }
                  setDatePickerVisible(false);
                }}
                style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
              >
                <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "600", letterSpacing: -0.2, color: theme.primary }}>
                  {t.confirm || (isZH ? "完成" : "Done")}
                </Text>
              </TouchableOpacity>
            </View>
            {tempDate && (
              <View style={{ alignItems: "center", width: "100%", backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  themeVariant={themeMode === "dark" ? "dark" : "light"}
                  accentColor={theme.primary}
                  onChange={(_, selected) => { if (selected) setTempDate(selected); }}
                  style={{ width: "100%" }}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Time picker overlay ────────────────────────────────────────
  const renderTimePickerOverlay = () => {
    if (!timePickerVisible || Platform.OS === "web") return null;
    const displayH = tempTime ? String(tempTime.getHours()).padStart(2, "0") : "00";
    const displayM = tempTime ? String(tempTime.getMinutes()).padStart(2, "0") : "00";
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View
            style={{ backgroundColor: theme.backgroundSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingBottom: insets.bottom }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  persistUpdate({ time: null });
                  setTimePickerVisible(false);
                }}
                style={{ padding: 6, minWidth: 60 }}
              >
                <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "500", letterSpacing: -0.2, color: theme.textSecondary }}>
                  {isZH ? "清除" : "Clear"}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "600", letterSpacing: -0.2, color: theme.text }}>
                {displayH}:{displayM}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (tempTime) {
                    const h = String(tempTime.getHours()).padStart(2, "0");
                    const m = String(tempTime.getMinutes()).padStart(2, "0");
                    persistUpdate({ time: `${h}:${m}` });
                  }
                  setTimePickerVisible(false);
                }}
                style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
              >
                <Text style={{ fontFamily: theme.typography?.callout?.fontFamily, fontSize: 14, fontWeight: "600", letterSpacing: -0.2, color: theme.primary }}>
                  {t.confirm || (isZH ? "完成" : "Done")}
                </Text>
              </TouchableOpacity>
            </View>
            {tempTime && (
              <View style={{ alignItems: "center", backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }}>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "clock"}
                  themeVariant={themeMode === "dark" ? "dark" : "light"}
                  accentColor={theme.primary}
                  minuteInterval={5}
                  onChange={(_, selected) => { if (selected) setTempTime(selected); }}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={{ flexDirection: "row", alignItems: "center", minWidth: 60 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="chevron-left" size={18} color={theme.textSecondary} />
          <Text style={{ fontFamily: theme.typography?.footnote?.fontFamily, fontSize: 13, fontWeight: "500", color: theme.textSecondary, letterSpacing: -0.1 }}>
            {isZH ? "返回" : "Back"}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="delete-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={{
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 22,
            borderBottomWidth: 1.5,
            borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
          }}>
            <Text style={[monoKicker, { color: theme.primary, marginBottom: 6, letterSpacing: 2, fontSize: 10 }]}>
              {isZH ? "標題" : "TITLE"}
            </Text>
            <TextInput
              style={{
                fontFamily: theme.typography?.title1?.fontFamily || "InterTight_600SemiBold",
                fontSize: 28,
                fontWeight: "600",
                color: theme.text,
                letterSpacing: -0.7,
                lineHeight: 33,
                padding: 0,
              }}
              value={titleValue}
              onChangeText={setTitleValue}
              onBlur={() => {
                const trimmed = titleValue.trim();
                if (trimmed && trimmed !== task.title) saveField({ title: trimmed });
              }}
              multiline
              returnKeyType="done"
              blurOnSubmit
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          {/* Meta rows */}
          <MetaRow
            icon="calendar-today"
            labelKey={isZH ? "日期" : "DATE"}
            value={formatDetailDate(task.date, language)}
            onPress={() => {
              setTempDate(task.date ? new Date(task.date + "T00:00:00") : new Date());
              setDatePickerVisible(true);
            }}
          />
          <RowDivider />
          <MetaRow
            icon="access-time"
            labelKey={isZH ? "時間" : "TIME"}
            value={formatTimeDisplay(task.time) || (isZH ? "無" : "None")}
            isPlaceholder={!task.time}
            onPress={() => {
              const now = new Date();
              setTempTime(
                task.time
                  ? new Date(2024, 0, 1, parseInt(task.time.split(":")[0]) || 0, parseInt(task.time.split(":")[1]) || 0)
                  : now
              );
              setTimePickerVisible(true);
            }}
          />

          <RowDivider />

          {/* Link + Notes band */}
          <View>
            {/* Link */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 14 }}>
              <View style={styles.metaIcon}>
                <MaterialIcons name="link" size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[monoKicker, { color: theme.textTertiary, marginBottom: 1 }]}>LINK</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontFamily: theme.typography?.body?.fontFamily,
                      fontSize: 15,
                      fontWeight: "500",
                      color: theme.text,
                      letterSpacing: -0.2,
                      padding: 0,
                    }}
                    value={linkValue}
                    onChangeText={setLinkValue}
                    onBlur={() => {
                      const trimmed = linkValue.trim();
                      const prev = task.link || "";
                      if (trimmed !== prev) saveField({ link: trimmed || null });
                    }}
                    placeholder={isZH ? "貼上連結…" : "Paste a link…"}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {linkValue.trim() ? (
                    <TouchableOpacity
                      onPress={() => {
                        const url = linkValue.trim().startsWith("http") ? linkValue.trim() : `https://${linkValue.trim()}`;
                        Linking.openURL(url).catch((err) => console.error("openURL error:", err));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="open-in-new" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <RowDivider />

            {/* Notes */}
            <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <MaterialIcons name="notes" size={16} color={theme.textSecondary} />
                <Text style={[monoKicker, { color: theme.textSecondary, letterSpacing: 2 }]}>
                  {isZH ? "備註" : "NOTES"}
                </Text>
              </View>
              <TextInput
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  fontSize: 14,
                  fontWeight: "400",
                  color: theme.text,
                  lineHeight: 22,
                  letterSpacing: -0.1,
                  padding: 0,
                  minHeight: Math.max(180, noteInputHeight),
                  textAlignVertical: "top",
                }}
                value={noteValue}
                onChangeText={setNoteValue}
                onBlur={() => {
                  const trimmed = noteValue.trim();
                  const prev = task.note || "";
                  if (trimmed !== prev) saveField({ note: trimmed || null });
                }}
                placeholder={isZH ? "新增備註…" : "Add context, links, or anything useful…"}
                placeholderTextColor={theme.textTertiary}
                multiline
                onContentSizeChange={(e) => {
                  const h = e.nativeEvent.contentSize.height;
                  setNoteInputHeight(Math.max(80, Math.min(h + 16, 300)));
                }}
              />
            </View>
          </View>
        </ScrollView>

      </KeyboardAvoidingView>

      {renderDatePickerOverlay()}
      {renderTimePickerOverlay()}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    gap: 14,
    minHeight: 52,
  },
  metaIcon: {
    width: 24,
    alignItems: "center",
  },
});
