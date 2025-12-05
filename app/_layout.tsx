import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { auth, db, storage } from "../firebase/firebaseConfig";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


export const unstable_settings = {
  anchor: "(tabs)",
};

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
          // 🔥 No screen title text anywhere
          headerTitle: "",

          // Premium dark header
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",

          // Clean modern title area
          headerTitleStyle: {
            color: "transparent",
          },
        }}
      >
        {isAuthenticated ? (
          profileCompleted ? (
           <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen
              name="auth/profileSetup"
              options={{
                headerShown: true,
              }}
            />
          )
        ) : (
          <>
            <Stack.Screen
              name="auth/register"
              options={{
                headerShown: true,
              }}
            />

            <Stack.Screen
              name="auth/login"
              options={{
                headerShown: true,
              }}
            />

            <Stack.Screen
              name="auth/forgot"
              options={{
                headerShown: true,
              }}
            />
          </>
        )}

        <Stack.Screen
          name="modal"
          options={{ presentation: "modal" }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
