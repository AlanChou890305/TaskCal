import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { MapPreview } from "../MapPreview";
import { styles } from "../../screens/CalendarScreen.styles";
import { DatePickerOverlay } from "./DatePickerOverlay";
import { TimePickerOverlay } from "./TimePickerOverlay";

// 定義在 module scope（而非 EditTaskModal 內部），避免每次打字造成的 re-render
// 產生「新的元件型別」，讓 React 把整段子樹當成不同元件 unmount 再 mount。
const FieldRow = memo(function FieldRow({
  theme,
  iconName,
  labelText,
  value,
  isPlaceholder,
  onPress,
  webInput,
}) {
  const monoKickerStyle = {
    fontFamily:
      theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.modalFieldRow}
    >
      <MaterialIcons name={iconName} size={18} color={theme.textSecondary} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={[
            monoKickerStyle,
            { color: theme.textTertiary, marginBottom: 1 },
          ]}
        >
          {labelText}
        </Text>
        {Platform.OS === "web" && webInput ? (
          webInput
        ) : (
          <Text
            style={{
              fontFamily: theme.typography?.body?.fontFamily,
              fontSize: 15,
              fontWeight: "500",
              color: isPlaceholder ? theme.textTertiary : theme.text,
              letterSpacing: -0.2,
            }}
          >
            {value}
          </Text>
        )}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={16}
        color={theme.textTertiary}
      />
    </TouchableOpacity>
  );
});

const FieldDivider = memo(function FieldDivider({ theme }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.rule,
        marginLeft: 16 + 18 + 14,
      }}
    />
  );
});

