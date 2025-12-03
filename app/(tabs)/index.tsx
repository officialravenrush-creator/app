import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useState } from "react";
import { MotiView } from "moti";
import { MaterialIcons } from "@expo/vector-icons"; // Import iconic icons

export default function MiningDashboard() {
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.headerText}>
        ⛏️ Mining Dashboard
      </Text>

      {/* BALANCE CARD */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balance}>
          {balance.toFixed(2)} <Text style={styles.vadText}>VAD</Text>
        </Text>
      </MotiView>

      {/* STATUS */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: 
          <Text style={[styles.statusLabel, { color: mining ? "green" : "red" }]}>
            {mining ? "Mining Active" : "Stopped"}
          </Text>
        </Text>

        {/* Pulse animation when mining */}
        {mining && (
          <MotiView
            from={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{
              loop: true,
              type: "timing",
              duration: 900,
            }}
            style={styles.pulseIndicator}
          />
        )}
      </View>

      {/* START/STOP BUTTON */}
      <TouchableOpacity
        onPress={() => setMining(!mining)}
        style={[styles.actionButton, { backgroundColor: mining ? "#dc3545" : "#28a745" }]}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name={mining ? "pause-circle-filled" : "play-circle-filled"}
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.actionButtonText}>
          {mining ? "Stop Mining" : "Start Mining"}
        </Text>
      </TouchableOpacity>

      {/* CLAIM BUTTON */}
      <TouchableOpacity
        onPress={() => {}}
        style={styles.claimButton}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name="attach-money"
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.claimButtonText}>Claim Rewards</Text>
      </TouchableOpacity>

      {isLoading && (
        <ActivityIndicator size="large" color="#007aff" style={styles.loadingIndicator} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  balanceCard: {
    backgroundColor: "#f3f3f3",
    paddingVertical: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderColor: "#ddd",
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  balanceLabel: {
    fontSize: 18,
    color: "#888",
  },
  balance: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333",
  },
  vadText: {
    color: "#007aff",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    color: "#333",
  },
  statusLabel: {
    fontWeight: "bold",
    marginLeft: 5,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "green",
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 20,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  claimButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: "#007aff",
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  claimButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  icon: {
    marginRight: 10,
  },
});
