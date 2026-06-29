import React from "react";
import { TouchableOpacity } from "react-native";
import Svg, { Rect, Polyline } from "react-native-svg";

const IOSCheckbox = ({ checked = false, onPress, theme, size = 20, style }) => {
  const accent = theme?.primary || "#3B4B7A";
  const ink2 = theme?.textSecondary || "#454C66";
  const paper = theme?.buttonText || "#F2F1EB";
  const radius = 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={style}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {checked ? (
          <>
            <Rect
              x="0.8"
              y="0.8"
              width="18.4"
              height="18.4"
              rx={radius}
              fill={accent}
              strokeWidth="0"
            />
            <Polyline
              points="5,10.5 8.5,14 15,7"
              fill="none"
              stroke={paper}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <Rect
            x="0.8"
            y="0.8"
            width="18.4"
            height="18.4"
            rx={radius}
            fill="none"
            stroke={ink2}
            strokeWidth="1.6"
          />
        )}
      </Svg>
    </TouchableOpacity>
  );
};

export default IOSCheckbox;
