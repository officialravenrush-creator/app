// components/AdBanner.tsx
import React, { useMemo } from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

export default function AdBanner() {
  // Always use test ad in dev
  const unitId = __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-4533962949749202/7206578732";

  // memoized request options (avoids reload crash)
  const requestOptions = useMemo(() => {
    return {
      requestNonPersonalizedAdsOnly: false,
    };
  }, []);

  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      <BannerAd
        size={BannerAdSize.FULL_BANNER}
        unitId={unitId}
        requestOptions={requestOptions}
      />
    </View>
  );
}
