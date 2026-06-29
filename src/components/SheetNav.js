import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const SheetNav = ({
  title,
  backLabel,
  onBack,
  actionLabel,
  onAction,
  actionColor,
  theme,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const accent = theme?.primary || "#3B4B7A";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme?.background || "#F2F1EB",
          borderBottomColor: theme?.rule || "rgba(26,31,46,0.12)",
          paddingTop: insets.top || 16,
        },
        style,
      ]}
    >
      {/* Back */}
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={styles.side}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={18} color={theme?.textSecondary || "#454C66"} />
        {backLabel ? (
          <Text
            style={[
              styles.backLabel,
              {
                color: theme?.textSecondary || "#454C66",
                fontFamily: theme?.typography?.callout?.fontFamily,
                fontSize: theme?.typography?.callout?.fontSize || 14,
              },
            ]}
          >
            {backLabel}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={[
          styles.title,
          {
            color: theme?.text || "#1A1F2E",
            fontFamily: theme?.typography?.headline?.fontFamily,
            fontSize: theme?.typography?.headline?.fontSize || 15,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Action */}
      <View style={styles.side}>
        {actionLabel ? (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.actionLabel,
                {
                  color: actionColor || accent,
                  fontFamily: theme?.typography?.headline?.fontFamily,
                  fontSize: theme?.typography?.headline?.fontSize || 15,
                },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 60,
  },
  backLabel: {
    fontWeight: "500",
    letterSpacing: -0.2,
    marginLeft: 2,
  },
  title: {
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
    textAlign: "center",
  },
  actionLabel: {
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "right",
  },
});

export default SheetNav;
