import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useMining } from "@/hooks/useMining"; // Use the updated hook for mining
import { useState, useEffect } from "react";
import { db, auth } from "@/firebase/firebaseConfig"; // Ensure this is imported for referral

export default function MiningDashboard() {
  const { miningData, isLoading, start, stop, claim } = useMining();
  const [referralBonus, setReferralBonus] = useState(0);

  useEffect(() => {
    // Fetch the referrer bonus if any
    const fetchReferralBonus = async () => {
      if (auth.currentUser && miningData?.profile.referredBy) {
        const referrerRef = doc(db, "users", miningData.profile.referredBy);
        const refSnap = await getDoc(referrerRef);
        if (refSnap.exists()) {
          const referrerData = refSnap.data();
          setReferralBonus(referrerData.referrals.totalReferred * 0.1); // 10% bonus logic
        }
      }
    };

    fetchReferralBonus();
  }, [miningData]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black p-6">
      {/* HEADER */}
      <Text className="text-4xl font-extrabold text-center mb-8 text-black dark:text-white">
        ⛏️ Mining Dashboard
      </Text>

      {/* BALANCE CARD */}
      <View className="bg-gray-100 dark:bg-gray-900 py-10 rounded-3xl mb-8 shadow-lg border border-gray-200 dark:border-gray-800">
        <Text className="text-center text-lg text-gray-500 dark:text-gray-400">
          Current Balance
        </Text>
        <Text className="text-center text-6xl font-extrabold mt-2 text-black dark:text-white">
          {miningData?.balance?.toFixed(2)} <Text className="text-indigo-500">VAD</Text>
        </Text>
      </View>

      {/* REFERRAL BONUS */}
      {referralBonus > 0 && (
        <View className="bg-blue-100 dark:bg-blue-800 py-4 rounded-2xl mb-8">
          <Text className="text-center text-lg text-blue-600 dark:text-blue-300">
            Referral Bonus Earned
          </Text>
          <Text className="text-center text-3xl font-bold text-blue-500 dark:text-blue-200">
            +{referralBonus.toFixed(2)} VAD
          </Text>
        </View>
      )}

      {/* STATUS */}
      <View className="items-center mb-10">
        <Text className="text-lg text-gray-600 dark:text-gray-300">
          Status:
          <Text
            className={`font-bold ml-2 ${
              miningData?.miningActive ? "text-green-500" : "text-red-500"
            }`}
          >
            {miningData?.miningActive ? "Mining Active" : "Stopped"}
          </Text>
        </Text>
      </View>

      {/* START/STOP BUTTON */}
      <TouchableOpacity
        onPress={() => (miningData?.miningActive ? stop() : start())}
        className={`py-4 rounded-2xl ${
          miningData?.miningActive ? "bg-red-600" : "bg-green-600"
        } shadow-md`}
        activeOpacity={0.85}
      >
        <Text className="text-white text-center text-xl font-bold">
          {miningData?.miningActive ? "Stop Mining" : "Start Mining"}
        </Text>
      </TouchableOpacity>

      {/* CLAIM BUTTON */}
      <TouchableOpacity
        onPress={claim}
        className="py-4 rounded-2xl bg-indigo-600 mt-4 shadow-md active:bg-indigo-700"
        activeOpacity={0.85}
      >
        <Text className="text-white text-center text-xl font-semibold">
          Claim Rewards
        </Text>
      </TouchableOpacity>
    </View>
  );
}
