import { jest } from "@jest/globals";
import type { ReactNode } from "react";

jest.mock("react-native-reanimated", () => jest.requireActual("react-native-reanimated/mock"));

jest.mock("react-native-gesture-handler", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const gesto = {
    activeOffsetX: () => gesto,
    failOffsetY: () => gesto,
    onUpdate: () => gesto,
    onEnd: () => gesto,
  };

  return {
    Gesture: { Pan: () => gesto },
    GestureDetector: ({ children }: { children: ReactNode }) =>
      react.createElement(View, null, children),
    GestureHandlerRootView: View,
  };
});

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 5 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: jest.fn(),
    getPermissionsAsync: jest.fn(),
    isAvailableAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
  },
}));
