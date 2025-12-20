// components/RewardedAd.ts
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { Platform } from "react-native";

export async function showRewardedAd(
  onReward?: (reward: { amount: number; type: string }) => void
): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const unitId = __DEV__
    ? TestIds.REWARDED
    : "ca-app-pub-4533962949749202/1804000824";

  const rewarded = RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  return new Promise<boolean>((resolve) => {
    let finished = false;

    const cleanup = () => {
      loaded();
      earned();
      closed();
      error();
    };

    const loaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => rewarded.show()
    );

    const earned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log("✅ Reward earned:", reward);
        onReward?.(reward);
      }
    );

    const closed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(true); // 👈 allow next ad later
      }
    );

    const error = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (err) => {
        console.log("❌ Rewarded error:", err);
        if (finished) return;
        finished = true;
        cleanup();
        resolve(false); // 👈 DO NOT reject
      }
    );

    rewarded.load();
  });
}
