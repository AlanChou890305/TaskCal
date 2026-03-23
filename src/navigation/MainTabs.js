import React, { useContext } from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LanguageContext, ThemeContext } from "../contexts";
import CalendarScreen from "../screens/CalendarScreen";
import SettingScreen from "../screens/SettingScreen";
import { isIOS26Plus } from "../utils/platform";

const Tab = createBottomTabNavigator();
const TabView = Platform.OS !== "web" ? require("react-native-bottom-tabs").default : null;

const getAppDisplayName = () => {
  return "TaskCal";
};

export default function MainTabs() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const [tabIndex, setTabIndex] = React.useState(0);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      setTimeout(() => {
        document.title = getAppDisplayName();
      }, 0);
    }
  });

  // iOS 26+: stable references to prevent native tab bar appearance flicker
  const ios26Routes = React.useMemo(() => [
    {
      key: "calendar",
      title: t.tasks || "Tasks",
      focusedIcon: { sfSymbol: "checkmark.square.fill" },
      unfocusedIcon: { sfSymbol: "checkmark.square" },
    },
    {
      key: "settings",
      title: t.settings || "Settings",
      focusedIcon: { sfSymbol: "gearshape.fill" },
      unfocusedIcon: { sfSymbol: "gearshape" },
    },
  ], [t.tasks, t.settings]);

  const ios26RenderScene = React.useCallback(({ route }) => {
    switch (route.key) {
      case "calendar":
        return <CalendarScreen />;
      case "settings":
        return <SettingScreen />;
      default:
        return null;
    }
  }, []);

  const ios26TabBarStyle = React.useMemo(() => ({ backgroundColor: "transparent" }), []);

  // iOS 26+: native UITabBar with Liquid Glass
  if (isIOS26Plus) {
    return (
      <TabView
        navigationState={{ index: tabIndex, routes: ios26Routes }}
        onIndexChange={setTabIndex}
        renderScene={ios26RenderScene}
        scrollEdgeAppearance="transparent"
        tabBarActiveTintColor={theme?.tabBarActive}
        tabBarInactiveTintColor={theme?.tabBarInactive}
        tabBarStyle={ios26TabBarStyle}
      />
    );
  }

  // iOS < 26: standard React Navigation bottom tabs (proper centering)
  const verticalPad = Math.round(insets.bottom * 0.5);
  const isDark = theme?.mode === "dark";
  const tabBgColor = theme?.tabBarBackground || (isDark ? "#1c1c1e" : "#f9f9f9");
  const tabActiveColor = theme?.tabBarActive || (isDark ? "#60A5FA" : "#3B82F6");
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
      })}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: t.tasks || "Tasks" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingScreen}
        options={{ title: t.settings || "Settings" }}
      />
    </Tab.Navigator>
  );
}
