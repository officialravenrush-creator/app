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
  Image,
} from "react-native";

import { MotiText } from "moti";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMining } from "../../hooks/useMining";
import DailyClaim from "../../components/DailyClaim";
import Boost from "../../components/Boost";
import WatchEarn from "../../components/WatchEarn";
import News from "../../components/News";
import AdBanner from "../../components/AdBanner";

/* ============================================================
   CONSTANTS
=============================================================== */
const DAY_SECONDS = 24 * 3600;
const DAILY_MAX = 4.8;

const HEADER_MAX = 140;
const HEADER_MIN = 84;



/* ============================================================
   HELPERS
=============================================================== */
const getTier = (balance: number) => {
  if (balance >= 50) return { label: "Gold", color: "#FACC15" };
  if (balance >= 15) return { label: "Silver", color: "#CBD5E1" };
  return { label: "Bronze", color: "#F97316" };
};

/* ============================================================
   ANIMATED BALANCE
=============================================================== */
function AnimatedBalance({ animatedValue }: { animatedValue: Animated.Value }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) =>
      setVal(Number(value))
    );
    return () => animatedValue.removeListener(id);
  }, []);

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
   MINI ACTION
=============================================================== */
const MiniAction = ({ icon, label, onPress }: any) => (
  <Pressable style={styles.miniBtn} onPress={onPress}>
    <MaterialIcons name={icon} size={22} color="#8B5CF6" />
    <Text style={styles.miniLabel}>{label}</Text>
  </Pressable>
);

/* ============================================================
   MAIN PAGE
=============================================================== */
export default function Page() {
  const insets = useSafeAreaInsets();
  const {
    miningData,
    isLoading,
    start,
    stop,
    claim,
  } = useMining();

  const miningActive = miningData?.miningActive ?? false;
  const PER_SECOND = DAILY_MAX / DAY_SECONDS;

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningDataRef = useRef(miningData);

  const spinValue = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(0)).current;

  const [claimedBalance, setClaimedBalance] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionBalance, setSessionBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DAY_SECONDS);

  const [dailyOpen, setDailyOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);

  const progress = useMemo(
    () => (miningActive ? Math.min(1, sessionElapsed / DAY_SECONDS) : 0),
    [miningActive, sessionElapsed]
  );

  const canClaim = miningActive && sessionElapsed >= DAY_SECONDS;
  const tier = getTier(miningData?.balance ?? 0);

  /* ============================================================
     EFFECTS
=============================================================== */
  useEffect(() => {
    miningDataRef.current = miningData;
  }, [miningData]);

  useEffect(() => {
    if (typeof miningData?.balance === "number") {
      setClaimedBalance(miningData.balance);
    }
  }, [miningData?.balance]);

  useEffect(() => {
    if (claimedBalance === null) return;
    Animated.timing(animatedBalance, {
      toValue: claimedBalance,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [claimedBalance]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 4200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

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
      setTimeLeft(DAY_SECONDS - elapsed);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX - HEADER_MIN],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: "clamp",
  });

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  /* ============================================================
     RENDER
=============================================================== */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Animated.View
        style={[
          styles.fixedHeader,
          { height: headerHeight, paddingTop: insets.top + 12 },
        ]}
      >
        <LinearGradient
          colors={["#24164a", "#0b0614"]}
          style={StyleSheet.absoluteFill}
        />

        {/* SHIMMER */}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            transform: [
              {
                translateX: shimmerX.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 300],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.08)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.headerRow}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
          />

   <View>
  <Text style={styles.headerTitle}>VAD DEPOT</Text>

  <Text style={styles.headerTagline}>
    CONTRIBUTE • SECURE • EARN
  </Text>

  <Text style={styles.headerEarning}>
    Earn up to <Text style={styles.headerEarningStrong}>4.8 VAD</Text> / 24hrs
  </Text>

  <Text style={styles.headerIntro}>
    Proof-of-Stake Network
  </Text>
