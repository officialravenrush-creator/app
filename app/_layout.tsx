// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const { user, loading } = useAuth();

  // Block app until auth state is known
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          // Logged in users
          <Stack.Screen name="(tabs)" />
        ) : (
          // Logged out users
          <Stack.Screen name="(auth)" />
        )}

        <Stack.Screen
          name="modal"
          options={{ presentation: "modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
