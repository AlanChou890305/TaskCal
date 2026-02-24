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
              borderRadius: theme.radius?.sm || 6,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontSize: theme.typography?.body?.fontSize || 17,
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
                color: theme.textSecondary,
                fontSize: theme.typography?.subheadline?.fontSize || 15,
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
          size={20}
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    letterSpacing: -0.41,
  },
  subtitle: {
    marginTop: 2,
    letterSpacing: -0.24,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default IOSListItem;
