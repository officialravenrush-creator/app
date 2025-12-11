// app/auth/login.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

/* ---------- Expo Router Wrapper ---------- */
export default function Login() {
  return <LoginScreen />;
}

/* ---------- Actual Screen ---------- */
function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [shake, setShake] = useState(false);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      triggerError("Email and password are required.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
    const firebase = await import("../../firebase/firebaseConfig");

const auth = await firebase.getAuthInstance();
const db = await firebase.getDb();   // ✅ CORRECT


// 🔥 Disable Recaptcha for Expo (auth.settings exists on RN Firebase)
if (auth.settings) {
  auth.settings.appVerificationDisabledForTesting = true;
}



      // 🔥 Email login (Recaptcha bypass works)
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());

      const user = auth.currentUser;

      if (!user) {
        triggerError("Login failed. Try again.");
        setLoading(false);
        return;
      }

      // Check user doc
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        router.replace("/(auth)/profileSetup");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      let msg = "Login failed.";

      switch (error.code) {
        case "auth/user-not-found":
          msg = "No account found.";
          break;
        case "auth/wrong-password":
          msg = "Incorrect password.";
          break;
        case "auth/invalid-email":
          msg = "Invalid email.";
          break;
        default:
          msg = error.message;
      }

      triggerError(msg);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue mining</Text>

      {errorMsg ? (
        <Text
          style={[
            styles.error,
            shake && { transform: [{ translateX: -4 }] },
          ]}
        >
          {errorMsg}
        </Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { paddingRight: 45 }]}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
          <Ionicons
            name={passwordVisible ? "eye-off" : "eye"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <Pressable
        onPress={handleLogin}
        style={({ pressed }) => [
          styles.loginBtn,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </Pressable>

      <Link href="/(auth)/forgot" style={styles.forgot}>
        Forgot Password?
      </Link>

      <View style={styles.row}>
        <Text style={styles.text}>Don't have an account? </Text>
        <Link href="/(auth)/register" style={styles.link}>
          Register
        </Link>
      </View>
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 24,
    justifyContent: "center",
  },
  title: { fontSize: 32, fontWeight: "900", color: "#fff" },
  subtitle: { color: "#aaa", marginBottom: 20 },
  input: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  passwordContainer: { position: "relative" },
  eyeIcon: { position: "absolute", right: 12, top: "30%" },
  loginBtn: {
    backgroundColor: "#5b3deb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  error: { color: "#ff4f4f", marginBottom: 10 },
  forgot: { color: "#5b3deb", fontWeight: "bold", marginTop: 16, textAlign: "center" },
  row: { flexDirection: "row", marginTop: 15, justifyContent: "center" },
  text: { color: "#aaa" },
  link: { color: "#5b3deb", fontWeight: "bold" },
});


