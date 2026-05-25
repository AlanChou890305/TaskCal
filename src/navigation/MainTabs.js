import React, { useCallback, useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LanguageContext, ThemeContext } from "../contexts";
import CalendarStack from "./CalendarStack";
import SettingsStack from "./SettingsStack";

const Tab = createBottomTabNavigator();

const getAppDisplayName = () => {
  return "TaskCal";
};

export default function MainTabs() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      setTimeout(() => {
        document.title = getAppDisplayName();
      }, 0);
    }
  });

  const verticalPad = Math.round(insets.bottom * 0.5);
  const isDark = theme?.mode === "dark";
  const tabBgColor = theme?.tabBarBackground || (isDark ? "#14182A" : "#F2F1EB");
  const tabActiveColor = theme?.tabBarActive || (isDark ? "#8B98D0" : "#3B4B7A");
  const tabInactiveColor = theme?.tabBarInactive || (isDark ? "#7C8198" : "#8E94AA");
  const tabBorderColor = isDark ? "#48484a" : "rgba(0,0,0,0.12)";

  const TabButton = useCallback(
    (props) => {
      const isSelected = props.accessibilityState?.selected;
      return (
        <Pressable
          testID={props.testID}
          accessibilityLabel={props.accessibilityLabel}
          accessibilityRole="tab"
          accessibilityState={props.accessibilityState}
          onPress={props.onPress}
          onLongPress={props.onLongPress}
          style={props.style}
        >
          {props.children}
          <View style={{
            position: "absolute",
            bottom: 0,
            alignSelf: "center",
            width: 28,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: isSelected ? tabActiveColor : "transparent",
          }} />
        </Pressable>
      );
    },
    [tabActiveColor]
  );

  const tabBarStyleBase = {
    backgroundColor: tabBgColor,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tabBorderColor,
    paddingTop: verticalPad,
    paddingBottom: verticalPad,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Calendar") {
            return (
              <MaterialCommunityIcons
                name="check"
                size={size}
                color={color}
              />
            );
          } else {
            return (
              <MaterialCommunityIcons
                name="cog-outline"
                size={size}
                color={color}
              />
            );
          }
        },
        tabBarButton: TabButton,
        tabBarActiveTintColor: tabActiveColor,
        tabBarInactiveTintColor: tabInactiveColor,
        tabBarStyle: tabBarStyleBase,
        tabBarLabelStyle: {
          textTransform: "uppercase",
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStack}
        options={({ route }) => ({
          title: t.tasks || "Tasks",
          tabBarStyle: getFocusedRouteNameFromRoute(route) === "TaskDetail"
            ? { display: "none" }
            : tabBarStyleBase,
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={({ route }) => ({
          title: t.settings || "Settings",
          tabBarStyle: ["Terms", "Privacy"].includes(getFocusedRouteNameFromRoute(route))
            ? { display: "none" }
            : tabBarStyleBase,
        })}
      />
    </Tab.Navigator>
  );
}
