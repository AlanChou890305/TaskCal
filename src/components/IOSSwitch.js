import React, { useEffect, useRef } from "react";
import { TouchableWithoutFeedback, Animated, StyleSheet } from "react-native";

const TRACK_W = 42;
const TRACK_H = 24;
const KNOB = 20;
const KNOB_OFF = 2;
const KNOB_ON = TRACK_W - KNOB - 2;

const IOSSwitch = ({ value = false, onValueChange, theme, style }) => {
  const translateX = useRef(new Animated.Value(value ? KNOB_ON : KNOB_OFF)).current;
  const trackColor = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? KNOB_ON : KNOB_OFF,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(trackColor, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const accent = theme?.primary || "#3B4B7A";
  const off = theme?.textTertiary || "#8E94AA";
  const paper = theme?.buttonText || "#F2F1EB";

  const bg = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: [off, accent],
  });

  return (
    <TouchableWithoutFeedback onPress={() => onValueChange?.(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: bg }, style]}>
        <Animated.View
          style={[
            styles.knob,
            {
              backgroundColor: paper,
              transform: [{ translateX }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 2,
            },
          ]}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
  },
});

export default IOSSwitch;
