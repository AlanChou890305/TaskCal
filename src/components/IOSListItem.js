import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const IOSListItem = ({
  title,
  subtitle,
  icon,
  iconColor,
  onPress,
  theme,
  rightElement,
  showChevron = true,
  style,
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={[
        styles.container,
        {
          minHeight: theme.spacing?.listItemHeight || 44,
          borderBottomColor: theme.divider,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconColor || theme.primary,
              borderRadius: theme.radius?.sm || 4,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={theme.buttonText || "#F2F1EB"} />
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontFamily: theme.typography?.callout?.fontFamily,
              fontSize: theme.typography?.callout?.fontSize || 14,
              fontWeight: "500",
              letterSpacing: -0.2,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.textTertiary,
                fontFamily: theme.typography?.subheadline?.fontFamily,
                fontSize: theme.typography?.subheadline?.fontSize || 13,
                fontWeight: "500",
                letterSpacing: -0.1,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {rightElement}

      {showChevron && onPress && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={theme.textTertiary}
          style={styles.chevron}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {},
  subtitle: {
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default IOSListItem;
