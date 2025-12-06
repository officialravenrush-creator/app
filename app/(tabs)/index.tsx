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
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { MotiView, MotiText } from "moti";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { auth, app } from "../../firebase/firebaseConfig";
import { useMining } from "../../hooks/useMining";
import { getDatabase, ref as dbRef, onValue } from "firebase/database";
import DailyClaim from "../../components/daily-claim";
import Boost from "../../components/boost";
import WatchEarn from "../../components/watch-earn";


const { width } = Dimensions.get("window");
const DAY_SECONDS = 24 * 3600;
const DAILY_MAX = 4.8;

export default function MiningDashboard() {
  const router = useRouter();
  const {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
    getLiveBalance,
  } = useMining();

  // Animated balance (total + live session)
  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningActive = miningData?.miningActive ?? false;
  const balanceBase = miningData?.balance ?? 0;

  // session live values (computed every second)
  const [sessionBalance, setSessionBalance] = useState<number>(0);
  const [sessionElapsed, setSessionElapsed] = useState<number>(0); // seconds
  const [timeLeft, setTimeLeft] = useState<number>(DAY_SECONDS);
  const [news, setNews] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // compute per-second rate
  const perSecond = miningActive ? DAILY_MAX / DAY_SECONDS : 0;
  const perMinute = perSecond * 60;
  const perHour = perMinute * 60;

  // Animate displayed balance whenever getLiveBalance or base changes
  useEffect(() => {
    const toVal = Number(getLiveBalance() ?? balanceBase);
    Animated.timing(animatedBalance, {
      toValue: toVal,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [getLiveBalance, balanceBase]);

  // Update session values every second (live accumulation)
// Update session values every second (live accumulation)
useEffect(() => {
  let t: any = null;

  const compute = () => {
    const lastStart = miningData?.lastStart ?? null;

    // Normalize lastStart into a clean number (ms)
    const startMs = lastStart
      ? typeof (lastStart as any).toMillis === "function"
        ? (lastStart as any).toMillis()
        : Number(lastStart)
      : 0;

    if (miningData && miningData.miningActive && startMs > 0) {
      const now = Date.now();
      const elapsedSeconds = Math.max(
        0,
        Math.floor((now - startMs) / 1000)
      );

      const capped = Math.min(elapsedSeconds, DAY_SECONDS);
      const sessionGain = capped * (DAILY_MAX / DAY_SECONDS);

      setSessionElapsed(capped);
      setSessionBalance(sessionGain);
      setTimeLeft(Math.max(0, DAY_SECONDS - capped));
    } else {
      setSessionElapsed(0);
      setSessionBalance(0);
      setTimeLeft(DAY_SECONDS);
    }
  };

  compute();
  t = setInterval(compute, 1000);

  return () => {
    if (t) clearInterval(t);
  };
}, [miningData]);


  // spin animation
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (miningActive) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [miningActive]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // start/stop handlers (with optimistic UI)
  const handleStartStop = async () => {
    const user = auth.currentUser;
    if (!user) return router.push("/auth/login" as any);

    try {
      if (!miningActive) {
        setIsStarting(true);
        await start();
        setIsStarting(false);
      } else {
        await stop();
      }
    } catch (err) {
      setIsStarting(false);
      Alert.alert("Error", "Couldn't toggle mining.");
    }
  };

  // claim handler
  const handleClaim = async () => {
    const user = auth.currentUser;
    if (!user) return router.push("/auth/login" as any);

    try {
      setIsClaiming(true);
      const reward = await claim();
      setIsClaiming(false);
      Alert.alert("Claimed", `${reward?.toFixed(4) ?? 0} VAD`);
    } catch (err) {
      setIsClaiming(false);
      Alert.alert("Error", "Claim failed.");
    }
  };

  // Realtime Database listener for /news (ordered by key latest-first)
  useEffect(() => {
    try {
      const db = getDatabase(app);
      const newsRef = dbRef(db, "news");
      const unsub = onValue(newsRef, (snap) => {
        const value = snap.val() ?? {};
        // convert to array ordered by timestamp descending (if timestamp exists)
        const arr = Object.keys(value)
          .map((k) => ({ id: k, ...(value[k] as any) }))
          .sort((a, b) => {
            const ta = a.timestamp ? a.timestamp : 0;
            const tb = b.timestamp ? b.timestamp : 0;
            return tb - ta;
          });
        setNews(arr);
      });

      return () => unsub();
    } catch (err) {
      console.warn("Realtime DB news listener error", err);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Animated total balance component
  const AnimatedBalance = () => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      const id = animatedBalance.addListener(({ value }) => {
        setVal(Number(value));
      });
      return () => animatedBalance.removeListener(id);
    }, []);

    return (
      <MotiText
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 360 }}
        style={styles.balance}
      >
        {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
      </MotiText>
    );
  };

  // session progress
  const progress = useMemo(() => {
    if (!miningActive) return 0;
    return Math.min(1, sessionElapsed / DAY_SECONDS);
  }, [miningActive, sessionElapsed]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <View style={styles.container}>
      {/* TOP NAV (floating) */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <View style={styles.profileCircle}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={22} color="#fff" />
            )}
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/(tabs)/explore")}>
          <View style={styles.chatCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          </View>
        </Pressable>
      </View>

      {/* MAIN SCROLLABLE AREA */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient card (small) */}
        <LinearGradient colors={["#22163a", "#0e0916"]} style={styles.headerCard}>
          <MotiText style={styles.headerTitle}>VAD Mining</MotiText>
          <Text style={styles.headerSub}>Earn up to {DAILY_MAX} VAD every 24 hours</Text>
        </LinearGradient>

        {/* CURRENT BALANCE (open background) */}
        <View style={styles.currentWrap}>
          <Text style={styles.currentLabel}>Current Balance</Text>
          <AnimatedBalance />
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonsRow}>
          <Pressable
            onPress={handleStartStop}
            style={({ pressed }) => [
              styles.halfBtn,
              miningActive ? styles.miningActiveBtn : styles.startBtn,
              { opacity: pressed ? 0.92 : 1 },
            ]}
            disabled={isStarting}
          >
            <View style={styles.btnInner}>
              <MaterialIcons
                name={miningActive ? "pause-circle" : "play-circle-fill"}
                size={26}
                color="#fff"
              />
              <Text style={styles.btnText}>
                {miningActive ? "Mine Active" : "Start Mine"}
              </Text>
              <Text style={styles.smallTimer}>{miningActive ? formatTime(timeLeft) : ""}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleClaim}
            style={({ pressed }) => [
              styles.halfBtn,
              styles.claimBtn,
              { opacity: pressed ? 0.98 : 1 },
            ]}
            disabled={isClaiming}
          >
            <View style={styles.btnInner}>
              <MaterialIcons name="redeem" size={22} color="#0F0A2A" />
              <Text style={styles.claimBtnText}>Claim Rewards</Text>
              <Text style={styles.claimAmountText}>{balanceBase.toFixed(4)} VAD</Text>
            </View>
          </Pressable>
        </View>

        {/* SESSION BLOCK */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View>
              <Text style={styles.sessionLabel}>Session Mining</Text>
              <Text style={styles.sessionValue}>
                {sessionBalance.toFixed(4)} <Text style={styles.vadSmall}>VAD</Text>
              </Text>
            </View>

            <Animated.View style={[styles.miningIcon, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="hardware-chip" size={24} color="#fff" />
            </Animated.View>
          </View>

          {/* progress + meta */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{formatTime(timeLeft)} left</Text>
              <Text style={styles.progressText}>{(progress * 100).toFixed(1)}%</Text>
            </View>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>About VAD mining</Text>
            <Text style={styles.infoBody}>
              Mining accrues continuously while active, up to {DAILY_MAX} VAD per 24-hour
              session. Claim anytime to add session rewards to your total balance.
            </Text>
          </View>
        </View>

        {/* Banner ad placeholder */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerLabel}>Banner ads</Text>
        </View>

        {/* Utilities row (inline components imported from components) */}
        <View style={styles.utilityRow}>
          <View style={styles.utilityItem}>
            <DailyClaim />
          </View>

          <View style={styles.utilityItem}>
            <Boost />
          </View>

          <View style={styles.utilityItem}>
            <WatchEarn />
          </View>
        </View>

        {/* News & Updates — Premium styled */}
        <View style={styles.newsSection}>
          <Text style={styles.newsHeader}>News & Updates</Text>

          {news.length === 0 ? (
            <View style={styles.newsEmptyCard}>
              <Text style={styles.newsEmptyText}>No recent updates — check back soon.</Text>
            </View>
          ) : (
            news.map((n) => (
              <View key={n.id} style={styles.newsCardItem}>
                {n.image ? (
                  <Image source={{ uri: n.image }} style={styles.newsImage} />
                ) : (
                  <View style={styles.newsImagePlaceholder}>
                    <Ionicons name="newspaper-outline" size={22} color="#8b8fb2" />
                  </View>
                )}
                <View style={styles.newsTextWrap}>
                  <Text style={styles.newsTitleText}>{n.title}</Text>
                  {n.subtitle ? (
                    <Text style={styles.newsBodyText} numberOfLines={2}>
                      {n.subtitle}
                    </Text>
                  ) : null}
                  <Text style={styles.newsTimeText}>
                    {n.timestamp ? timeAgoFromUnix(n.timestamp) : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: Platform.OS === "ios" ? 120 : 120 }} />
      </ScrollView>
    </View>
  );

  // helper: shows relative time from unix timestamp (seconds or ms)
  function timeAgoFromUnix(ts: number) {
    // handle both seconds and ms
    const t = ts > 1e12 ? ts : ts * 1000;
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060B1A",
  },

  /* TOP NAV (floating, fixed) */
  topNav: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },

  chatCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  /* scroll area */
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 86, // allow for topNav
  },

  headerCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "900",
  },
  headerSub: {
    color: "#bfc7df",
    marginTop: 4,
    fontSize: 12,
  },

  /* current balance */
  currentWrap: {
    marginBottom: 14,
  },
  currentLabel: {
    color: "#9FA8C7",
    fontSize: 13,
    marginBottom: 6,
  },
  balance: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
  },
  vadText: {
    color: "#8B5CF6",
    fontSize: 18,
    fontWeight: "700",
  },
  vadSmall: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "700",
  },

  /* buttons */
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  halfBtn: {
    width: (width - 22 * 2 - 12) / 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  btnInner: {
    alignItems: "center",
  },
  startBtn: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },

  /* FIXED VERSION — NO DUPLICATE backgroundColor */
  miningActiveBtn: {
    backgroundColor: "rgba(139,92,246,0.16)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.18)",
  },

  btnText: {
    color: "#fff",
    marginTop: 8,
    fontWeight: "700",
  },
  smallTimer: {
    color: "#9FA8C7",
    marginTop: 6,
    fontSize: 12,
  },

  claimBtn: {
    backgroundColor: "#fff",
  },
  claimBtnText: {
    color: "#0F0A2A",
    fontWeight: "800",
    marginTop: 6,
  },
  claimAmountText: {
    marginTop: 6,
    color: "#0F0A2A",
    fontWeight: "700",
  },

  /* session card */
  sessionCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  sessionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  sessionValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  miningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },

  progressWrap: {
    marginTop: 6,
  },
  progressBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    backgroundColor: "#3B82F6",
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressText: {
    color: "#9FA8C7",
    fontSize: 12,
  },

  infoBox: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
  },
  infoTitle: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 6,
  },
  infoBody: {
    color: "#bfc7df",
    fontSize: 13,
  },

  /* banner */
  bannerCard: {
    marginTop: 8,
    backgroundColor: "#0f1113",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  bannerLabel: {
    color: "#9FA8C7",
    fontSize: 13,
  },

  /* utilities */
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  utilityItem: {
    width: (width - 22 * 2 - 12) / 3,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },

  /* news */
  newsSection: {
    marginBottom: 20,
  },
  newsHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  newsEmptyCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  newsEmptyText: {
    color: "#9FA8C7",
  },
  newsCardItem: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  newsImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 8,
  },
  newsImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "rgba(139,92,246,0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  newsTextWrap: {
    flex: 1,
  },
  newsTitleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  newsBodyText: {
    color: "#bfc7df",
    marginTop: 4,
    fontSize: 13,
  },
  newsTimeText: {
    color: "#9FA8C7",
    marginTop: 8,
    fontSize: 11,
  },

  /* loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#060B1A",
  },
});
