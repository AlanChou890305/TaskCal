import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// 共用的底部彈出選擇器外殼（遮罩、抓手、取消/標題/完成三欄列、insets.bottom 處理），
// 原本 DatePickerOverlay/TimePickerOverlay 各自複製一份，抽出後兩者只需傳入
// 各自的 <DateTimePicker mode="date"/mode="time" /> 作為 children。
export function BottomSheetOverlay({
  theme,
  visible,
  title,
  cancelLabel,
  doneLabel,
  onCancel,
  onDone,
  insets,
  contentStyle,
  children,
}) {
  if (!visible || Platform.OS === "web") return null;

  const monoKicker = {
    fontFamily:
      theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.0,
    textTransform: "uppercase",
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: theme.modalOverlay || "rgba(26,31,46,0.55)",
          justifyContent: "flex-end",
        }}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={{
            backgroundColor: theme.backgroundSecondary,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          onStartShouldSetResponder={() => true}
        >
          {/* Grabber */}
          <View
            style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.textTertiary,
                opacity: 0.5,
              }}
            />
          </View>
          {/* Cancel / Title / Done */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              style={{ padding: 6, minWidth: 60 }}
            >
              <Text style={[monoKicker, { color: theme.textSecondary }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <Text style={[monoKicker, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onDone}
              style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
            >
              <Text style={[monoKicker, { color: theme.primary }]}>
                {doneLabel}
              </Text>
            </TouchableOpacity>
          </View>
          {children ? (
            <View
              style={[
                {
                  alignItems: "center",
                  backgroundColor: theme.background,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.divider,
                  paddingBottom: insets.bottom,
                },
                contentStyle,
              ]}
            >
              {children}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}
