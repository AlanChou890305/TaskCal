import { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import IOSCard from "../IOSCard";
import IOSSectionHeader from "../IOSSectionHeader";

export const DeveloperToolsCard = memo(function DeveloperToolsCard({
  theme,
  t,
  userType,
  isSimulatingUpdate,
  onSwitchUserType,
  onTestUpdateModal,
  onToggleSimulateUpdate,
  onForceLogoutOnboarding,
}) {
  return (
    <>
      <IOSSectionHeader
        title={t.devTools || "Developer Tools"}
        theme={theme}
        style={{ paddingHorizontal: 28 }}
      />
      <IOSCard
        theme={theme}
        style={{ marginHorizontal: 20, padding: 0, overflow: "hidden" }}
      >
        <TouchableOpacity
          onPress={() => onSwitchUserType("member")}
          activeOpacity={0.6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor:
              userType === "member"
                ? theme.primaryTint || theme.backgroundSecondary
                : "transparent",
          }}
        >
          <MaterialIcons
            name="card-membership"
            size={20}
            color={userType === "member" ? theme.primary : theme.textSecondary}
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              color: userType === "member" ? theme.primary : theme.text,
              fontSize: 15,
              fontWeight: userType === "member" ? "600" : "400",
            }}
          >
            {t.switchToMember || "Switch to Member"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.divider,
            marginHorizontal: 20,
          }}
        />

        <TouchableOpacity
          onPress={() => onSwitchUserType("general")}
          activeOpacity={0.6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor:
              userType === "general"
                ? theme.primaryTint || theme.backgroundSecondary
                : "transparent",
          }}
        >
          <MaterialIcons
            name="person-outline"
            size={20}
            color={
              userType === "general" ? theme.primary : theme.textSecondary
            }
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              color: userType === "general" ? theme.primary : theme.text,
              fontSize: 15,
              fontWeight: userType === "general" ? "600" : "400",
            }}
          >
            {t.switchToGeneral || "Switch to General"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.divider,
            marginHorizontal: 20,
          }}
        />

        <TouchableOpacity
          onPress={onTestUpdateModal}
          activeOpacity={0.6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
          }}
        >
          <MaterialIcons
            name="system-update"
            size={20}
            color={theme.textSecondary}
            style={{ marginRight: 12 }}
          />
          <Text style={{ color: theme.text, fontSize: 15 }}>
            {"Test Update Modal"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.divider,
            marginHorizontal: 20,
          }}
        />

        <TouchableOpacity
          onPress={onToggleSimulateUpdate}
          activeOpacity={0.6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: isSimulatingUpdate
              ? theme.primary + "10"
              : "transparent",
          }}
        >
          <MaterialIcons
            name={isSimulatingUpdate ? "toggle-on" : "toggle-off"}
            size={24}
            color={isSimulatingUpdate ? theme.primary : theme.textSecondary}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: isSimulatingUpdate ? theme.primary : theme.text,
                fontSize: 15,
                fontWeight: isSimulatingUpdate ? "600" : "400",
              }}
            >
              {"Simulate Update Available"}
            </Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
              {"Force Settings UI to show 'Update Available'"}
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.divider,
            marginHorizontal: 20,
          }}
        />

        <TouchableOpacity
          onPress={onForceLogoutOnboarding}
          activeOpacity={0.6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 20,
          }}
        >
          <MaterialIcons
            name="restart-alt"
            size={20}
            color="#FF3B30"
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FF3B30",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {"Force Logout + Onboarding"}
            </Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
              {"Sign out and reset onboarding state"}
            </Text>
          </View>
        </TouchableOpacity>
      </IOSCard>
    </>
  );
});
