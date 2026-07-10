import React, { useState, useContext, useRef, useEffect } from "react";
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
  Keyboard,
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
import { cancelTaskNotification } from "../services/notificationService";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES_EN = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDetailDate(dateStr, language) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (language === "zh") {
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${DAY_NAMES_ZH[d.getDay()]}`;
  }
  return `${DAY_NAMES_EN[d.getDay()]}, ${MONTH_NAMES_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function TaskDetailScreen({ navigation, route }) {
  // route.params 可能在深連結 / 狀態還原時缺失，預設為空物件避免解構 crash
  const initialTask = route?.params?.task || {};
  const { theme, themeMode } = useContext(ThemeContext);
  const { t, language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState(initialTask);
  const [titleValue, setTitleValue] = useState(initialTask.title || "");
  const [noteValue, setNoteValue] = useState(initialTask.note || "");
  const [linkValue, setLinkValue] = useState(initialTask.link || "");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [tempTime, setTempTime] = useState(null);
  const [noteInputHeight, setNoteInputHeight] = useState(80);
  // 追蹤最新輸入值，供 goBack / unmount（依賴為空的 cleanup）讀取，避免拿到過期 state
  const titleValueRef = useRef(titleValue);
  const noteValueRef = useRef(noteValue);
  const linkValueRef = useRef(linkValue);
  titleValueRef.current = titleValue;
  noteValueRef.current = noteValue;
  linkValueRef.current = linkValue;
  const saveDebounceRef = useRef(null);
  const pendingWriteRef = useRef(null); // accumulated fields awaiting debounced DB write
  const taskRef = useRef(initialTask); // always tracks latest task for goBack sync
  const deletedRef = useRef(false); // 標記已刪除，避免 unmount 的 onUpdate 復活任務
  const keyboardVisibleRef = useRef(false); // 追蹤鍵盤是否顯示中

  // 追蹤鍵盤顯示狀態，供 picker 掛載時序判斷使用
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisibleRef.current = false;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 若鍵盤正顯示，先收鍵盤並等其完全收起後再掛載 picker overlay。
  // 避免鍵盤收起動畫進行中同時變動 native view 樹，導致 subview 陣列越界
  // (NSRangeException: -[__NSArrayM objectAtIndexedSubscript:]) 而 crash。
  const openPickerAfterKeyboard = (setVisible) => {
    if (!keyboardVisibleRef.current) {
      setVisible(true);
      return;
    }
    let fallback = null;
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      if (fallback) clearTimeout(fallback);
      sub.remove();
      setVisible(true);
    });
    // 保底：極少數情況 keyboardDidHide 未觸發時仍能開啟 picker
    fallback = setTimeout(() => {
      sub.remove();
      setVisible(true);
    }, 500);
    Keyboard.dismiss();
  };

  // 缺少有效任務（無 id）時直接返回，避免後續操作未定義資料
  useEffect(() => {
    if (!initialTask || !initialTask.id) {
      navigation.goBack();
    }
  }, []);

  const monoKicker = {
    fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  };

  // ── Persistence ────────────────────────────────────────────────
  // optimistic local update (sync) — keeps taskRef current so goBack callback is never stale
  const applyLocal = (fields) => {
    const optimistic = { ...taskRef.current, ...fields };
    taskRef.current = optimistic;
    setTask(optimistic);
  };

  // background DB write; on failure revert ONLY the fields this write touched.
  // 回退整個 task 快照會吃掉寫入期間對其他欄位的並發編輯，故只還原本次欄位。
  const writeRemote = async (fields, previous) => {
    try {
      await TaskService.updateTask(taskRef.current.id, fields, t);
    } catch (err) {
      console.error("updateTask error:", err);
      const reverted = { ...taskRef.current };
      Object.keys(fields).forEach((key) => {
        reverted[key] = previous[key];
      });
      taskRef.current = reverted;
      setTask(reverted);
    }
  };

  // immediate optimistic update + DB write (date/time pickers)
  const persistUpdate = (fields) => {
    const previous = taskRef.current;
    applyLocal(fields);
    writeRemote(fields, previous);
  };

  // run any pending debounced write right now (called on goBack / unmount)
  const flushPendingWrite = () => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    const pending = pendingWriteRef.current;
    if (!pending) return;
    pendingWriteRef.current = null;
    writeRemote(pending.fields, pending.previous);
  };

  // text fields: update local state immediately, debounce the DB write.
  // accumulates fields so no edit is lost if several blur within the debounce window.
  const saveField = (fields) => {
    const previous = pendingWriteRef.current?.previous ?? taskRef.current;
    applyLocal(fields);
    pendingWriteRef.current = {
      fields: { ...(pendingWriteRef.current?.fields || {}), ...fields },
      previous,
    };
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(flushPendingWrite, 300);
  };

  // 提交仍在輸入框中、尚未透過 onBlur 存檔的值。
  // 返回鍵 / 右滑返回時輸入框可能未 blur，若不在此強制提交，剛打的備註會遺失。
  const commitInputs = () => {
    const cur = taskRef.current;
    const fields = {};
    const titleTrim = titleValueRef.current.trim();
    if (titleTrim && titleTrim !== (cur.title || "")) fields.title = titleTrim;
    const noteTrim = noteValueRef.current.trim();
    if (noteTrim !== (cur.note || "")) fields.note = noteTrim || null;
    const linkTrim = linkValueRef.current.trim();
    if (linkTrim !== (cur.link || "")) fields.link = linkTrim || null;
    if (Object.keys(fields).length) saveField(fields);
  };

  // flush pending write on unmount (covers iOS swipe-back gesture, which bypasses handleGoBack)
  useEffect(() => {
    return () => {
      commitInputs();
      flushPendingWrite();
      // 已刪除則不可再觸發 onUpdate，否則會把刪掉的任務重新塞回日曆
      if (deletedRef.current) return;
      // 右滑返回不會經過 handleGoBack，需在此同步 onUpdate 並清除 callback；
      // 與 Back 鈕路徑冪等（onUpdate 內會 clearCallbacks，第二次呼叫為 no-op）
      invokeCallback(route.params?.callbackId, "onUpdate", taskRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = () => {
    const doDelete = async () => {
      mixpanelService.track("Task Deleted", { task_id: task.id, platform: Platform.OS });
      deletedRef.current = true;
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

  // 切換完成狀態：樂觀更新 + 背景寫入，失敗時只回退完成相關欄位（保留並發編輯）
  const handleToggleComplete = () => {
    const previous = taskRef.current;
    const newState = !previous.is_completed;
    applyLocal({
      is_completed: newState,
      completed_at: newState ? new Date().toISOString() : null,
    });
    (async () => {
      try {
        // 標記完成時取消該任務的待發通知（用 taskId 查找，與 CalendarScreen 一致）
        if (newState) {
          await cancelTaskNotification(null, taskRef.current.id);
        }
        await TaskService.toggleTaskChecked(taskRef.current.id, newState);
        mixpanelService.track(newState ? "Task Completed" : "Task Uncompleted", {
          task_id: previous.id,
          platform: Platform.OS,
        });
      } catch (err) {
        console.error("toggleTaskChecked error:", err);
        const reverted = { ...taskRef.current };
        reverted.is_completed = previous.is_completed;
        reverted.completed_at = previous.completed_at;
        taskRef.current = reverted;
        setTask(reverted);
      }
    })();
  };

  const handleGoBack = () => {
    commitInputs();
    flushPendingWrite();
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
    const monoKicker = {
      fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 1.0,
      textTransform: "uppercase",
    };
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View
            style={{ backgroundColor: theme.backgroundSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={{ padding: 6, minWidth: 60 }}>
                <Text style={[monoKicker, { color: theme.textSecondary }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <Text style={[monoKicker, { color: theme.text }]}>
                {t.date}
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
                <Text style={[monoKicker, { color: theme.primary }]}>
                  {t.confirm}
                </Text>
              </TouchableOpacity>
            </View>
            {tempDate && (
              <View style={{ alignItems: "center", width: "100%", backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule, paddingBottom: insets.bottom }}>
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
    const monoKicker = {
      fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 1.0,
      textTransform: "uppercase",
    };
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Background dismiss — separate from bottom sheet to avoid touch conflicts with native spinner */}
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)" }]}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        />
        {/* Bottom sheet — NOT inside TouchableOpacity so spinner touches don't bubble up */}
        <View
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.backgroundSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
        >
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={() => {
                persistUpdate({ time: null });
                setTimePickerVisible(false);
              }}
              style={{ padding: 6, minWidth: 60 }}
            >
              <Text style={[monoKicker, { color: theme.textSecondary }]}>
                {t.clear}
              </Text>
            </TouchableOpacity>
            <Text style={[monoKicker, { color: theme.text }]}>
              {t.timeLabel}
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
              <Text style={[monoKicker, { color: theme.primary }]}>
                {t.confirm}
              </Text>
            </TouchableOpacity>
          </View>
          {tempTime && (
            <View style={{ alignItems: "center", backgroundColor: theme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule, paddingBottom: insets.bottom }}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "clock"}
                themeVariant={themeMode === "dark" ? "dark" : "light"}
                accentColor={theme.primary}
                onChange={(_, selected) => { if (selected) setTempTime(selected); }}
              />
            </View>
          )}
        </View>
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
            {t.back}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
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
              {t.titleLabel}
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
                // 任務不可無標題：清空後失焦則還原舊值，避免輸入框顯示空白但實際未存
                if (!trimmed) {
                  setTitleValue(taskRef.current.title || "");
                  return;
                }
                if (trimmed !== taskRef.current.title) saveField({ title: trimmed });
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
            labelKey={t.dateLabel}
            value={formatDetailDate(task.date, language)}
            onPress={() => {
              setTempDate(task.date ? new Date(task.date + "T00:00:00") : new Date());
              openPickerAfterKeyboard(setDatePickerVisible);
            }}
          />
          <RowDivider />
          <MetaRow
            icon="access-time"
            labelKey={t.timeLabel}
            value={formatTimeDisplay(task.time) || t.none}
            isPlaceholder={!task.time}
            onPress={() => {
              const now = new Date();
              setTempTime(
                task.time
                  ? new Date(2024, 0, 1, parseInt(task.time.split(":")[0]) || 0, parseInt(task.time.split(":")[1]) || 0)
                  : now
              );
              openPickerAfterKeyboard(setTimePickerVisible);
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
                <Text style={[monoKicker, { color: theme.textTertiary, marginBottom: 1 }]}>{t.linkLabel}</Text>
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
                    placeholder={t.pasteLinkPlaceholder}
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
                  {t.notesLabel}
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
                placeholder={t.addNotePlaceholder}
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

      {/* Bottom action — Mark done */}
      {(() => {
        const done = !!task.is_completed;
        return (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 12,
              backgroundColor: theme.background,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.rule,
            }}
          >
            <TouchableOpacity
              onPress={handleToggleComplete}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 52,
                borderRadius: 14,
                backgroundColor: done ? (theme.primarySoft || "rgba(59,75,122,0.12)") : theme.primary,
                borderWidth: done ? 1 : 0,
                borderColor: done ? theme.primary : "transparent",
              }}
            >
              <MaterialIcons
                name={done ? "check-circle" : "check"}
                size={20}
                color={done ? theme.primary : "#FFFFFF"}
              />
              <Text
                style={{
                  fontFamily: theme.typography?.footnote?.fontFamily,
                  fontSize: 15,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  color: done ? theme.primary : "#FFFFFF",
                }}
              >
                {done ? t.completedLabel : t.completeAction}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

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
