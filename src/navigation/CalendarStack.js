import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import CalendarScreen from "../screens/CalendarScreen";
import TaskDetailScreen from "../screens/TaskDetailScreen";

const Stack = createStackNavigator();

export default function CalendarStack() {
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
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
  );
}
