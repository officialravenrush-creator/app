// NEW PREMIUM PROFILE SCREEN (tabs)/profile.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../firebase/firebaseConfig";
import { db } from "../../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function ProfileScreen() {
  const user = auth.currentUser;
  const uid = user?.uid;

  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState("");
  const [saveAllowed, setSaveAllowed] = useState(false);

  // strong animations
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  // LIVE REAL‑TIME FETCH — Firestore listeners
  useEffect(() => {
    if (!uid) return;

    const unsubProfile = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      const data: any = snap.data();
      setUsername(data.username || "");
      setReferralCode(data.referralCode || "");
      setReferredBy(data.referredBy || null);

      // If user has not entered referredBy, keep input visible
      if (!data.referredBy) {
        setSaveAllowed(true);
      } else {
        setSaveAllowed(false);
      }
    });

    const unsubMining = onSnapshot(doc(db, "miningData", uid), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data()?.balance || 0);
      }
    });

    // fetch referrals list
    const fetchReferredUsers = async () => {
      const q = query(
        collection(db, "users"),
        where("referredBy", "==", referralCode)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => list.push(doc.data()));
      setReferredUsers(list);
    };

    fetchReferredUsers();

    return () => {
      unsubProfile();
      unsubMining();
    };
  }, [uid, referralCode]);

  // validate referral code live
  const validateReferral = async (code: string) => {
    setRefInput(code);
    setRefError("");

    if (!code.trim()) return;
    if (code === referralCode) {
      setRefError("You cannot refer yourself.");
      return;
    }

    const q = query(
      collection(db, "users"),
      where("referralCode", "==", code.trim())
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setRefError("Invalid referral code");
    } else {
      setRefError("");
    }
  };

  const saveReferral = async () => {
    if (!uid) return;
    if (!refInput.trim()) return Alert.alert("Error", "Enter a referral code.");
    if (refError) return Alert.alert("Error", refError);

    try {
      await updateDoc(doc(db, "users", uid), {
        referredBy: refInput.trim(),
      });
      Alert.alert("Success", "Referral code saved!");
      setSaveAllowed(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Your Profile</Text>

        {/* STATIC AVATAR — premium style */}
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={72} color="#5865F2" />
        </View>

        {/* USERNAME */}
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{username}</Text>
        </View>

        {/* BALANCE */}
        <View style={styles.card}>
          <Text style={styles.label}>VAD Balance</Text>
          <Text style={styles.value}>{balance.toFixed(2)} VAD</Text>
        </View>

        {/* REFERRAL CODE DISPLAY + COPY */}
        <View style={styles.card}>
          <Text style={styles.label}>Your Referral Code</Text>
          <View style={styles.refRow}>
            <Text style={styles.refText}>{referralCode}</Text>
            <TouchableOpacity
              onPress={() => {
                navigator.clipboard.writeText(referralCode);
                Alert.alert("Copied!", "Referral code copied");
              }}
              style={styles.copyBtn}
            >
              <Text style={styles.copyText}>COPY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ENTER REFERRAL CODE IF NOT SET */}
        {referredBy ? (
          <View style={styles.card}>
            <Text style={styles.label}>Referred By</Text>
            <Text style={styles.value}>{referredBy}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Enter Referral Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Referral code"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={refInput}
              onChangeText={(t) => validateReferral(t)}
            />
            {refError.length > 0 && <Text style={styles.error}>{refError}</Text>}
            {saveAllowed && !refError && refInput.trim() ? (
              <TouchableOpacity onPress={saveReferral} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Save Code</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* REFERRALS LIST */}
        <View style={styles.card}>
          <Text style={styles.label}>Users You Referred</Text>
          {referredUsers.length === 0 ? (
            <Text style={styles.muted}>No referred users yet</Text>
          ) : (
            referredUsers.map((u, index) => (
              <View key={index} style={styles.refUser}>
                <Ionicons name="person-circle" size={22} color="#5865F2" />
                <Text style={styles.value}>{u.username}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const BLUE = "#5865F2";
const CARD = "#0b0b0b";
const DARK = "#000000";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    padding: 20,
  },
  pageTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  avatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: BLUE,
    borderRadius: 8,
  },
  copyText: {
    color: "#fff",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    marginTop: 6,
  },
  error: {
    color: "#ff5b5b",
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: BLUE,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  muted: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  refUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
});
