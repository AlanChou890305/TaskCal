import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheetOverlay } from "./BottomSheetOverlay";

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
  const handleDone = () => {
    if (tempDate) {
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, "0");
      const day = String(tempDate.getDate()).padStart(2, "0");
      setTaskDate(`${year}-${month}-${day}`);
    }
    setDatePickerVisible(false);
  };

  return (
    <BottomSheetOverlay
      theme={theme}
      visible={datePickerVisible}
      title={isZH ? "日期" : "Date"}
      cancelLabel={t.cancel}
      doneLabel={t.confirm || (isZH ? "完成" : "Done")}
      onCancel={() => setDatePickerVisible(false)}
      onDone={handleDone}
      insets={insets}
      contentStyle={{ width: "100%" }}
    >
      {tempDate && (
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
      )}
    </BottomSheetOverlay>
  );
}
