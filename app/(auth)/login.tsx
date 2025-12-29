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
  Image,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase/client";

/* ---------- Expo Router Wrapper ---------- */
export default function Login() {
  return <LoginScreen />;
}

/* ---------- Screen ---------- */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Login failed.");

      // 🔒 routing handled elsewhere – unchanged
    } catch (error: any) {
      const msg = (error?.message || "").toLowerCase();

      if (msg.includes("invalid")) triggerError("Incorrect email or password.");
      else if (msg.includes("not found")) triggerError("No account found.");
      else if (msg.includes("email")) triggerError("Invalid email.");
      else triggerError(error?.message ?? "Login failed.");
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
        <Text style={styles.brand}>VAD</Text>
        <Text style={styles.tagline}>Virtual Asset Depot</Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to your marketplace</Text>

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
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { paddingRight: 46 }]}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.eye}
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? "eye-off" : "eye"}
              size={20}
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
      </View>

      {/* FOOTER */}
      <View style={styles.row}>
        <Text style={styles.text}>Don’t have an account? </Text>
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
    backgroundColor: "#000",
    padding: 24,
    justifyContent: "center",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 8,
  },
  brand: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tagline: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 2,
  },

  card: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    marginBottom: 18,
    marginTop: 4,
  },

  input: {
    backgroundColor: "#151515",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  passwordWrap: { position: "relative" },
  eye: { position: "absolute", right: 12, top: "30%" },

  loginBtn: {
    backgroundColor: "#5865F2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  loginText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },

  error: {
    color: "#ff4f4f",
    marginBottom: 10,
    fontSize: 13,
  },

  forgot: {
    color: "#5865F2",
    fontWeight: "800",
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  text: { color: "rgba(255,255,255,0.6)" },
  link: { color: "#5865F2", fontWeight: "900" },
});