</View>



          <View style={[styles.tierBadge, { borderColor: tier.color }]}>
            <Text style={[styles.tierText, { color: tier.color }]}>
              {tier.label}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* CONTENT */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_MAX }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* BALANCE */}
        <View style={styles.balanceWrap}>
          <Text style={styles.label}>Total Balance</Text>
          <AnimatedBalance animatedValue={animatedBalance} />
        </View>

        {/* PRIMARY ACTIONS */}
        <View style={styles.primaryActions}>
          <Pressable style={styles.primaryBtn} onPress={() => miningActive ? stop() : start()}>
            <Ionicons name={miningActive ? "pause" : "play"} size={40} color="#fff" />
            <Text style={styles.primaryText}>{miningActive ? "Stop" : "Mine"}</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, !canClaim && { opacity: 0.45 }]}
            onPress={claim}
            disabled={!canClaim}
          >
            <Ionicons name="gift" size={40} color="#fff" />
            <Text style={styles.primaryText}>Claim</Text>
          </Pressable>
        </View>

        {/* SESSION CARD */}
        <View style={styles.sessionCard}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="hardware-chip" size={36} color="#8B5CF6" />
          </Animated.View>

          <Text style={styles.sessionValue}>
            {miningActive
              ? `${sessionBalance.toFixed(4)} VAD`
              : "Start mining to begin"}
          </Text>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
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

        {/* NEWS */}
        <Pressable style={styles.newsPreview} onPress={() => setNewsOpen(true)}>
          <View style={styles.newsRow}>
            <Ionicons name="newspaper" size={22} color="#8B5CF6" />
            <Text style={styles.newsPreviewTitle}>VAD Updates</Text>
          </View>
          <Text style={styles.newsPreviewText}>
            Latest announcements, mining updates, rewards & ecosystem news.
          </Text>
        </Pressable>

        {/* AD */}
        <View style={styles.newsAdWrap}>
          <AdBanner />
        </View>
      </Animated.ScrollView>

      {/* MODALS */}
      {dailyOpen && <DailyClaim visible onClose={() => setDailyOpen(false)} />}
      {boostOpen && <Boost visible onClose={() => setBoostOpen(false)} />}
      {watchOpen && <WatchEarn visible onClose={() => setWatchOpen(false)} />}
      {newsOpen && <News visible onClose={() => setNewsOpen(false)} />}
    </View>
  );
}

/* ============================================================
   STYLES
=============================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060B1A" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
    paddingHorizontal: 18,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: { width: 44, height: 44, borderRadius: 12 },

  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerSub: { color: "#bfc7df", fontSize: 12 },

  tierBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierText: { fontSize: 11, fontWeight: "900" },

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
  sessionValue: { fontSize: 28, color: "#fff", fontWeight: "900", marginVertical: 10 },

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
    marginBottom: 6,
  },

  miniBtn: {
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  miniLabel: { color: "#9FA8C7", fontSize: 11, marginTop: 4 },

  newsPreview: {
    marginHorizontal: 22,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  newsRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  newsPreviewTitle: { color: "#fff", fontWeight: "900", marginLeft: 8 },
  newsPreviewText: { color: "#9FA8C7", fontSize: 12, lineHeight: 16 },

  newsAdWrap: {
    marginHorizontal: 22,
    marginTop: 12,
    height: 60,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

 headerTagline: {
  marginTop: 6,
  color: "#8B5CF6",
  fontSize: 13,
  fontWeight: "900",
  letterSpacing: 1.2,
  textTransform: "uppercase",
},

headerEarning: {
  marginTop: 4,
  color: "#C4B5FD",
  fontSize: 12,
  fontWeight: "700",
},

headerEarningStrong: {
  color: "#8B5CF6",
  fontWeight: "900",
},

headerIntro: {
  marginTop: 2,
  color: "#9FA8C7",
  fontSize: 11,
  fontWeight: "600",
  letterSpacing: 0.4,
},



});

