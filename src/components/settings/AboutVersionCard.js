import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Application from "expo-application";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export const AboutVersionCard = memo(function AboutVersionCard({
  theme,
  t,
  effectiveHasUpdate,
  effectiveVersionInfo,
  onVersionPress,
}) {
  const versionLabel =
    effectiveVersionInfo?.version ||
    Application.nativeApplicationVersion ||
    "1.2.9";

  return (
    <View
      style={{
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.rule,
        overflow: "hidden",
      }}
    >
      {effectiveHasUpdate ? (
        <TouchableOpacity
          onPress={onVersionPress}
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
              name="system-update"
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
              {t.version} {versionLabel}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                backgroundColor: theme.primary + "20",
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 8,
                borderWidth: 1,
                borderColor: theme.primary + "60",
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                }}
              >
                {t.updateAvailable || "Download Latest"}
              </Text>
            </View>
            <MaterialIcons name="open-in-new" size={14} color={theme.primary} />
          </View>
        </TouchableOpacity>
      ) : (
        <View
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
              name="info-outline"
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
              {t.version} {versionLabel}
            </Text>
          </View>
          <Text
            style={{
              color: theme.textTertiary,
              fontSize: 13,
              letterSpacing: -0.1,
            }}
          >
            {t.latestVersion || "Latest"}
          </Text>
        </View>
      )}
    </View>
  );
});
