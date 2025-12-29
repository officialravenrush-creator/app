// app/auth/forgot.tsx

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";

import { supabase } from "../../supabase/client";
import { Link } from "expo-router";

export default function ForgotPassword() {
  return <ForgotPasswordScreen />;
}

function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Animations (UNCHANGED)
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ---------------- LOGIC (UNCHANGED) ---------------- */

  const sendEmailCode = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!email.trim()) return setErrorMsg("Email is required");

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://your-app-domain.com/auth/reset",
      });
      if (error) throw error;
      setSuccessMsg("Reset link sent to your email");
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!code.trim()) return setErrorMsg("Code is required");
    setSuccessMsg("Code verified");
    setStep(3);
  };

  const resetPasswordNow = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!newPass.trim()) return setErrorMsg("Password cannot be empty");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPass,
      });
      if (error) throw error;
      Alert.alert("Success", "Password updated successfully");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.root}
    >
      <Animated.View
        style={[
          styles.card,
          { opacity: fade, transform: [{ scale }] },
        ]}
      >
        {/* LOGO */}
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />

        {/* TITLE */}
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 1 && "Receive a reset link"}
          {step === 2 && "Verify your email"}
          {step === 3 && "Create a new password"}
        </Text>

        {/* STATUS */}
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

        {/* INPUTS */}
        {step === 1 && (
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#777"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        )}

        {step === 2 && (
          <TextInput
            style={styles.input}
            placeholder="Verification code"
            placeholderTextColor="#777"
            value={code}
            onChangeText={setCode}
          />
        )}

        {step === 3 && (
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#777"
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
          />
        )}

        {/* ACTION */}
        <TouchableOpacity
          style={styles.button}
          disabled={loading}
          onPress={
            step === 1 ? sendEmailCode : step === 2 ? verifyCode : resetPasswordNow
          }
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>
              {step === 1 && "Send Email"}
              {step === 2 && "Verify"}
              {step === 3 && "Reset Password"}
            </Text>
          )}
        </TouchableOpacity>

        {/* BACK */}
        <View style={styles.backRow}>
          <Text style={styles.backText}>Back to</Text>
          <Link href="/(auth)/login" style={styles.backLink}>
            Login
          </Link>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  logo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 14,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },

  input: {
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: "#fff",
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  button: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },

  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 15,
  },

  backRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },

  backText: {
    color: "#666",
    marginRight: 4,
  },

  backLink: {
    color: "#fff",
    fontWeight: "700",
  },

  error: {
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 10,
  },

  success: {
    color: "#4ade80",
    textAlign: "center",
    marginBottom: 10,
  },
});