export function EditTaskModal({
  theme,
  t,
  isZH,
  insets,
  themeMode,
  modalVisible,
  setModalVisible,
  editingTask,
  taskText,
  setTaskText,
  taskTime,
  setTaskTime,
  taskLink,
  setTaskLink,
  taskDate,
  setTaskDate,
  taskNote,
  setTaskNote,
  taskTitleInputRef,
  modalScrollViewRef,
  saveTask,
  showDeleteConfirm,
  openPickerAfterKeyboard,
  datePickerVisible,
  setDatePickerVisible,
  tempDate,
  setTempDate,
  timePickerVisible,
  setTimePickerVisible,
  tempTime,
  setTempTime,
}) {
  const monoKickerStyle = {
    fontFamily:
      theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monNames = [
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
    if (isZH) return `${y} 年 ${m} 月 ${d} 日`;
    return `${dowNames[dow]}, ${monNames[m - 1]} ${d}`;
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      accessibilityViewIsModal={true}
    >
      <View
        style={[styles.modalOverlay, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  theme.backgroundSecondary || theme.background,
              },
            ]}
          >
            {/* Nav bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: insets.top + 12,
                paddingBottom: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ minWidth: 60 }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography?.footnote?.fontFamily,
                    fontSize: 14,
                    fontWeight: "500",
                    color: theme.textSecondary,
                    letterSpacing: -0.2,
                  }}
                >
                  {isZH ? "取消" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontFamily: theme.typography?.headline?.fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.text,
                  letterSpacing: -0.2,
                }}
              >
                {editingTask
                  ? isZH
                    ? "編輯任務"
                    : "Edit task"
                  : isZH
                    ? "新增任務"
                    : "New task"}
              </Text>
              <TouchableOpacity
                onPress={saveTask}
                disabled={!taskText.trim()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ minWidth: 60, alignItems: "flex-end" }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography?.headline?.fontFamily,
                    fontSize: 14,
                    fontWeight: "600",
                    color: taskText.trim()
                      ? theme.primary
                      : theme.textTertiary,
                    letterSpacing: -0.2,
                  }}
                >
                  {isZH ? "儲存" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={modalScrollViewRef}
              style={styles.modalScrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              nestedScrollEnabled={true}
            >
              {/* Title area */}
              <View
                style={{
                  backgroundColor: theme.background,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.rule,
                  borderBottomWidth: 1.5,
                  borderBottomColor:
                    theme.ruleStrong || "rgba(26,31,46,0.22)",
                  paddingHorizontal: 22,
                  paddingTop: 18,
                  paddingBottom: 22,
                }}
              >
                <Text
                  style={[
                    monoKickerStyle,
                    {
                      fontSize: 10,
                      letterSpacing: 2,
                      color: theme.primary,
                      marginBottom: 8,
                    },
                  ]}
                >
                  {isZH ? "任務標題" : "What needs doing?"}
                </Text>
                <TextInput
                  ref={taskTitleInputRef}
                  style={{
                    fontFamily:
                      theme.typography?.title2?.fontFamily ||
                      "InterTight_600SemiBold",
                    fontSize: 24,
                    fontWeight: "600",
                    color: theme.text,
                    letterSpacing: -0.6,
                    lineHeight: 30,
                    minHeight: 36,
                    padding: 0,
                  }}
                  value={taskText}
                  onChangeText={setTaskText}
                  placeholder={isZH ? "輸入任務..." : "e.g. Lunch with Mei"}
                  placeholderTextColor={theme.textTertiary}
                  autoFocus={false}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => {
                    if (taskText.trim()) saveTask();
                  }}
                />
              </View>

              {/* Field rows */}
              <View
                style={{
                  backgroundColor: theme.background,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.rule,
                  marginTop: 1,
                }}
              >
                {/* Date */}
                {Platform.OS === "web" ? (
                  <View style={styles.modalFieldRow}>
                    <MaterialIcons
                      name="event"
                      size={18}
                      color={theme.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text
                        style={[
                          monoKickerStyle,
                          { color: theme.textTertiary, marginBottom: 1 },
                        ]}
                      >
                        {isZH ? "日期" : "DATE"}
                      </Text>
                      <input
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        style={{
                          fontSize: 15,
                          border: "none",
                          backgroundColor: "transparent",
                          fontFamily: "inherit",
                          outline: "none",
                          color: theme.text,
                          padding: 0,
                          width: "100%",
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <FieldRow
                    theme={theme}
                    iconName="event"
                    labelText={isZH ? "日期" : "DATE"}
                    value={
                      formatDateDisplay(taskDate) ||
                      (isZH ? "選擇日期" : "Pick a date")
                    }
                    isPlaceholder={!taskDate}
                    onPress={() => {
                      setTempDate(taskDate ? new Date(taskDate) : new Date());
                      openPickerAfterKeyboard(setDatePickerVisible);
                    }}
                  />
                )}

                <FieldDivider theme={theme} />

                {/* Time */}
                {Platform.OS === "web" ? (
                  <View style={styles.modalFieldRow}>
                    <MaterialIcons
                      name="access-time"
                      size={18}
                      color={theme.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text
                        style={[
                          monoKickerStyle,
                          { color: theme.textTertiary, marginBottom: 1 },
                        ]}
                      >
                        {isZH ? "時間" : "TIME"}
                      </Text>
                      <input
                        type="time"
                        step="60"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        style={{
                          fontSize: 15,
                          border: "none",
                          backgroundColor: "transparent",
                          fontFamily: "inherit",
                          outline: "none",
                          color: theme.text,
                          padding: 0,
                          width: "100%",
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <FieldRow
                    theme={theme}
                    iconName="access-time"
                    labelText={isZH ? "時間" : "TIME"}
                    value={taskTime || (isZH ? "無" : "None")}
                    isPlaceholder={!taskTime}
                    onPress={() => {
                      const now = new Date();
                      setTempTime(
                        taskTime
                          ? new Date(
                              2024,
                              0,
                              1,
                              parseInt(taskTime.split(":")[0]) || 0,
                              parseInt(taskTime.split(":")[1]) || 0,
                            )
                          : now,
                      );
                      openPickerAfterKeyboard(setTimePickerVisible);
                    }}
                  />
                )}

                <FieldDivider theme={theme} />

                {/* Link */}
                <View
                  style={[
                    styles.modalFieldRow,
                    { alignItems: "flex-start", paddingTop: 14 },
                  ]}
                >
                  <MaterialIcons
                    name="link"
                    size={18}
                    color={theme.textSecondary}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text
                      style={[
                        monoKickerStyle,
                        { color: theme.textTertiary, marginBottom: 6 },
                      ]}
                    >
                      LINK
                    </Text>
                    <TextInput
                      style={{
                        fontFamily: theme.typography?.body?.fontFamily,
                        fontSize: 15,
                        fontWeight: "500",
                        color: taskLink ? theme.text : theme.textTertiary,
                        letterSpacing: -0.2,
                        padding: 0,
                      }}
                      value={taskLink}
                      onChangeText={setTaskLink}
                      placeholder={isZH ? "貼上連結…" : "Paste a link…"}
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {taskLink ? (
                      <MapPreview
                        url={taskLink}
                        theme={theme}
                        t={t}
                        onOpenInBrowser={() => {
                          const url = taskLink.startsWith("http")
                            ? taskLink
                            : `https://${taskLink}`;
                          Linking.openURL(url).catch(console.error);
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Notes section */}
              <View
                style={{
                  backgroundColor: theme.background,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.rule,
                  paddingHorizontal: 22,
                  paddingTop: 16,
                  paddingBottom: 20,
                  flex: 1,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons
                    name="notes"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[monoKickerStyle, { color: theme.textSecondary }]}
                  >
                    {isZH ? "備註（選填）" : "Notes (optional)"}
                  </Text>
                </View>
                <TextInput
                  style={{
                    fontFamily: theme.typography?.body?.fontFamily,
                    fontSize: 14,
                    fontWeight: "400",
                    color: theme.text,
                    letterSpacing: -0.1,
                    lineHeight: 22,
                    padding: 0,
                    flex: 1,
                    textAlignVertical: "top",
                  }}
                  value={taskNote}
                  onChangeText={setTaskNote}
                  placeholder={
                    isZH
                      ? "新增說明、連結、任何你之後會用到的內容…"
                      : "Add context, links, or anything you'll want to see later…"
                  }
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Delete button (edit mode only) */}
              {editingTask && (
                <TouchableOpacity
                  onPress={showDeleteConfirm}
                  style={{
                    marginHorizontal: 20,
                    marginTop: 8,
                    marginBottom: 8,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.error,
                    borderRadius: theme.radius?.lg || 8,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontFamily: theme.typography?.headline?.fontFamily,
                      fontSize: 13,
                      fontWeight: "600",
                      color: theme.error,
                      letterSpacing: isZH ? 0 : 0.4,
                      textTransform: isZH ? "none" : "uppercase",
                    }}
                  >
                    {isZH ? "刪除任務" : "Delete task"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        <DatePickerOverlay
          theme={theme}
          t={t}
          isZH={isZH}
          insets={insets}
          themeMode={themeMode}
          datePickerVisible={datePickerVisible}
          setDatePickerVisible={setDatePickerVisible}
          tempDate={tempDate}
          setTempDate={setTempDate}
          setTaskDate={setTaskDate}
        />
        <TimePickerOverlay
          theme={theme}
          t={t}
          isZH={isZH}
          insets={insets}
          themeMode={themeMode}
          timePickerVisible={timePickerVisible}
          setTimePickerVisible={setTimePickerVisible}
          tempTime={tempTime}
          setTempTime={setTempTime}
          setTaskTime={setTaskTime}
        />
      </View>
    </Modal>
  );
}
