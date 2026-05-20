import React from "react";
import { TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

let LiquidGlassFABButton = null;
try {
  LiquidGlassFABButton = require("./LiquidGlassFABButton").default;
} catch (_) {}

const IndigoFAB = ({ onPress, theme, isNative = false, style }) => {
  const glow = theme?.shadows?.primaryGlow || {};
  const accent = theme?.primary || "#3B4B7A";
  const paper = theme?.buttonText || "#F2F1EB";

  if (isNative && LiquidGlassFABButton && Platform.OS === "ios") {
    return (
      <LiquidGlassFABButton
        style={[styles.fab, style]}
        onPress={onPress}
        primaryColor={accent}
      />
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.fab,
        {
          backgroundColor: accent,
          ...glow,
        },
        style,
      ]}
    >
      <Ionicons name="add" size={22} color={paper} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});

export default IndigoFAB;
