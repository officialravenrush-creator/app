// app/components/Boost.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useInterstitialAd } from "react-native-google-mobile-ads";
import { auth } from "../firebase/firebaseConfig";
import { claimBoostReward } from "../firebase/user";
import { useMining } from "../hooks/useMining";
import { Timestamp } from "firebase/firestore";

type BoostProps = {
  visible: boolean;
  onClose?: () => void;
};

function timeLeft(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Boost({ visible, onClose }: BoostProps) {
  const { boost } = useMining();

  // ✅ Freeze boost to avoid re-hook crashes
  const boostSafe = useMemo(() => boost ?? null, [boost]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);

  const mountedRef = useRef(true);

  // ✅ SAFE Ad Hook Placement (TOP LEVEL ALWAYS)
  const adUnitId = __DEV__
    ? "ca-app-pub-3940256099942544/1033173712"
    : "YOUR_REAL_AD_ID";

  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // cleanup guard
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser && visible) onClose?.();
  }, [visible, onClose]);

  const usedToday = boostSafe?.usedToday ?? 0;
  const remaining = Math.max(0, 3 - usedToday);

  // ✅ Daily timer
  useEffect(() => {
    if (!boostSafe?.lastReset) {
      setCooldownMs(0);
      return;
    }

    let lastMs = 0;
    try {
      if ((boostSafe.lastReset as any)?.toMillis) {
        lastMs = (boostSafe.lastReset as Timestamp).toMillis();
      } else {
        const n = Number(boostSafe.lastReset);
        lastMs = Number.isFinite(n) ? n : 0;
      }
    } catch {
      lastMs = 0;
    }

    const DAY = 86400000;
    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      const remain = Math.max(0, DAY - (Date.now() - lastMs));
      setCooldownMs(remain);
    }, 30000);

    return () => clearInterval(iv);
  }, [boostSafe?.lastReset]);

  // ✅ Run reward only when ad closes
  const runReward = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !mountedRef.current) return;

      const reward = await claimBoostReward(user.uid);

      if (!mountedRef.current) return;

      if (reward === 0) {
        setMessage("Boost limit reached.");
      } else {
        setMessage(`+${reward.toFixed(1)} VAD added!`);
      }
    } catch (err) {
      console.error("Boost error:", err);
      if (mountedRef.current) setMessage("Boost failed.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ✅ Trigger reward only after ad is closed
  useEffect(() => {
    if (isClosed && loading) {
      runReward();
    }
  }, [isClosed, loading]);

  const handleWatchAd = async () => {
    if (!auth.currentUser) {
      setMessage("Login required.");
      return;
    }

    if (remaining <= 0 || loading) return;

    setLoading(true);
    setMessage("");

    if (!isLoaded) {
      load();
      return;
    }

    show();
  };

  const progressLabel = useMemo(() => {
    if (remaining === 0) return `Next reset in ${timeLeft(cooldownMs)}`;
    return `${remaining} boosts remaining today`;
  }, [remaining, cooldownMs]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>⚡ Boost Earnings</Text>

          <Text style={styles.sub}>
            Watch a short ad to boost your balance.
          </Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.5 VAD</Text>
            <Text style={styles.limit}>{progressLabel}</Text>
          </View>

          <View style={styles.usesRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.useDot,
                  i < usedToday && styles.useDotActive,
                  i < 2 ? { marginRight: 10 } : undefined,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleWatchAd}
            disabled={loading || remaining === 0}
            style={[
              styles.watchBtn,
              (loading || remaining === 0) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.watchText}>
              {loading ? "Loading ad..." : remaining === 0 ? "No Boosts Left" : "Watch Ad"}
            </Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,15,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "92%",
    borderRadius: 26,
    padding: 26,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.5)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 15,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  sub: {
    color: "#9FA8C7",
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  rewardBox: {
    marginTop: 22,
    backgroundColor: "rgba(139,92,246,0.18)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },

  reward: {
    color: "#A78BFA",
    fontSize: 30,
    fontWeight: "900",
  },

  limit: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 6,
  },

  usesRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  useDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#2C2F48",
    borderWidth: 1,
    borderColor: "#3B3F63",
  },

  useDotActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  watchBtn: {
    marginTop: 22,
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  watchText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  message: {
    marginTop: 16,
    color: "#34D399",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },

  closeBtn: {
    marginTop: 24,
    alignItems: "center",
  },

  closeText: {
    color: "#A1A7C6",
    fontSize: 13,
    fontWeight: "600",
  },
});
