import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { MotiView } from "moti";

export default function MiningDashboard() {
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "white", padding: 20 }}>

      {/* HEADER */}
      <Text style={{ fontSize: 30, fontWeight: "bold", textAlign: "center", marginBottom: 20 }}>
        ⛏️ Mining Dashboard
      </Text>

      {/* BALANCE CARD */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={{
          backgroundColor: "#f3f3f3",
          paddingVertical: 20,
          borderRadius: 15,
          marginBottom: 20,
          borderColor: "#ddd",
          borderWidth: 1,
        }}
      >
        <Text style={{ textAlign: "center", fontSize: 18, color: "#888" }}>
          Current Balance
        </Text>
        <Text style={{ textAlign: "center", fontSize: 40, fontWeight: "bold", color: "#333" }}>
          {balance.toFixed(2)} <Text style={{ color: "#007aff" }}>VAD</Text>
        </Text>
      </MotiView>

      {/* STATUS */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={{ fontSize: 18, color: "#333" }}>
          Status:
          <Text style={{ fontWeight: "bold", color: mining ? "green" : "red", marginLeft: 5 }}>
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
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "green",
              marginTop: 10,
            }}
          />
        )}
      </View>

      {/* START/STOP BUTTON */}
      <TouchableOpacity
        onPress={() => setMining(!mining)}
        style={{
          paddingVertical: 15,
          backgroundColor: mining ? "#dc3545" : "#28a745",
          borderRadius: 10,
          alignItems: "center",
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
          {mining ? "Stop Mining" : "Start Mining"}
        </Text>
      </TouchableOpacity>

      {/* CLAIM BUTTON */}
      <TouchableOpacity
        onPress={() => {}}
        style={{
          paddingVertical: 15,
          backgroundColor: "#007aff",
          borderRadius: 10,
          marginTop: 20,
          alignItems: "center",
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
          Claim Rewards
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />
      )}
    </View>
  );
}
