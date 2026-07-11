import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export const SupportLegalCard = memo(function SupportLegalCard({
  theme,
  t,
  navigation,
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.rule,
        overflow: "hidden",
      }}
    >
      {/* Send Feedback Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Support")}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderBottomWidth: 1,
          borderBottomColor: theme.rule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <MaterialIcons
            name="feedback"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            {t.feedback || "Send Feedback"}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={theme.textTertiary}
        />
      </TouchableOpacity>

      {/* Terms of Use */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Terms")}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderBottomWidth: 1,
          borderBottomColor: theme.rule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <MaterialIcons
            name="description"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            {t.terms}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={theme.textTertiary}
        />
      </TouchableOpacity>

      {/* Privacy Policy */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Privacy")}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <MaterialIcons
            name="privacy-tip"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            {t.privacy}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={theme.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
});
