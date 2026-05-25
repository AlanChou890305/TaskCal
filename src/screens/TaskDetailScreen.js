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
import { ThemeContext, LanguageContext } from "../contexts";
import { TaskService } from "../services/taskService";
import { mixpanelService } from "../services/mixpanelService";
import { formatTimeDisplay } from "../utils/dateUtils";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES_EN = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const MONTH_NAMES_ZH = [
  "1","2","3","4","5","6","7","8","9","10","11","12",
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
  const { theme } = useContext(ThemeContext);
  const { t, language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState(initialTask);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(initialTask.title);
  const [editTime, setEditTime] = useState(formatTimeDisplay(initialTask.time) || "");
  const [editDate, setEditDate] = useState(initialTask.date);
  const [editNote, setEditNote] = useState(initialTask.note || "");
  const [editLink, setEditLink] = useState(initialTask.link || "");
  const [isSaving, setIsSaving] = useState(false);
  const [noteInputHeight, setNoteInputHeight] = useState(100);
  const titleInputRef = useRef(null);


  const monoKicker = {
    fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  };
  const ROW_ICON_SIZE = 16;
  const LABEL_W = 48;

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = () => {
    const doDelete = async () => {
      mixpanelService.track("Task Deleted", { task_id: task.id, platform: Platform.OS });
      TaskService.deleteTask(task.id).catch((err) => {
        console.error("deleteTask error:", err);
      });
      navigation.navigate("CalendarMain", {
        deletedTaskId: task.id,
        deletedTaskDate: task.date,
      });
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

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      const result = await TaskService.updateTask(task.id, {
        title: editTitle.trim(),
        time: editTime.trim() || null,
        date: editDate.trim(),
        note: editNote.trim() || null,
        link: editLink.trim() || null,
      });
      const updatedTask = result || {
        ...task,
        title: editTitle.trim(),
        time: editTime.trim() || null,
        date: editDate.trim(),
        note: editNote.trim() || null,
        link: editLink.trim() || null,
      };
      setTask(updatedTask);
      setIsEditing(false);
      navigation.navigate("CalendarMain", { updatedTask });
    } catch (err) {
      console.error("updateTask error:", err);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditTime(formatTimeDisplay(task.time) || "");
    setEditDate(task.date);
    setEditNote(task.note || "");
    setEditLink(task.link || "");
    setIsEditing(false);
  };

  // ── Sub-components ─────────────────────────────────────────────
  const CardRow = ({ icon, label, value, rightValue }) => (
    <View style={styles.cardRow}>
      <MaterialIcons name={icon} size={ROW_ICON_SIZE} color={theme.primary} />
      <Text style={[monoKicker, { color: theme.textTertiary, width: LABEL_W }]}>
        {label}
      </Text>
      <Text style={[styles.cardValue, { color: theme.text, fontFamily: theme.typography?.callout?.fontFamily }]}>
        {value}
      </Text>
      {rightValue ? (
        <Text
          style={{
            fontFamily: theme.typography?.monoTime?.fontFamily || "JetBrainsMono_500Medium",
            fontSize: 13,
            color: theme.primary,
            letterSpacing: -0.2,
          }}
        >
          {rightValue}
        </Text>
      ) : null}
    </View>
  );

  const Divider = () => (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.rule,
        marginLeft: 16 + ROW_ICON_SIZE + 10 + LABEL_W + 10,
      }}
    />
  );

  // ── Edit Form ──────────────────────────────────────────────────
  const renderEditForm = () => {
    const isZH = language === "zh-Hant";
    const monoKickerSm = {
      fontFamily: theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
      fontSize: 9,
      fontWeight: "500",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    };
    const FieldRow = ({ iconName, labelText, children }) => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.rule || theme.divider,
          backgroundColor: theme.background,
          gap: 14,
        }}
      >
        <MaterialIcons name={iconName} size={18} color={theme.textSecondary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[monoKickerSm, { color: theme.textTertiary, marginBottom: 2 }]}>
            {labelText}
          </Text>
          {children}
        </View>
        <MaterialIcons name="chevron-right" size={16} color={theme.textTertiary} />
      </View>
    );

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary || theme.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Grabber */}
        {Platform.OS === "ios" && (
          <View style={{ alignItems: "center", paddingTop: insets.top + 12, paddingBottom: 4 }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: theme.textTertiary, opacity: 0.5,
            }} />
          </View>
        )}

        {/* Nav */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: Platform.OS === "ios" ? 12 : insets.top + 12,
        }}>
          <TouchableOpacity
            onPress={handleCancelEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ minWidth: 60 }}
          >
            <Text style={{
              fontFamily: theme.typography?.footnote?.fontFamily,
              fontSize: 14,
              fontWeight: "500",
              color: theme.textSecondary,
              letterSpacing: -0.2,
            }}>
              {isZH ? "取消" : "Cancel"}
            </Text>
          </TouchableOpacity>
          <Text style={{
            fontFamily: theme.typography?.headline?.fontFamily,
            fontSize: 14,
            fontWeight: "600",
            color: theme.text,
            letterSpacing: -0.2,
          }}>
            {isZH ? "編輯任務" : "Edit task"}
          </Text>
          <TouchableOpacity
            onPress={handleSaveEdit}
            disabled={isSaving || !editTitle.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ minWidth: 60, alignItems: "flex-end" }}
          >
            <Text style={{
              fontFamily: theme.typography?.headline?.fontFamily,
              fontSize: 14,
              fontWeight: "600",
              color: editTitle.trim() && !isSaving ? theme.primary : theme.textTertiary,
              letterSpacing: -0.2,
            }}>
              {isZH ? "儲存" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        >
          {/* Title area */}
          <View style={{
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 18,
            backgroundColor: theme.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.rule,
            borderBottomWidth: 1.5,
            borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
          }}>
            <Text style={[monoKickerSm, {
              fontSize: 10,
              letterSpacing: 2,
              color: theme.primary,
              marginBottom: 8,
            }]}>
              {isZH ? "標題" : "TITLE"}
            </Text>
            <TextInput
              ref={titleInputRef}
              style={{
                fontFamily: theme.typography?.title2?.fontFamily || "InterTight_600SemiBold",
                fontSize: 24,
                fontWeight: "600",
                color: theme.text,
                letterSpacing: -0.6,
                lineHeight: 30,
                padding: 0,
              }}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder={isZH ? "輸入標題…" : "Task title"}
              placeholderTextColor={theme.textTertiary}
              autoFocus
              multiline
              returnKeyType="done"
              blurOnSubmit
            />
            {/* Active field underline */}
            <View style={{ height: 2, backgroundColor: theme.primary, marginTop: 8, borderRadius: 1 }} />
          </View>

          {/* Field rows */}
          <View style={{ marginTop: 1 }}>
            <FieldRow iconName="event" labelText={isZH ? "日期" : "DATE"}>
              <TextInput
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  fontSize: 15,
                  fontWeight: "500",
                  color: theme.text,
                  letterSpacing: -0.2,
                  padding: 0,
                }}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </FieldRow>
            <FieldRow iconName="access-time" labelText={isZH ? "時間" : "TIME"}>
              <TextInput
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  fontSize: 15,
                  fontWeight: "500",
                  color: theme.text,
                  letterSpacing: -0.2,
                  padding: 0,
                }}
                value={editTime}
                onChangeText={setEditTime}
                placeholder={isZH ? "HH:MM" : "HH:MM"}
                placeholderTextColor={theme.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </FieldRow>
            <FieldRow iconName="repeat" labelText={isZH ? "重複" : "REPEAT"}>
              <Text style={{
                fontFamily: theme.typography?.body?.fontFamily,
                fontSize: 15,
                fontWeight: "500",
                color: theme.textTertiary,
                letterSpacing: -0.2,
              }}>
                {isZH ? "不重複" : "Does not repeat"}
              </Text>
            </FieldRow>
            {/* Link row - optional */}
            {(editLink !== "" || true) && (
              <FieldRow iconName="link" labelText="LINK">
                <TextInput
                  style={{
                    fontFamily: theme.typography?.body?.fontFamily,
                    fontSize: 15,
                    fontWeight: "500",
                    color: theme.text,
                    letterSpacing: -0.2,
                    padding: 0,
                  }}
                  value={editLink}
                  onChangeText={setEditLink}
                  placeholder={isZH ? "貼上連結" : "Paste a link"}
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </FieldRow>
            )}
          </View>

          {/* Notes */}
          <View style={{
            paddingHorizontal: 22,
            paddingTop: 18,
            paddingBottom: 22,
            borderTopWidth: 8,
            borderTopColor: theme.backgroundSecondary || "#E9E7DE",
            marginTop: 8,
            backgroundColor: theme.background,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="notes" size={16} color={theme.textSecondary} />
              <Text style={[monoKickerSm, { color: theme.textSecondary, letterSpacing: 2 }]}>
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
                minHeight: noteInputHeight,
                textAlignVertical: "top",
              }}
              value={editNote}
              onChangeText={setEditNote}
              placeholder={isZH ? "新增備註…" : "Add context, links, or anything useful…"}
              placeholderTextColor={theme.textTertiary}
              multiline
              onContentSizeChange={(e) => {
                const h = e.nativeEvent.contentSize.height;
                setNoteInputHeight(Math.max(80, Math.min(h + 16, 300)));
              }}
            />
          </View>

          {/* Delete */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                paddingVertical: 14,
                alignItems: "center",
                borderRadius: theme.radius?.lg || 8,
                borderWidth: 1,
                borderColor: theme.error || "#C0392B",
              }}
            >
              <Text style={{
                fontFamily: theme.typography?.headline?.fontFamily,
                fontSize: 13,
                fontWeight: "600",
                color: theme.error || "#C0392B",
                letterSpacing: 0.4,
                textTransform: isZH ? "none" : "uppercase",
              }}>
                {isZH ? "刪除任務" : "Delete task"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const handleMarkDone = async () => {
    const newState = !(task.is_completed || task.checked);
    try {
      const result = await TaskService.updateTask(task.id, { is_completed: newState });
      const updatedTask = result || { ...task, is_completed: newState, checked: newState };
      setTask(updatedTask);
      navigation.navigate("CalendarMain", { updatedTask });
    } catch (err) {
      console.error("markDone error:", err);
    }
  };

  // ── Detail View ────────────────────────────────────────────────
  const renderDetailView = () => {
    const isDone = !!(task.is_completed || task.checked);
    const isZH = language === "zh-Hant";

    const MetaRow = ({ icon, labelKey, value, onPress }) => (
      <TouchableOpacity
        onPress={onPress || (() => setIsEditing(true))}
        activeOpacity={0.7}
        style={styles.metaRow}
      >
        <MaterialIcons name={icon} size={18} color={theme.textSecondary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[monoKicker, { color: theme.textTertiary, marginBottom: 1 }]}>
            {labelKey}
          </Text>
          <Text
            style={{
              fontFamily: theme.typography?.body?.fontFamily,
              fontSize: 15,
              fontWeight: "500",
              color: theme.text,
              letterSpacing: -0.2,
            }}
          >
            {value}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color={theme.textTertiary} />
      </TouchableOpacity>
    );

    const MetaDivider = () => (
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.rule, marginLeft: 16 + 18 + 12 }} />
    );

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={[
            styles.detailHeader,
            { paddingTop: insets.top + 14, backgroundColor: theme.background },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: "row", alignItems: "center", minWidth: 60 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="chevron-left" size={18} color={theme.textSecondary} />
            <Text
              style={{
                fontFamily: theme.typography?.footnote?.fontFamily,
                fontSize: 13,
                fontWeight: "500",
                color: theme.textSecondary,
                letterSpacing: -0.1,
              }}
            >
              {isZH ? "返回" : "Back"}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="delete-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title area */}
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            activeOpacity={0.85}
            style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 20 }}
          >
            <Text style={[monoKicker, { color: theme.primary, marginBottom: 6, letterSpacing: 2, fontSize: 10 }]}>
              {isZH ? "標題" : "TITLE"}
            </Text>
            <Text
              style={{
                fontFamily: theme.typography?.title1?.fontFamily || "InterTight_600SemiBold",
                fontSize: 28,
                fontWeight: "600",
                color: theme.text,
                letterSpacing: -0.7,
                lineHeight: 34,
              }}
            >
              {task.title}
            </Text>
          </TouchableOpacity>

          {/* Info card */}
          <View
            style={{
              marginHorizontal: 20,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.rule,
              borderRadius: theme.radius?.lg || 8,
              overflow: "hidden",
            }}
          >
            <MetaRow
              icon="calendar-today"
              labelKey={isZH ? "日期" : "DATE"}
              value={formatDetailDate(task.date, language)}
            />
            <MetaDivider />
            <MetaRow
              icon="access-time"
              labelKey={isZH ? "時間" : "TIME"}
              value={formatTimeDisplay(task.time) || "—"}
            />
            <MetaDivider />
            <MetaRow
              icon="repeat"
              labelKey={isZH ? "重複" : "REPEAT"}
              value={isZH ? "不重複" : "Does not repeat"}
            />
          </View>

          {/* Notes band */}
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            activeOpacity={0.85}
            style={{
              marginTop: 20,
              borderTopWidth: 8,
              borderTopColor: theme.backgroundSecondary || "#E9E7DE",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="notes" size={16} color={theme.textSecondary} />
              <Text style={[monoKicker, { color: theme.textSecondary, letterSpacing: 2 }]}>
                {isZH ? "備註" : "NOTES"}
              </Text>
            </View>
            {task.note ? (
              <Text
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  fontSize: 14,
                  fontWeight: "400",
                  color: theme.text,
                  lineHeight: 22.4,
                  letterSpacing: -0.15,
                }}
              >
                {task.note}
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  fontSize: 14,
                  color: theme.textTertiary,
                  letterSpacing: -0.15,
                }}
              >
                {isZH ? "輕觸以新增備註" : "Tap to add a note…"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Link */}
          {task.link ? (
            <TouchableOpacity
              onPress={() => {
                const url = task.link.startsWith("http")
                  ? task.link
                  : `https://${task.link}`;
                Linking.openURL(url).catch((err) =>
                  console.error("Failed to open URL:", err),
                );
              }}
              style={{ marginHorizontal: 20, marginTop: 20 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <MaterialIcons name="link" size={16} color={theme.textSecondary} />
                <Text style={[monoKicker, { color: theme.textSecondary, letterSpacing: 2 }]}>
                  LINK
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: theme.typography?.callout?.fontFamily,
                  fontSize: 14,
                  color: theme.primary,
                  letterSpacing: -0.15,
                  textDecorationLine: "underline",
                }}
                numberOfLines={2}
              >
                {task.link}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Bottom action bar */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 12,
            paddingTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.rule,
            backgroundColor: theme.background,
          }}
        >
          <TouchableOpacity
            onPress={handleMarkDone}
            style={{
              backgroundColor: isDone ? theme.backgroundSecondary || "#E9E7DE" : theme.primary,
              borderRadius: theme.radius?.lg || 8,
              paddingVertical: 14,
              alignItems: "center",
            }}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontFamily: theme.typography?.headline?.fontFamily,
                fontSize: 13,
                fontWeight: "600",
                color: isDone ? theme.textSecondary : theme.buttonText || "#F2F1EB",
                letterSpacing: isZH ? 0 : 0.4,
                textTransform: isZH ? "none" : "uppercase",
              }}
            >
              {isDone
                ? (isZH ? "已完成" : "Completed")
                : (isZH ? "標記為完成" : "Mark done")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return isEditing ? renderEditForm() : renderDetailView();
}

const styles = StyleSheet.create({
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  cardValue: {
    flex: 1,
    fontSize: 14,
    letterSpacing: -0.15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
  },
});
