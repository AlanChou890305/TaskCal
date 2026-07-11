import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheetOverlay } from "./BottomSheetOverlay";

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
  const handleDone = () => {
    if (tempTime) {
      const hours = String(tempTime.getHours()).padStart(2, "0");
      const minutes = String(tempTime.getMinutes()).padStart(2, "0");
      setTaskTime(`${hours}:${minutes}`);
    }
    setTimePickerVisible(false);
  };

  return (
    <BottomSheetOverlay
      theme={theme}
      visible={timePickerVisible}
      title={t.timeLabel}
      cancelLabel={t.cancel}
      doneLabel={t.confirm || (isZH ? "完成" : "Done")}
      onCancel={() => setTimePickerVisible(false)}
      onDone={handleDone}
      insets={insets}
    >
      {tempTime && (
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
      )}
    </BottomSheetOverlay>
  );
}
