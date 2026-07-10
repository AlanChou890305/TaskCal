import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export function TimePickerOverlay({
  theme,
  t,
  isZH,
  insets,
  themeMode,
  timePickerVisible,
  setTimePickerVisible,
  tempTime,
  setTempTime,
  setTaskTime,
}) {
  if (!timePickerVisible || Platform.OS === "web") return null;

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
        onPress={() => setTimePickerVisible(false)}
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
          {/* Clear / Title / Done */}
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
              onPress={() => setTimePickerVisible(false)}
              style={{ padding: 6, minWidth: 60 }}
            >
              <Text style={[monoKicker, { color: theme.textSecondary }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            <Text style={[monoKicker, { color: theme.text }]}>
              {t.timeLabel}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (tempTime) {
                  const hours = String(tempTime.getHours()).padStart(2, "0");
                  const minutes = String(tempTime.getMinutes()).padStart(
                    2,
                    "0",
                  );
                  setTaskTime(`${hours}:${minutes}`);
                }
                setTimePickerVisible(false);
              }}
              style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
            >
              <Text style={[monoKicker, { color: theme.primary }]}>
                {t.confirm || (isZH ? "完成" : "Done")}
              </Text>
            </TouchableOpacity>
          </View>
          {tempTime && (
            <View
              style={{
                alignItems: "center",
                backgroundColor: theme.background,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
                paddingBottom: insets.bottom,
              }}
            >
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "clock"}
                themeVariant={themeMode === "dark" ? "dark" : "light"}
                accentColor={theme.primary}
                onChange={(_, selected) => {
                  if (selected) setTempTime(selected);
                }}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}
