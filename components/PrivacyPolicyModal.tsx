import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { usePolicy } from "../hooks/usePolicy";

export default function PrivacyPolicyModal({
  visible,
  onAccept,
  onReject,
}: {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [atBottom, setAtBottom] = useState(false);
  const { policy, loading } = usePolicy("privacy_policy");
  

  useEffect(() => {
  console.log("[policy-modal] visible:", visible);
  console.log("[policy-modal] loading:", loading);
  console.log("[policy-modal] has content:", !!policy?.content);
}, [visible, loading, policy]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"   // 🔥 REQUIRED (iOS)
      statusBarTranslucent                  // 🔥 REQUIRED (Android)
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>
  {policy?.title ?? "Privacy Policy & Terms of Service"}
</Text>

          </View>

          {/* CONTENT */}
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator
                contentContainerStyle={styles.scrollContent}
                onScroll={({ nativeEvent }) => {
                  const isBottom =
                    nativeEvent.layoutMeasurement.height +
                      nativeEvent.contentOffset.y >=
                    nativeEvent.contentSize.height - 24;

                  if (isBottom) setAtBottom(true);
                }}
                scrollEventThrottle={16}
              >
               <Text style={styles.text}>
  {loading
    ? "Loading policy..."
    : policy?.content || "Policy content unavailable (debug)."}
</Text>

              </ScrollView>
            )}
          </View>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable style={styles.reject} onPress={onReject}>
              <Text style={styles.rejectText}>Decline</Text>
            </Pressable>

            <Pressable
              style={[
                styles.accept,
                !atBottom && { opacity: 0.4 },
              ]}
              disabled={!atBottom}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>
                Agree & Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  card: {
    flex: 1,                      // 🔥 NOT %
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",             // safe cap
    backgroundColor: "#060B1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
    overflow: "hidden",
  },

  header: {
    padding: 18,
    paddingBottom: 10,
  },

  logo: {
    width: 56,
    height: 56,
    alignSelf: "center",
    marginBottom: 8,
    borderRadius: 14,
  },

  title: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  content: {
    flex: 1,                      // 🔥 REAL HEIGHT
    paddingHorizontal: 18,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  text: {
    color: "#9FA8C7",
    fontSize: 13,
    lineHeight: 19,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  reject: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  accept: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#8B5CF6",
  },

  rejectText: {
    color: "#F87171",
    fontWeight: "800",
    textAlign: "center",
  },

  acceptText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
});
