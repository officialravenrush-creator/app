import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { Link } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async () => {
    setMsg("");
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Email is required");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg("Password reset link sent to your email");
    } catch (error: any) {
      setErrorMsg(error.message);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>

      {msg ? <Text style={styles.success}>{msg}</Text> : null}
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
      </TouchableOpacity>

      <View style={styles.row}>
        <Text style={styles.text}>Remember your password?</Text>
        <Link href="/auth/login" style={styles.link}> Login</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    color: "#aaa",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  btn: {
    backgroundColor: "#5b3deb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  text: {
    color: "#aaa",
  },
  link: {
    color: "#5b3deb",
    fontWeight: "bold",
  },
  success: {
    color: "#4caf50",
    marginBottom: 10,
  },
  error: {
    color: "#ff4f4f",
    marginBottom: 10,
  },
});
