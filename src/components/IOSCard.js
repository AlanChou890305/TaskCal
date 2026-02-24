import React from "react";
import { View, StyleSheet } from "react-native";

const IOSCard = ({ children, theme, shadowStyle = "card", style }) => {
  const shadow = theme.shadows?.[shadowStyle] || theme.shadows?.card || {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderRadius: theme.radius?.lg || theme.borderRadius,
        },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});

export default IOSCard;
