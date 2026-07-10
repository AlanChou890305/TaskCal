import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import IOSCheckbox from "../IOSCheckbox";
import { formatTimeDisplay as formatTimeDisplayUtil } from "../../utils/dateUtils";
import { styles } from "../../screens/CalendarScreen.styles";

const formatTimeDisplay = formatTimeDisplayUtil;

const SKELETON_WIDTHS = ["58%", "72%", "46%", "65%"];

const TaskSkeleton = ({ theme, widthIndex = 0 }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== "web";
  const isDark = theme.mode === "dark";

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver,
      }),
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-250, 250],
  });

  const baseBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,31,46,0.07)";
  const highlightBg = isDark ? "rgba(255,255,255,0.14)" : "rgba(26,31,46,0.14)";

  const SkBlock = ({ width, height, borderRadius = 4 }) => (
    <View
      style={{
        overflow: "hidden",
        backgroundColor: baseBg,
        borderRadius,
        width,
        height,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 150,
          backgroundColor: highlightBg,
          transform: [{ translateX }],
        }}
      />
    </View>
  );

  const titleW = SKELETON_WIDTHS[widthIndex % SKELETON_WIDTHS.length];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.rule || theme.divider,
        backgroundColor: theme.background,
        gap: 12,
      }}
    >
      <SkBlock width={20} height={20} borderRadius={3} />
      <View style={{ flex: 1 }}>
        <SkBlock width={titleW} height={12} />
      </View>
      <SkBlock width={32} height={10} />
    </View>
  );
};

// 單一任務列。以 React.memo 包裝，配合上層穩定的 handler 引用與逐項不變的
// item 參考，切換某一項任務時只會重繪該項，而非整份清單。
const TaskItem = React.memo(function TaskItem({
  item,
  theme,
  t,
  isMoveTarget,
  onToggle,
  onEdit,
  onLongPress,
}) {
  const done = !!item.is_completed;
  return (
    <View
      style={[
        styles.taskItemRow,
        {
          backgroundColor: theme.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.rule || theme.divider,
          paddingVertical: 16,
          paddingHorizontal: 16,
        },
      ]}
    >
      <IOSCheckbox
        checked={done}
        onPress={() => onToggle(item)}
        theme={theme}
      />
      <TouchableOpacity
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          marginLeft: 12,
          backgroundColor: "transparent",
        }}
        onPress={() => onEdit(item)}
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: theme.typography?.callout?.fontFamily,
            fontSize: 14,
            fontWeight: "500",
            letterSpacing: -0.2,
            color: done ? theme.textTertiary : theme.text,
            textDecorationLine: done ? "line-through" : "none",
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        {item.time ? (
          <Text
            style={{
              fontFamily:
                theme.typography?.monoTime?.fontFamily ||
                "JetBrainsMono_500Medium",
              fontSize: 13,
              fontWeight: "500",
              letterSpacing: -0.2,
              color: done ? theme.textTertiary : theme.primary,
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            {formatTimeDisplay(item.time)}
          </Text>
        ) : null}
        {isMoveTarget ? (
          <Text style={[styles.moveHint, { color: theme.primary }]}>
            {t.moveHint}
          </Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
});

export { TaskItem, TaskSkeleton };
