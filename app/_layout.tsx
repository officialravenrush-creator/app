import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";

type FirebaseUser = {
  uid: string;
  email?: string | null;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        // Lazy-load Firebase config
        const { getAuthInstance, getDb } = await import("../firebase/firebaseConfig");
        const auth = await getAuthInstance();

        unsubscribe = auth.onAuthStateChanged(async (user: FirebaseUser | null) => {
          if (cancelled) return;

          if (user) {
            setIsAuthenticated(true);

            try {
              const db = await getDb();
              const { doc, getDoc } = await import("firebase/firestore");

              const userRef = doc(db, "users", user.uid);
              const userDoc = await getDoc(userRef);

              setProfileCompleted(
                userDoc.exists() && !!userDoc.data()?.username
              );
            } catch (err) {
              console.warn("[Auth] Failed to load user profile", err);
              setProfileCompleted(false);
            }
          } else {
            setIsAuthenticated(false);
            setProfileCompleted(false);
          }

          setLoading(false);
        });
      } catch (error) {
        console.warn("[Auth] Initialization failed", error);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Loading screen
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  // Navigation logic
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated && profileCompleted && <Stack.Screen name="(tabs)" />}
        {isAuthenticated && !profileCompleted && (
          <Stack.Screen name="(auth)/profileSetup" />
        )}
        {!isAuthenticated && <Stack.Screen name="(auth)" />}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
