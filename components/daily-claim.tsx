// app/(tabs)/daily-claim.tsx
import { View, Text, StyleSheet } from "react-native";

export default function DailyClaimScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Claim</Text>
      <Text style={styles.text}>Daily claim rewards will appear here soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    opacity: 0.6,
  },
});
