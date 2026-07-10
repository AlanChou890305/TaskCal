import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export function DatePickerOverlay({
  theme,
  t,
  isZH,
  insets,
  themeMode,
  datePickerVisible,
  setDatePickerVisible,
  tempDate,
  setTempDate,
  setTaskDate,
}) {
  if (!datePickerVisible || Platform.OS === "web") return null;

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
        onPress={() => setDatePickerVisible(false)}
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
              onPress={() => setDatePickerVisible(false)}
              style={{ padding: 6, minWidth: 60 }}
            >
              <Text style={[monoKicker, { color: theme.textSecondary }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            <Text style={[monoKicker, { color: theme.text }]}>
              {isZH ? "日期" : "Date"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (tempDate) {
                  const year = tempDate.getFullYear();
                  const month = String(tempDate.getMonth() + 1).padStart(
                    2,
                    "0",
                  );
                  const day = String(tempDate.getDate()).padStart(2, "0");
                  setTaskDate(`${year}-${month}-${day}`);
                }
                setDatePickerVisible(false);
              }}
              style={{ padding: 6, minWidth: 60, alignItems: "flex-end" }}
            >
              <Text style={[monoKicker, { color: theme.primary }]}>
                {t.confirm || (isZH ? "完成" : "Done")}
              </Text>
            </TouchableOpacity>
          </View>
          {tempDate && (
            <View
              style={{
                alignItems: "center",
                width: "100%",
                backgroundColor: theme.background,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
                paddingBottom: insets.bottom,
              }}
            >
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                themeVariant={themeMode === "dark" ? "dark" : "light"}
                accentColor={theme.primary}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
                style={{ width: "100%" }}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}
