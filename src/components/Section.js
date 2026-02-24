import React from "react";
import { View, Text } from "react-native";

const Section = ({ title, content, theme, isFirst }) => {
  const typo = theme.typography;

  return (
    <View style={{ marginTop: isFirst ? 0 : (theme.spacing?.sectionGap || 24) }}>
      {title && (
        <Text
          style={{
            fontSize: typo?.headline?.fontSize || 17,
            color: theme.text,
            fontWeight: typo?.headline?.fontWeight || "700",
            marginBottom: theme.spacing?.sm || 8,
            letterSpacing: typo?.headline?.letterSpacing || -0.3,
          }}
        >
          {title}
        </Text>
      )}
      <Text
        style={{
          fontSize: typo?.subheadline?.fontSize || 15,
          color: theme.text,
          lineHeight: typo?.subheadline?.lineHeight ? typo.subheadline.lineHeight + 6 : 26,
          letterSpacing: typo?.subheadline?.letterSpacing || 0.2,
        }}
      >
        {content}
      </Text>
    </View>
  );
};

export default Section;
