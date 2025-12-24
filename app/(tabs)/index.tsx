// app/(tabs)/index.tsx

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";

import { MotiText } from "moti";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMining } from "../../hooks/useMining";
import DailyClaim from "../../components/DailyClaim";
import Boost from "../../components/Boost";
import WatchEarn from "../../components/WatchEarn";
import AdBanner from "../../components/AdBanner";
import { supabase } from "../../supabase/client";

/* ============================================================
   CONSTANTS (UNCHANGED)
=============================================================== */
const DAY_SECONDS = 24 * 3600;
const DAILY_MAX = 4.8;
const HEADER_HEIGHT = 130;
const BANNER_HEIGHT = 90;

/* ============================================================
   ANIMATED BALANCE (UNCHANGED)
=============================================================== */
function AnimatedBalance({ animatedValue }: { animatedValue: Animated.Value }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) =>
      setVal(Number(value))
    );
    return () => animatedValue.removeListener(id);
  }, [animatedValue]);

  return (
    <MotiText
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 350 }}
      style={styles.balance}
    >
      {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
    </MotiText>
  );
}

/* ============================================================
   MAIN PAGE
=============================================================== */
export default function Page() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
    getLiveBalance,
  } = useMining();

  const miningActive = miningData?.miningActive ?? false;
  const PER_SECOND = DAILY_MAX / DAY_SECONDS;

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningDataRef = useRef(miningData);

  /* spin animation (RESTORED & SAFE) */
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  const [claimedBalance, setClaimedBalance] = useState<number | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionBalance, setSessionBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DAY_SECONDS);

  const [dailyOpen, setDailyOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const [news, setNews] = useState<any[]>([]);

  const progress = useMemo(
    () => (miningActive ? Math.min(1, sessionElapsed / DAY_SECONDS) : 0),
    [miningActive, sessionElapsed]
  );

  const canClaim = miningActive && sessionElapsed >= DAY_SECONDS;

  /* ============================================================
     EFFECTS (ALL LOGIC RESTORED)
=============================================================== */

  useEffect(() => {
    miningDataRef.current = miningData;
  }, [miningData]);

  /* balance sync from mining data */
  useEffect(() => {
    if (typeof miningData?.balance === "number") {
      setClaimedBalance(miningData.balance);
    }
  }, [miningData?.balance]);

  /* realtime balance sync (RESTORED) */
  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const live = await getLiveBalance();
        if (active && typeof live === "number") {
          setClaimedBalance(live);
        }
      } catch {}
    };

    sync();

    return () => {
      active = false;
    };
  }, [getLiveBalance]);

  /* animate balance */
  useEffect(() => {
    if (claimedBalance === null) return;
    Animated.timing(animatedBalance, {
      toValue: claimedBalance,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [claimedBalance]);

  /* session ticker (RESTORED) */
  useEffect(() => {
    const id = setInterval(() => {
      const md = miningDataRef.current;

      if (!md?.miningActive || !md?.lastStart) {
        setSessionElapsed(0);
        setSessionBalance(0);
        setTimeLeft(DAY_SECONDS);
        return;
      }

      const elapsed = Math.min(
        Math.floor((Date.now() - new Date(md.lastStart).getTime()) / 1000),
        DAY_SECONDS
      );

      setSessionElapsed(elapsed);
      setSessionBalance(elapsed * PER_SECOND);
      setTimeLeft(Math.max(0, DAY_SECONDS - elapsed));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* mining spin (ALWAYS MOUNTED) */
  useEffect(() => {
    if (!spinAnim.current) {
      spinAnim.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        })
      );
    }

    miningActive ? spinAnim.current.start() : spinAnim.current.stop();
  }, [miningActive]);

  /* ================= NEWS (REALTIME, RESTORED) ================= */
  useEffect(() => {
    let channel: any;

    const fetchNews = async () => {
      const { data } = await supabase
        .from("vad_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setNews(data);
    };

    fetchNews();

    channel = supabase
      .channel("vad-news")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vad_news" },
        fetchNews
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ============================================================
     ACTIONS (UNCHANGED)
=============================================================== */
  const handleStartStop = async () => {
    try {
      setIsStarting(true);
      miningActive ? await stop() : await start();
    } catch {
      Alert.alert("Error", "Unable to update mining state.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleClaim = async () => {
    if (!canClaim) return;
    try {
      setIsClaiming(true);
      const reward = await claim();
      Alert.alert("Mining Reward Claimed", `${reward.toFixed(4)} VAD`);
    } catch {
      Alert.alert("Error", "Claim failed.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const live = await getLiveBalance();
      if (typeof live === "number") {
        setClaimedBalance(live);
      }

      const { data } = await supabase
        .from("vad_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setNews(data);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  /* ============================================================
     RENDER
=============================================================== */
  return (
    <View style={styles.container}>
      {/* ================= FIXED HEADER ================= */}
      <LinearGradient
        colors={["#24164a", "#0b0614"]}
        style={[styles.fixedHeader, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <View style={styles.avatarCircle}>
              {userProfile?.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={22} color="#fff" />
              )}
            </View>
          </Pressable>

          <Text style={styles.headerTitle}>VAD Mining</Text>

          <Pressable onPress={handleRefresh}>
            <Ionicons name="refresh" size={22} color="#8B5CF6" />
          </Pressable>
        </View>

        <Text style={styles.headerSub}>
          Max {DAILY_MAX} VAD per 24 hours
        </Text>
      </LinearGradient>

      {/* ================= STATIC CONTENT ================= */}
      <View style={{ marginTop: HEADER_HEIGHT }}>
        {/* BALANCE */}
        <View style={styles.balanceWrap}>
          <Text style={styles.label}>Total Balance</Text>
          <AnimatedBalance animatedValue={animatedBalance} />
        </View>

        {/* PRIMARY ACTIONS */}
        <View style={styles.primaryActions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={handleStartStop}
            disabled={isStarting}
          >
            <Ionicons
              name={miningActive ? "pause" : "play"}
              size={40}
              color="#fff"
            />
            <Text style={styles.primaryText}>
              {miningActive ? "Stop" : "Mine"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryBtn,
              !canClaim && { opacity: 0.45 },
            ]}
            onPress={handleClaim}
            disabled={!canClaim || isClaiming}
          >
            <Ionicons name="gift" size={40} color="#fff" />
            <Text style={styles.primaryText}>Claim</Text>
          </Pressable>
        </View>

        {/* MINING SESSION */}
        <View style={styles.sessionCard}>
          <Animated.View
            style={{
              transform: [{ rotate: spin }],
              opacity: miningActive ? 1 : 0.35,
            }}
          >
            <Ionicons name="hardware-chip" size={36} color="#8B5CF6" />
          </Animated.View>

          <Text style={styles.sessionValue}>
            {miningActive
              ? `${sessionBalance.toFixed(4)} VAD`
              : "Start mining to begin"}
          </Text>

          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.progressMeta}>
            {canClaim
              ? "✅ Claim available"
              : `⏳ ${Math.floor(timeLeft / 3600)}h ${Math.floor(
                  (timeLeft % 3600) / 60
                )}m remaining`}
          </Text>
        </View>

        {/* FLOATING ACTIONS */}
        <View style={styles.floatingRow}>
          <MiniAction icon="rocket" label="Boost" onPress={() => setBoostOpen(true)} />
          <MiniAction icon="play-circle" label="Watch" onPress={() => setWatchOpen(true)} />
          <MiniAction icon="calendar" label="Daily" onPress={() => setDailyOpen(true)} />
        </View>

        {/* AD BANNER (TIGHT) */}
        <View style={styles.inlineAdWrap}>
          <AdBanner />
        </View>
      </View>

      {/* ================= SCROLLABLE NEWS ONLY ================= */}
      <ScrollView
        style={styles.newsScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.newsCard}>
          <Text style={styles.newsTitle}>Latest News</Text>

          {news.map((n) => (
            <View key={n.id} style={styles.newsBlock}>
              {n.image_url && (
                <Image source={{ uri: n.image_url }} style={styles.newsImage} />
              )}
              <Text style={styles.newsHeadline}>{n.title}</Text>
              <Text style={styles.newsBody}>{n.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {dailyOpen && <DailyClaim visible onClose={() => setDailyOpen(false)} />}
      {boostOpen && <Boost visible onClose={() => setBoostOpen(false)} />}
      {watchOpen && <WatchEarn visible onClose={() => setWatchOpen(false)} />}
    </View>
  );
}

/* ============================================================
   MINI ACTION
=============================================================== */
const MiniAction = ({ icon, label, onPress }: any) => (
  <Pressable style={styles.miniBtn} onPress={onPress}>
    <MaterialIcons name={icon} size={22} color="#8B5CF6" />
    <Text style={styles.miniLabel}>{label}</Text>
  </Pressable>
);

/* ============================================================
   STYLES
=============================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060B1A" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  headerSub: { color: "#bfc7df", marginTop: 6 },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139,92,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },

  balanceWrap: { paddingHorizontal: 22, paddingTop: 20 },
  label: { color: "#9FA8C7", marginBottom: 6 },
  balance: { fontSize: 42, color: "#fff", fontWeight: "900" },
  vadText: { fontSize: 18, color: "#8B5CF6" },

  primaryActions: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
    height: 74,
    borderRadius: 20,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900", marginTop: 4 },

  sessionCard: {
    margin: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  sessionValue: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "900",
    marginVertical: 10,
  },
  progressBg: {
    height: 10,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: "#8B5CF6" },
  progressMeta: { marginTop: 10, color: "#9FA8C7", fontSize: 12 },

  floatingRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 22,
    marginBottom: 10,
  },
  miniBtn: {
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  miniLabel: { color: "#9FA8C7", fontSize: 11, marginTop: 4 },

  inlineAdWrap: {
    marginHorizontal: 22,
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
  },

  newsScroll: { flex: 1 },
  newsCard: {
    marginHorizontal: 22,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 18,
  },
  newsTitle: { color: "#fff", fontWeight: "900", marginBottom: 12 },
  newsBlock: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  newsImage: {
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
  },
  newsHeadline: { color: "#8B5CF6", fontWeight: "800" },
  newsBody: { color: "#fff", fontSize: 13 },
});
