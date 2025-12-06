// app/(tabs)/boost.tsx
import { View, Text, StyleSheet } from "react-native";

export default function BoostScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Boost</Text>
      <Text style={styles.text}>Boost features will appear here soon.</Text>
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
