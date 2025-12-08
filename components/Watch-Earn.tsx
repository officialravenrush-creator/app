// app/components/Watch-earn.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";
import { claimWatchEarnReward } from "../firebase/user";
import { doc, onSnapshot } from "firebase/firestore";
import { showRewardedAd } from "../components/RewardedAd";

export default function WatchEarn({ visible = false, onClose }: any) {
  const user = auth?.currentUser ?? null;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({
    totalWatched: 0,
    totalEarned: 0,
  });

  // 🚫 Close if logged out
  useEffect(() => {
    if (visible && !user) {
      onClose?.();
    }
  }, [visible, user]);

  // 🔥 Firebase stats
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() ?? {};
        const watch = data.watchEarn ?? {};

        setStats({
          totalWatched: watch.totalWatched ?? 0,
          totalEarned: watch.totalEarned ?? 0,
        });
      },
      () => {}
    );

    return () => unsub();
  }, [user]);

  // 🎥 Real rewarded ad flow
  const handleWatch = useCallback(async () => {
    if (!user || loading) return;

    try {
      setLoading(true);
      setCompleted(false);
      setMessage("");

      // Show rewarded ad
      await showRewardedAd();

      // ✅ After ad is completed
      const reward = await claimWatchEarnReward(user.uid);

      const amt = typeof reward === "number" ? reward : 0;
      setMessage(`+${amt.toFixed(2)} VAD credited!`);
      setCompleted(true);
    } catch (e) {
      setMessage("Ad not completed or failed.");
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  const closeIfIdle = useCallback(() => {
    if (!loading) onClose?.();
  }, [loading, onClose]);

  const totalEarned = stats.totalEarned ?? 0;
  const totalWatched = stats.totalWatched ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeIfIdle}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🎥 Watch & Earn</Text>
          <Text style={styles.sub}>Optional rewarded ads for instant VAD</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.25 VAD</Text>
            <Text style={styles.limit}>Per completed ad</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalWatched}</Text>
              <Text style={styles.statLabel}>Ads Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalEarned.toFixed(2)}</Text>
              <Text style={styles.statLabel}>VAD Earned</Text>
            </View>
          </View>

          {!completed && (
            <Pressable
              onPress={handleWatch}
              disabled={loading}
              style={[styles.watchBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <View style={{ flexDirection: "row" }}>
                  <ActivityIndicator />
                  <Text style={[styles.watchText, { marginLeft: 10 }]}>
                    Loading ad...
                  </Text>
                </View>
              ) : (
                <Text style={styles.watchText}>Watch Ad</Text>
              )}
            </Pressable>
          )}

          {completed && (
            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {!loading && !completed && (
            <Pressable onPress={onClose} style={styles.skipBtn}>
              <Text style={styles.skipText}>Close</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// styles stay unchanged


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,15,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#0B1020",
    width: "92%",
    borderRadius: 26,
    padding: 26,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.45)",
   shadowColor: "#FACC15",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  sub: {
    color: "#9FA8C7",
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  rewardBox: {
    marginTop: 20,
    backgroundColor: "rgba(250,204,21,0.18)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.3)",
  },
  reward: {
    color: "#FACC15",
    fontSize: 30,
    fontWeight: "900",
  },
  limit: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: "#131933",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    color: "#FACC15",
    fontWeight: "900",
    fontSize: 18,
  },
  statLabel: {
    color: "#9FA8C7",
    fontSize: 11,
    marginTop: 2,
  },
  watchBtn: {
    marginTop: 22,
    backgroundColor: "#FACC15",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  watchText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },
  doneBtn: {
    marginTop: 22,
    backgroundColor: "#34D399",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  doneText: {
    color: "#000",
    fontWeight: "900",
  },
  message: {
    marginTop: 16,
    color: "#FACC15",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },
  skipBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  skipText: {
    color: "#9FA8C7",
    fontWeight: "600",
  },
});
