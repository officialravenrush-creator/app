// components/DailyClaim.tsx
// components/DailyClaim.tsx
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useEffect, useRef, useState, useMemo } from "react";
import { auth } from "../firebase/firebaseConfig";
import { claimDailyReward } from "../firebase/user";
import { useMining } from "../hooks/useMining";
import { Timestamp } from "firebase/firestore";
import { useInterstitialAd } from "react-native-google-mobile-ads";

const STREAK_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 2.0];

function fmtTimeLeft(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DailyClaim({ visible, onClose }: any) {
  const { dailyClaim } = useMining();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);

  // ✅ SAFE AD HOOK PLACEMENT (top-level only)
  const adUnitId = __DEV__
    ? "ca-app-pub-3940256099942544/1033173712"
    : "ca-app-pub-4533962949749202/2761859275";

  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // prevent setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // close if user signed out
  useEffect(() => {
    if (!auth.currentUser && visible) {
      onClose?.();
    }
  }, [visible, onClose]);

  // cooldown timer
  useEffect(() => {
    if (!dailyClaim?.lastClaim) {
      setCooldownMs(0);
      return;
    }

    let lastMs = 0;
    try {
      if ((dailyClaim.lastClaim as any)?.toMillis) {
        lastMs = (dailyClaim.lastClaim as Timestamp).toMillis();
      } else {
        const n = Number(dailyClaim.lastClaim);
        lastMs = Number.isFinite(n) ? n : 0;
      }
    } catch {
      lastMs = 0;
    }

    const DAY = 24 * 3600 * 1000;

    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      const remain = Math.max(0, DAY - (Date.now() - lastMs));
      setCooldownMs(remain);
    }, 30_000);

    return () => clearInterval(iv);
  }, [dailyClaim?.lastClaim]);

  // ✅ run reward ONLY after ad closes
  const runReward = async () => {
    try {
      const u = auth.currentUser;
      if (!u || !mountedRef.current) return;

      const reward = await claimDailyReward(u.uid);

      if (!mountedRef.current) return;

      if (reward === 0) {
        setMessage("Already claimed for today.");
      } else {
        setMessage(`+${reward.toFixed(1)} VAD added to your balance!`);
      }
    } catch (err) {
      console.error("claimDailyReward error:", err);
      if (mountedRef.current) setMessage("Claim failed. Try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ✅ trigger reward when ad closes
  useEffect(() => {
    if (isClosed && loading) {
      runReward();
    }
  }, [isClosed, loading]);

  const handleClaim = () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage("Please log in to claim.");
      return;
    }

    if (cooldownMs > 0 || loading) return;

    setMessage("");
    setLoading(true);

    if (!isLoaded) {
      load();
      return;
    }

    show();
  };

  const streak = dailyClaim?.streak ?? 0;

  const progressLabel = useMemo(() => {
    return cooldownMs > 0 ? fmtTimeLeft(cooldownMs) : "Available now";
  }, [cooldownMs]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🔥 Daily Check-In</Text>
          <Text style={styles.sub}>
            Claim every 24 hours. Keep streaks to increase rewards.
          </Text>

          <View style={styles.grid}>
            {STREAK_REWARDS.map((r, i) => {
              const day = i + 1;
              const claimed = day <= streak;
              return (
                <View
                  key={day}
                  style={[
                    styles.dayBox,
                    claimed && styles.dayClaimed,
                    (day % 3 !== 0) && { marginRight: 12 },
                    day > 3 && { marginTop: 12 },
                  ]}
                >
                  <Text style={styles.dayLabel}>Day {day}</Text>
                  <Text style={[styles.dayReward, claimed && styles.dayRewardClaimed]}>
                    +{r} VAD
                  </Text>
                  {claimed && <Text style={styles.check}>✔</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Streak: {streak} day(s)</Text>
            <Text style={styles.metaText}>Next: {progressLabel}</Text>
          </View>

          <Pressable
            onPress={handleClaim}
            disabled={loading || cooldownMs > 0}
            style={[
              styles.claimBtn,
              (loading || cooldownMs > 0) && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color="#000" />
                <Text style={[styles.claimText, { marginLeft: 10 }]}>
                  Loading ad...
                </Text>
              </View>
            ) : (
              <Text style={styles.claimText}>
                {cooldownMs > 0 ? "Already Claimed" : "Claim Today"}
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

// styles stay the same

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,8,20,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "92%",
    borderRadius: 28,
    padding: 22,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.45)",
    shadowColor: "#34D399",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  sub: {
    color: "#A5B4FC",
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },

 grid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},


  dayBox: {
    width: "30%",
    backgroundColor: "rgba(52,211,153,0.08)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.18)",
  },

  dayClaimed: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "#22C55E",
  },

  dayLabel: {
    color: "#9FA8C7",
    fontSize: 11,
    marginBottom: 4,
  },

 dayReward: {
    color: "#34D399",
    fontWeight: "900",
    fontSize: 13,
  },
  dayRewardClaimed: {
    color: "#22C55E",
  },

  
  claimedText: {
    color: "#16A34A",
  },

  check: {
    color: "#22C55E",
    fontWeight: "900",
    marginTop: 6,
  },

  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  metaText: {
    color: "#9FA8C7",
    fontSize: 13,
  },

  claimBtn: {
    marginTop: 18,
    backgroundColor: "#34D399",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  claimText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },

  message: {
    marginTop: 12,
    color: "#22C55E",
    textAlign: "center",
    fontWeight: "800",
  },

  closeBtn: {
    marginTop: 16,
    alignItems: "center",
  },

  closeText: {
    color: "#9FA8C7",
    fontSize: 13,
    fontWeight: "600",
  },
});
