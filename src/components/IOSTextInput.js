import React from "react";
import { TextInput, StyleSheet } from "react-native";

const IOSTextInput = ({
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false,
  style,
  inputStyle,
  ...rest
}) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme?.textPlaceholder || "#8E94AA"}
      multiline={multiline}
      style={[
        styles.input,
        {
          backgroundColor: theme?.input || "#F2F1EB",
          borderColor: theme?.inputBorder || "rgba(26,31,46,0.12)",
          color: theme?.text || "#1A1F2E",
          fontFamily: theme?.typography?.body?.fontFamily,
          fontSize: theme?.typography?.body?.fontSize || 15,
          borderRadius: theme?.radius?.lg || 8,
        },
        style,
        inputStyle,
      ]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 16,
    letterSpacing: -0.15,
  },
});

export default IOSTextInput;
