// app/_layout.tsx
import { Slot, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

// AdMob
import mobileAds from "react-native-google-mobile-ads";

export default function RootLayout() {
  const { user, loading, onboarded } = useAuth();
  const segments = useSegments();

  // ✅ INITIALIZE ADMOB ONLY (SAFE)
  useEffect(() => {
    if (Platform.OS === "android") {
      mobileAds()
        .initialize()
        .then(status => {
          console.log("✅ AdMob initialized:", status);
        })
        .catch(err => {
          console.log("❌ AdMob init failed:", err);
        });
    }
  }, []);

  // ⏳ Wait for auth
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

  // 🚧 Logged-in but NOT onboarded
  if (user && !onboarded && group !== "(onboarding)") {
    return <Redirect href="/(onboarding)/profileSetup" />;
  }

  // 🚫 Logged-in & onboarded → block auth/onboarding
  if (
    user &&
    onboarded &&
    (group === "(auth)" || group === "(onboarding)")
  ) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}
