// app/_layout.tsx

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { auth, db } from "../firebase/firebaseConfig";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        setProfileCompleted(userDoc.exists() && !!userDoc.data().username);
      } else {
        setIsAuthenticated(false);
        setProfileCompleted(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) return <StatusBar style="auto" />;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          profileCompleted ? (
            <Stack.Screen name="(tabs)" />
          ) : (
            <Stack.Screen name="auth/profileSetup" />
          )
        ) : (
          <>
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/forgot" />
          </>
        )}

        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
