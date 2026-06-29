import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SettingScreen from "../screens/SettingScreen";
import TermsScreen from "../screens/TermsScreen";
import PrivacyScreen from "../screens/PrivacyScreen";
import SupportScreen from "../screens/SupportScreen";

const Stack = createStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}
