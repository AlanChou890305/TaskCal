import React from "react";
import { Text, StyleSheet } from "react-native";

const IOSSectionHeader = ({ title, theme, style }) => (
  <Text
    style={[
      styles.header,
      {
        color: theme.textSecondary,
        fontSize: theme.typography?.footnote?.fontSize || 13,
        letterSpacing: theme.typography?.footnote?.letterSpacing || -0.08,
      },
      style,
    ]}
  >
    {title.toUpperCase()}
  </Text>
);

const styles = StyleSheet.create({
  header: {
    fontWeight: "400",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
});

export default IOSSectionHeader;
