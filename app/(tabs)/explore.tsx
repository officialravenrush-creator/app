import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase/client";

const { width } = Dimensions.get("window");
const CARD_W = Math.floor((width - 48) / 2);

// STATIC MARKET DATA (PLACEHOLDER)
const SAMPLE_MARKET_ITEMS = [
  {
    id: "rwa-001",
    title: "Oceanfront Land Parcel",
    collection: "VAD Real Assets",
    price: 1250,
    currency: "VAD",
    badge: "Verified RWA",
  },
  {
    id: "nft-023",
    title: "Neon Raven #023",
    collection: "VAD Digital Art",
    price: 350,
    currency: "VAD",
    badge: "Featured",
  },
  {
    id: "prop-012",
    title: "Sky Tower Token",
    collection: "Urban Properties",
    price: 4200,
    currency: "VAD",
    badge: "Fractional",
  },
  {
    id: "drop-077",
    title: "Genesis Asset Pack",
    collection: "VAD Drops",
    price: 80,
    currency: "VAD",
    badge: "New",
  },
];

export default function VadMarketplace() {
  return <MarketplaceScreen />;
}

function MarketplaceScreen() {
  const [userLabel, setUserLabel] = useState("Guest");

  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (user) {
        setUserLabel(user.email ? user.email.split("@")[0] : user.id.slice(0, 6));
      }
    })();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const soon = (label?: string) =>
    Alert.alert("VAD Marketplace", label ? `${label} — coming soon.` : "Coming soon.");

  const renderCard = (item: any) => {
    const scale = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View key={item.id} style={[styles.card, { opacity: fade }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => soon(item.title)}
          onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
          style={{ flex: 1 }}
        >
          <View style={styles.media}>
            <Ionicons name="cube-outline" size={30} color="rgba(255,255,255,0.15)" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text numberOfLines={1} style={styles.title}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={styles.collection}>
              {item.collection}
            </Text>

            <View style={styles.footer}>
              <View>
                <Text style={styles.price}>
                  {item.price.toLocaleString()} {item.currency}
                </Text>
                <Text style={styles.sub}>Tokenized Asset</Text>
              </View>

              <View style={styles.buyBtn}>
                <Text style={styles.buyText}>VIEW</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
          <View>
            <Text style={styles.brandTitle}>VAD Marketplace</Text>
            <Text style={styles.brandSub}>Real Assets • NFTs • Digital Value</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Ionicons name="wallet-outline" size={18} color="#fff" />
          <View style={styles.user}>
            <Ionicons name="person" size={14} color="#000" />
            <Text style={styles.userText}>{userLabel}</Text>
          </View>
        </View>
      </Animated.View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Discover Tokenized Assets</Text>
          <Text style={styles.heroSub}>
            Trade verified real-world assets, NFTs, and digital collectibles powered by VAD.
          </Text>
        </View>

        {/* FILTER PLACEHOLDERS */}
        <View style={styles.filters}>
          {["All Assets", "RWA", "NFTs", "Collections"].map((f) => (
            <TouchableOpacity key={f} onPress={() => soon(f)} style={styles.filter}>
              <Text style={styles.filterText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          {SAMPLE_MARKET_ITEMS.map(renderCard)}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* THEME */
const BG = "#000";
const CARD = "#0D0D0D";
const BLUE = "#5865F2";
const MUTED = "rgba(255,255,255,0.55)";

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 8 },

  brandTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  brandSub: { color: MUTED, fontSize: 11 },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  user: {
    backgroundColor: BLUE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  scroll: { padding: 16 },

  hero: { backgroundColor: CARD, padding: 16, borderRadius: 16, marginBottom: 16 },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  heroSub: { color: MUTED, marginTop: 6, fontSize: 13 },

  filters: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filter: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },

  card: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },

  media: {
    height: CARD_W,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(88,101,242,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: BLUE, fontSize: 10, fontWeight: "800" },

  body: { padding: 12 },
  title: { color: "#fff", fontSize: 13, fontWeight: "800" },
  collection: { color: MUTED, fontSize: 11, marginTop: 3 },

  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  price: { color: "#fff", fontWeight: "800" },
  sub: { color: MUTED, fontSize: 11 },

  buyBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
