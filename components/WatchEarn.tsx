// components/WatchEarn.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../supabase/client";
import { showInterstitial } from "./InterstitialAd";
import { claimWatchEarnReward } from "../services/user";

const COOLDOWN_SECONDS = 180; // 3 minutes

type Props = {
  visible?: boolean;
  onClose?: () => void;
};

export default function WatchEarn({ visible = false, onClose }: Props) {
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const timerRef = useRef<number | null>(null);


  /* -------------------------------------------------
     LIFECYCLE
  -------------------------------------------------- */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* -------------------------------------------------
     AUTH
  -------------------------------------------------- */
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!mountedRef.current) return;
      setUid(data?.user?.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mountedRef.current) return;
      setUid(session?.user?.id ?? null);
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------
     STATE
  -------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const [cooldownLeft, setCooldownLeft] = useState(0);

  const [stats, setStats] = useState({
    totalWatched: 0,
    totalEarned: 0,
    lastWatchAt: null as string | null,
  });

  /* -------------------------------------------------
     COOLDOWN TIMER
  -------------------------------------------------- */
  const startCooldownTimer = (seconds: number) => {
    setCooldownLeft(seconds);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* -------------------------------------------------
     LOAD STATS + REALTIME
  -------------------------------------------------- */
  useEffect(() => {
    if (!uid) return;

    let active = true;

    const loadStats = async () => {
      const { data } = await supabase
        .from("watch_earn_data")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (!data || !active) return;

      setStats({
        totalWatched: data.total_watched ?? 0,
        totalEarned: data.total_earned ?? 0,
        lastWatchAt: data.last_watch_at,
      });

      // ⏱️ Restore cooldown if exists
      if (data.last_watch_at) {
        const last = new Date(data.last_watch_at).getTime();
        const now = Date.now();
        const diff = Math.floor((now - last) / 1000);

        if (diff < COOLDOWN_SECONDS) {
          startCooldownTimer(COOLDOWN_SECONDS - diff);
        }
      }
    };

    loadStats();

    const channel = supabase
      .channel(`watch_earn_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watch_earn_data",
          filter: `user_id=eq.${uid}`,
        },
        loadStats
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  /* -------------------------------------------------
     WATCH HANDLER (UNCHANGED LOGIC)
  -------------------------------------------------- */
  const handleWatch = useCallback(async () => {
    if (!uid || loadingRef.current || cooldownLeft > 0) return;

    setLoading(true);
    loadingRef.current = true;
    setCompleted(false);
    setMessage("");

    try {
      // 🔥 Persist cooldown immediately
      const now = new Date().toISOString();

      await supabase
        .from("watch_earn_data")
        .update({ last_watch_at: now })
        .eq("user_id", uid);

      startCooldownTimer(COOLDOWN_SECONDS);

      // 🔥 Ad (non-blocking)
      await showInterstitial();

      // ✅ Reward logic untouched
      const reward = await claimWatchEarnReward(uid);

      if (reward <= 0) {
        setMessage("Reward not available right now.");
        return;
      }

      setStats((prev) => ({
        ...prev,
        totalWatched: prev.totalWatched + 1,
        totalEarned: prev.totalEarned + reward,
      }));

      setCompleted(true);
      setMessage(`+${reward.toFixed(2)} VAD credited!`);
    } catch (err) {
      console.log("Watch & Earn error:", err);
      setMessage("Something went wrong. Try again.");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [uid, cooldownLeft]);

  /* -------------------------------------------------
     HELPERS
  -------------------------------------------------- */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const { totalWatched, totalEarned } = stats;

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Earn More</Text>
          <Text style={styles.sub}>Optional task for instant VAD</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.01 VAD</Text>
            <Text style={styles.limit}>Per task</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalWatched}</Text>
              <Text style={styles.statLabel}>Ads Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalEarned.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>VAD Earned</Text>
            </View>
          </View>

          {!completed ? (
            <Pressable
              onPress={handleWatch}
              disabled={loading || cooldownLeft > 0}
              style={[
                styles.watchBtn,
                (loading || cooldownLeft > 0) && { opacity: 0.6 },
              ]}
            >
              {loading ? (
                <ActivityIndicator />
              ) : cooldownLeft > 0 ? (
                <Text style={styles.watchText}>
                  Wait {formatTime(cooldownLeft)}
                </Text>
              ) : (
                <Text style={styles.watchText}>Earn more</Text>
              )}
            </Pressable>
          ) : (
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

/* -------------------------------------------------
   STYLES (UNCHANGED)
-------------------------------------------------- */
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
  },
  reward: {
    color: "#FACC15",
    fontSize: 30,
    fontWeight: "900",
  },
  limit: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  statsRow: {
    marginTop: 18,
    flexDirection: "row",
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
  },
  skipBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  skipText: {
    color: "#9FA8C7",
  },
});
