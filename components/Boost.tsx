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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(0);
  const [cooldownMs, setCooldownMs] = useState(0);

  // mounted ref to avoid setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // if user is not authenticated when opening, close modal
  useEffect(() => {
    if (!auth.currentUser && visible) {
      onClose?.();
    }
    // only when visibility toggles
  }, [visible, onClose]);

  const usedToday = boost?.usedToday ?? 0;
  const remaining = Math.max(0, 3 - usedToday);

  // ----- DAILY RESET TIMER (robust parsing of lastReset) -----
  useEffect(() => {
    if (!boost?.lastReset) {
      setCooldownMs(0);
      return;
    }

    // normalize last timestamp into milliseconds (safe)
    let lastMs = 0;
    try {
      if ((boost.lastReset as any)?.toMillis && typeof (boost.lastReset as any).toMillis === "function") {
        // Firestore Timestamp
        lastMs = (boost.lastReset as Timestamp).toMillis();
      } else {
        // attempt numeric coercion
        const n = Number(boost.lastReset);
        lastMs = Number.isFinite(n) ? n : 0;
      }
    } catch (e) {
      lastMs = 0;
    }

    const DAY = 24 * 3600 * 1000;
    const diff = Date.now() - lastMs;
    const remainingMs = Math.max(0, DAY - diff);
    setCooldownMs(remainingMs);

    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      const nowRemain = Math.max(0, DAY - (Date.now() - lastMs));
      setCooldownMs(nowRemain);
    }, 1000 * 30); // update every 30s

    return () => clearInterval(iv);
  }, [boost?.lastReset]);

  // ----- FAKE AD COUNTDOWN -----
  useEffect(() => {
    if (!loading || timer <= 0) return;
    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [loading, timer]);

  // ----- CLAIM BOOST -----
  const handleWatchAd = async () => {
    // quick guards
    if (!auth.currentUser) {
      setMessage("You must be signed in to boost.");
      return;
    }
    if (loading) return;

    if (remaining <= 0) {
      setMessage("Daily boost limit reached (3/3).");
      return;
    }

    setLoading(true);
    setMessage("");
    setTimer(5); // simulated ad countdown

    // simulate ad playing for 5s — handle race conditions with mountedRef and auth
    const adTimeout = setTimeout(async () => {
      try {
        if (!mountedRef.current) return;
        const user = auth.currentUser;
        if (!user) {
          // user signed out during ad
          if (mountedRef.current) {
            setMessage("You were signed out. Please log in again.");
          }
          return;
        }

        const reward = await claimBoostReward(user.uid);

        if (!mountedRef.current) return;

        if (reward === 0) {
          setMessage("Boost limit reached for today.");
        } else {
          setMessage(`+${reward.toFixed(1)} VAD added to your balance!`);
        }
      } catch (err) {
        console.error("Boost error:", err);
        if (mountedRef.current) setMessage("Boost failed. Try again.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setTimer(0);
        }
      }
    }, 5000);

    // cleanup ad timeout if component unmounts or modal closes early
    const cleanup = () => {
      clearTimeout(adTimeout);
    };

    // if modal visibility changes or component unmounts, clear timeout
    // (we attach to mountedRef cleanup above; still call cleanup immediately if not mounted)
    if (!mountedRef.current) cleanup();
  };

  const progressLabel = useMemo(() => {
    if (remaining === 0) return `Next reset in ${timeLeft(cooldownMs)}`;
    return `${remaining} boost${remaining === 1 ? "" : "s"} remaining today`;
  }, [remaining, cooldownMs]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>⚡ Boost Earnings</Text>
          <Text style={styles.sub}>
            Watch a short ad to instantly boost your mining balance.
          </Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.5 VAD</Text>
            <Text style={styles.limit}>{progressLabel}</Text>
          </View>

          <View style={styles.usesRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                // apply margin to space dots without relying on `gap`
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
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.watchText, { marginLeft: 10 }]}>
                  Watching... ({timer}s)
                </Text>
              </View>
            ) : (
              <Text style={styles.watchText}>
                {remaining === 0 ? "No Boosts Left" : "Watch Ad"}
              </Text>
            )}
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
