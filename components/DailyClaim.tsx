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

import { claimDailyReward } from "../firebase/user";
import { useMining } from "../hooks/useMining";

/* -----------------------------------------------
   🔥 LAZY FIREBASE IMPORTS — FIXED PATH
------------------------------------------------ */
const getAuth = async () =>
  (await import("../firebase/firebaseConfig")).getAuthInstance();

/* -----------------------------------------------
   🔥 LAZY GOOGLE ADS IMPORT (SAFE FOR EXPO GO)
------------------------------------------------ */
const loadInterstitialHook = async () => {
  const mod = await import("react-native-google-mobile-ads");
  return mod.useInterstitialAd;
};

type DailyClaimProps = {
  visible: boolean;
  onClose?: () => void;
};

const STREAK_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 2.0];

function fmtTimeLeft(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DailyClaim({ visible, onClose }: DailyClaimProps) {
  const { dailyClaim } = useMining();

  const [uid, setUid] = useState<string | null>(null);

  /* -------------------------------------------------
     🔥 Correct Auth listener (uses RN instance)
  -------------------------------------------------- */
  useEffect(() => {
    let unsub: any;

    (async () => {
      const auth = await getAuth();
      unsub = auth.onAuthStateChanged((u: any) => {
        setUid(u?.uid ?? null);
      });
    })();

    return () => unsub?.();
  }, []);

  /* -------------------------------------------------
     UI State
  -------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);

  /* -------------------------------------------------
     Prevent setState after unmount
  -------------------------------------------------- */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* -------------------------------------------------
     Auto-close if user logged out
  -------------------------------------------------- */
  useEffect(() => {
    if (!uid && visible) onClose?.();
  }, [uid, visible, onClose]);

/* -------------------------------------------------
   Interstitial Ad Setup (SAFE LAZY IMPORT)
-------------------------------------------------- */
const adUnitId = __DEV__
  ? "ca-app-pub-3940256099942544/1033173712"
  : "ca-app-pub-4533962949749202/2761859275";

const [adState, setAdState] = useState({
  isLoaded: false,
  isClosed: false,
  load: () => {},
  show: () => {},
});

/* Load hook lazily */
useEffect(() => {
  let mounted = true;

  (async () => {
    const hook = await loadInterstitialHook();
    const ads = hook(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    if (mounted) setAdState(ads);
  })();

  return () => {
    mounted = false;
  };
}, [adUnitId]);


  const { isLoaded, isClosed, load, show } = adState;

  useEffect(() => {
    if (visible && isLoaded === false) load?.();
  }, [visible, isLoaded, load]);

  /* -------------------------------------------------
     Cooldown Timer
  -------------------------------------------------- */
  useEffect(() => {
    if (!dailyClaim?.lastClaim) {
      setCooldownMs(0);
      return;
    }

    let lastMs = 0;
    try {
      if ((dailyClaim.lastClaim as any)?.toMillis) {
        lastMs = dailyClaim.lastClaim.toMillis();
      } else {
        lastMs = Number(dailyClaim.lastClaim) || 0;
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

  /* -------------------------------------------------
     Reward AFTER ad closes
  -------------------------------------------------- */
  const runReward = async () => {
    try {
      if (!uid || !mountedRef.current) return;

      const reward = await claimDailyReward(uid);

      if (!mountedRef.current) return;

      if (reward === 0) {
        setMessage("Already claimed for today.");
      } else {
        setMessage(`+${reward.toFixed(1)} VAD added to your balance!`);
      }
    } catch {
      if (mountedRef.current) setMessage("Claim failed. Try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isClosed && loading) {
      runReward();
    }
  }, [isClosed, loading]);

  /* -------------------------------------------------
     Claim Handler
  -------------------------------------------------- */
  const handleClaim = () => {
    if (!uid) {
      setMessage("Please log in to claim.");
      return;
    }

    if (cooldownMs > 0 || loading) return;

    setMessage("");
    setLoading(true);

    if (!isLoaded) {
      load?.();
      return;
    }

    show?.();
  };

  const streak = dailyClaim?.streak ?? 0;

  const progressLabel = useMemo(
    () => (cooldownMs > 0 ? fmtTimeLeft(cooldownMs) : "Available now"),
    [cooldownMs]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🔥 Daily Check-In</Text>
          <Text style={styles.sub}>Claim every 24 hours. Higher streak = more VAD.</Text>

          {/* Days Grid */}
          <View style={styles.grid}>
            {STREAK_REWARDS.map((r, i) => {
              const day = i + 1;
              const claimed = day <= streak;

              return (
                <View
                  key={i}
                  style={[
                    styles.dayBox,
                    claimed && styles.dayClaimed,
                    day % 3 !== 0 && { marginRight: 12 },
                    day > 3 && { marginTop: 12 },
                  ]}
                >
                  <Text style={styles.dayLabel}>Day {day}</Text>
                  <Text
                    style={[
                      styles.dayReward,
                      claimed && styles.dayRewardClaimed,
                    ]}
                  >
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

          {/* Claim Button */}
          <Pressable
            onPress={handleClaim}
            disabled={loading || cooldownMs > 0}
            style={[styles.claimBtn, (loading || cooldownMs > 0) && { opacity: 0.6 }]}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={[styles.claimText, { marginLeft: 10 }]}>Loading ad...</Text>
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

/* -------------------- STYLES -------------------- */
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
  },
  message: {
    marginTop: 14,
    color: "#34D399",
    textAlign: "center",
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  closeText: {
    color: "#9FA8C7",
    fontWeight: "700",
  },
});
