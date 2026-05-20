import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const IOSChip = ({ label, active = false, onPress, theme, style }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primaryTint : "transparent",
          borderColor: active ? theme.primary : (theme.ruleStrong || "rgba(26,31,46,0.22)"),
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: active ? theme.primary : theme.textSecondary,
            fontFamily: active
              ? theme.typography?.headline?.fontFamily
              : theme.typography?.callout?.fontFamily,
            fontSize: theme.typography?.callout?.fontSize || 14,
            fontWeight: active ? "600" : "500",
            letterSpacing: -0.15,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {},
});

export default IOSChip;
