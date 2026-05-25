import React, { useContext } from "react";
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
  const tabBgColor = theme?.tabBarBackground || (isDark ? "#1c1c1e" : "#f9f9f9");
  const tabActiveColor = theme?.tabBarActive || (isDark ? "#8B98D0" : "#3B4B7A");
  const tabInactiveColor = theme?.tabBarInactive || (isDark ? "#636366" : "#999999");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Calendar") {
            return (
              <MaterialCommunityIcons
                name="checkbox-marked-outline"
                size={size}
                color={color}
              />
            );
          } else {
            return (
              <MaterialCommunityIcons
                name={focused ? "cog" : "cog-outline"}
                size={size}
                color={color}
              />
            );
          }
        },
        tabBarActiveTintColor: tabActiveColor,
        tabBarInactiveTintColor: tabInactiveColor,
        tabBarStyle: {
          backgroundColor: tabBgColor,
          borderTopColor: isDark ? "#1c1c1e" : "#e0e0e0",
          paddingTop: verticalPad,
          paddingBottom: verticalPad,
        },
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
            : {
                backgroundColor: tabBgColor,
                borderTopColor: isDark ? "#1c1c1e" : "#e0e0e0",
                paddingTop: verticalPad,
                paddingBottom: verticalPad,
              },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={({ route }) => ({
          title: t.settings || "Settings",
          tabBarStyle: ["Terms", "Privacy"].includes(getFocusedRouteNameFromRoute(route))
            ? { display: "none" }
            : {
                backgroundColor: tabBgColor,
                borderTopColor: isDark ? "#1c1c1e" : "#e0e0e0",
                paddingTop: verticalPad,
                paddingBottom: verticalPad,
              },
        })}
      />
    </Tab.Navigator>
  );
}
