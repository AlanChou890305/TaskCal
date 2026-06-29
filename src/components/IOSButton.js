import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const IOSButton = ({ title, onPress, theme, variant = "primary", disabled, style }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          button: {
            backgroundColor: "transparent",
            height: 44,
            borderWidth: 1,
            borderColor: theme.buttonSecondaryBorder || "rgba(26,31,46,0.22)",
          },
          text: {
            color: theme.buttonSecondaryText || theme.text,
            fontFamily: theme.typography?.callout?.fontFamily,
            fontSize: theme.typography?.callout?.fontSize || 14,
            fontWeight: "500",
            letterSpacing: -0.15,
          },
        };
      case "destructive":
        return {
          button: {
            backgroundColor: "transparent",
            height: 44,
            borderWidth: 1,
            borderColor: theme.buttonSecondaryBorder || "rgba(26,31,46,0.22)",
          },
          text: {
            color: theme.error,
            fontFamily: theme.typography?.callout?.fontFamily,
            fontSize: theme.typography?.callout?.fontSize || 14,
            fontWeight: "500",
            letterSpacing: -0.15,
          },
        };
      default:
        return {
          button: {
            backgroundColor: theme.primary,
            height: 54,
          },
          text: {
            color: theme.buttonText || "#F2F1EB",
            fontFamily: theme.typography?.headline?.fontFamily,
            fontSize: 13,
            fontWeight: "600",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        { borderRadius: theme.radius?.lg || 8 },
        variantStyles.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, variantStyles.text]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  text: {},
  disabled: {
    opacity: 0.4,
  },
});

export default IOSButton;
