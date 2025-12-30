import { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";

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

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* LOGO */}
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />

          <Text style={styles.title}>Privacy Policy & Terms</Text>

          {/* CONTENT */}
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              const paddingToBottom = 24;
              const isBottom =
                nativeEvent.layoutMeasurement.height +
                  nativeEvent.contentOffset.y >=
                nativeEvent.contentSize.height - paddingToBottom;

              if (isBottom) setAtBottom(true);
            }}
            scrollEventThrottle={16}
          >
            <Text style={styles.text}>
              Welcome to <Text style={styles.strong}>VAD Depot</Text>, a
              crypto-related application built around a Proof-of-Stake mining
              model.
              {"\n\n"}
              By using this application, you acknowledge and agree to the
              following terms and conditions.
              {"\n\n"}
              <Text style={styles.section}>1. Data Usage & Privacy</Text>
              {"\n"}
              VAD Depot collects minimal data required to operate the platform,
              including wallet identifiers, mining activity, rewards history,
              and device-related analytics used strictly for security, abuse
              prevention, and service optimization.
              {"\n\n"}
              We do not sell personal data. No sensitive personal information is
              shared with third parties outside of essential infrastructure
              providers (analytics, hosting, ads).
              {"\n\n"}
              <Text style={styles.section}>2. Crypto & Mining Disclosure</Text>
              {"\n"}
              VAD Depot is a blockchain-related project. Mining rewards shown in
              the app are simulated protocol rewards and do not represent real,
              tradable, or transferable value at this time.
              {"\n\n"}
              <Text style={styles.strong}>
                VAD tokens currently have no monetary value.
              </Text>
              {"\n"}
              VAD tokens are not purchasable, sellable, transferable, or
              exchangeable until officially launched by the VAD team.
              {"\n\n"}
              Any attempt to buy, sell, trade, or market VAD tokens before
              official launch is strictly prohibited.
              {"\n\n"}
              <Text style={styles.section}>3. No Financial Advice</Text>
              {"\n"}
              Nothing within this application constitutes financial advice,
              investment advice, or trading recommendations.
              {"\n\n"}
              Participation in VAD Depot is voluntary and for experimental,
              educational, and ecosystem participation purposes only.
              {"\n\n"}
              <Text style={styles.section}>4. Abuse & Fair Use</Text>
              {"\n"}
              Automated actions, bots, emulators, exploit attempts, or any form
              of manipulation may result in suspension or permanent account
              termination without notice.
              {"\n\n"}
              <Text style={styles.section}>5. Policy Validity</Text>
              {"\n"}
              This agreement is valid for a limited period and must be reviewed
              and re-accepted periodically to continue using mining features.
              {"\n\n"}
              By tapping <Text style={styles.strong}>Agree & Continue</Text>, you
              confirm that you have read, understood, and accepted these terms.
            </Text>
          </ScrollView>

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

/* ============================================================
   STYLES
=============================================================== */
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 14,
  },

  card: {
    maxHeight: "82%",
    backgroundColor: "#060B1A",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
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
    marginBottom: 12,
  },

  scroll: {
    marginBottom: 14,
  },

  text: {
    color: "#9FA8C7",
    fontSize: 12.5,
    lineHeight: 18,
  },

  section: {
    color: "#C4B5FD",
    fontWeight: "900",
  },

  strong: {
    color: "#8B5CF6",
    fontWeight: "900",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
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
