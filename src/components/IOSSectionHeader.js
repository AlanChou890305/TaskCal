import React from "react";
import { Text, StyleSheet } from "react-native";

const IOSSectionHeader = ({ title, theme, style }) => (
  <Text
    style={[
      styles.header,
      {
        color: theme.textTertiary,
        fontFamily: theme.typography?.monoSection?.fontFamily || "JetBrainsMono_500Medium",
        fontSize: theme.typography?.monoSection?.fontSize || 9,
        letterSpacing: theme.typography?.monoSection?.letterSpacing || 1.5,
      },
      style,
    ]}
  >
    {title.toUpperCase()}
  </Text>
);

const styles = StyleSheet.create({
  header: {
    fontWeight: "500",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
  },
});

export default IOSSectionHeader;
