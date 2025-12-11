// app/auth/profileSetup.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";

import * as ImagePicker from "expo-image-picker"; // 🔒 Kept for future re-enable
import { useRouter } from "expo-router";

// Firebase


/* ---------- Expo Router Wrapper ---------- */
export default function ProfileSetup() {
  return <ProfileSetupScreen />;
}

/* ---------- Actual Screen Implementation ---------- */
function ProfileSetupScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null); // 🔒 Logic kept
  const [referredBy, setReferredBy] = useState("");

const [user, setUser] = useState<any>(null);

useEffect(() => {
  (async () => {
    const { getAuthInstance } = await import("../../firebase/firebaseConfig");
    const auth = await getAuthInstance();

    setUser(auth.currentUser);

    if (!auth.currentUser) {
      router.replace("/(auth)/login");
    }
  })();
}, []);





  /** Crash-proof: redirect if no auth user */
  useEffect(() => {
    if (!user) router.replace("/(auth)/login");
  }, [user]);

  const referralCode = user?.uid?.slice(0, 8) ?? "loading";

  // 🔒 Avatar logic preserved, but unused in UI
  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn("Pick avatar error:", err?.message ?? err);
    }
  };

 const saveProfile = async () => {
  if (!username.trim()) {
    Alert.alert("Error", "Username is required");
    return;
  }

  try {
    // Lazy import Firebase pieces
    const { getAuthInstance, getDb, getStorageInstance } = await import("../../firebase/firebaseConfig");
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");

    const auth = await getAuthInstance();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "Not authenticated");
      return router.replace("/(auth)/login");
    }

    const db = await getDb();
    const storage = await getStorageInstance();

    let avatarUrl: string | null = null;

    if (avatar) {
      const imageRef = ref(storage, `avatars/${user.uid}.jpg`);

      // Upload disabled, kept for future
      /*
      const img = await fetch(avatar);
      const bytes = await img.blob();
      await uploadBytes(imageRef, bytes);
      avatarUrl = await getDownloadURL(imageRef);
      */
    }

    await setDoc(doc(db, "users", user.uid), {
      username: username.trim(),
      avatarUrl,
      referralCode: user.uid.slice(0, 8),
      referredBy: referredBy.trim() || null,
      createdAt: serverTimestamp(),
    });

    Alert.alert("Success", "Profile saved!");
    router.replace("/(tabs)");

  } catch (error: any) {
    Alert.alert("Error", error.message);
  }
};



  /* ---------- Animations ---------- */
  const titleAnim = useRef(new Animated.Value(0)).current;
  const fieldsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(fieldsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start();

  const pressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      {/* HEADER */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Pick a username and (optionally) a referral code.
        </Text>
      </Animated.View>

      {/* FORM */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fieldsAnim,
            transform: [
              {
                translateY: fieldsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* 🔥 AVATAR UI REMOVED COMPLETELY  
            (logic still exists above)
        */}

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Referral code */}
        <Text style={styles.label}>Referral Code (Optional)</Text>
        <TextInput
          value={referredBy}
          onChangeText={setReferredBy}
          placeholder="Enter code if someone invited you"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Your referral code */}
        <Text style={styles.referralText}>
          Your Referral Code:{" "}
          <Text style={styles.referralCode}>{referralCode}</Text>
        </Text>
      </Animated.View>

      {/* BUTTON */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={saveProfile}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const BLUE = "#377dff";
const DARK = "#000000";
const CARD = "#0b0b0b";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  headerContainer: { marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },

  label: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  referralText: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },
  referralCode: { color: "#fff", fontWeight: "700" },

  footer: { marginTop: 20 },

  primaryButton: {
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
