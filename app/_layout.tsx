// app/_layout.tsx
import { Slot, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const { user, loading, onboarded } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#060B1A",
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const group = segments[0];

  // 🔒 Protect tabs
  if (!user && group === "(tabs)") {
    return <Redirect href="/(auth)/login" />;
  }

  // 🚧 Logged-in but NOT onboarded → force onboarding
  if (user && !onboarded && group !== "(onboarding)") {
    return <Redirect href="/(onboarding)/profileSetup" />;
  }

  // 🚫 Logged-in & onboarded → block auth + onboarding
  if (user && onboarded && (group === "(auth)" || group === "(onboarding)")) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}
