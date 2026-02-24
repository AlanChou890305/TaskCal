import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const IOSButton = ({ title, onPress, theme, variant = "primary", disabled, style }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          button: {
            backgroundColor: theme.buttonSecondary,
            height: 44,
          },
          text: {
            color: theme.primary,
            fontWeight: "600",
          },
        };
      case "destructive":
        return {
          button: {
            backgroundColor: "transparent",
            height: 44,
          },
          text: {
            color: theme.error,
            fontWeight: "600",
          },
        };
      default:
        return {
          button: {
            backgroundColor: theme.primary,
            height: 50,
          },
          text: {
            color: theme.buttonText,
            fontWeight: "600",
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
        {
          borderRadius: theme.radius?.md || theme.borderRadius,
        },
        variantStyles.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: theme.typography?.body?.fontSize || 17 },
          variantStyles.text,
        ]}
      >
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
  text: {
    letterSpacing: -0.41,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default IOSButton;
