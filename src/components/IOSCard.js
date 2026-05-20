import React from "react";
import { View, StyleSheet } from "react-native";

const IOSCard = ({ children, theme, shadowStyle = "card", style }) => {
  const shadow = theme.shadows?.[shadowStyle] || {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderRadius: theme.radius?.lg || 8,
          padding: theme.spacing?.cardPadding || 20,
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
  },
});

export default IOSCard;
