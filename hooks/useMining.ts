// hooks/useMining.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase/client";

import {
  startMining,
  stopMining,
  claimMiningReward,
  getUserData,
} from "../services/user";

/* ------------------------------------------------------------
   TYPES
------------------------------------------------------------ */

type RawProfileRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

type RawMiningRow = {
  user_id: string;
  mining_active: boolean;
  last_start: string | null;
  last_claim: string | null;
  balance: number;
};

type RawDailyRow = {
  user_id: string;
  last_claim: string | null;
  streak: number;
  total_earned: number;
};

type RawBoostRow = {
  user_id: string;
  used_today: number;
  last_reset: string | null;
  balance: number;
};

type RawWatchRow = {
  user_id: string;
  total_watched: number;
  total_earned: number;
};

/* ------------------------------------------------------------
   FRONTEND TYPES
------------------------------------------------------------ */

export type MiningData = {
  miningActive: boolean;
  lastStart: string | null;
  lastClaim: string | null;
  balance: number;
};

export type UserProfile = {
  user_id: string;
  username: string;
  avatarUrl: string | null;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
};

/* ------------------------------------------------------------
   NORMALIZERS
------------------------------------------------------------ */

function normalizeProfile(p: RawProfileRow | null): UserProfile | null {
  if (!p) return null;
  return {
    user_id: p.user_id,
    username: p.username ?? "",
    avatarUrl: p.avatar_url ?? null,
    referralCode: p.referral_code ?? "",
    referredBy: p.referred_by ?? null,
    createdAt: p.created_at,
  };
}

function normalizeMining(m: RawMiningRow | null): MiningData | null {
  if (!m) return null;
  return {
    miningActive: !!m.mining_active,
    lastStart: m.last_start,
    lastClaim: m.last_claim,
    balance: Number(m.balance ?? 0),
  };
}

function normalizeBoost(b: RawBoostRow | null) {
  if (!b) return null;
  return {
    user_id: b.user_id,
    used_today: b.used_today,
    last_reset: b.last_reset,
    balance: b.balance,
  };
}

/* ------------------------------------------------------------
   HOOK
------------------------------------------------------------ */

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyClaim, setDailyClaim] = useState<RawDailyRow | null>(null);
  const [boost, setBoost] = useState<ReturnType<typeof normalizeBoost> | null>(
    null
  );
  const [watchEarn, setWatchEarn] = useState<RawWatchRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const channelsRef = useRef<any[]>([]);
  const miningDataRef = useRef<MiningData | null>(null);


  /* ------------------------------------------------------------
     INITIAL LOAD + REALTIME
  ------------------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setIsLoading(false);
        return;
      }

      const uid = data.user.id;

      const combined = await getUserData(uid);
      if (!mounted) return;

      setUserProfile(normalizeProfile(combined?.profile ?? null));
      setMiningData(normalizeMining(combined?.mining ?? null));
      setDailyClaim(combined?.dailyClaim ?? null);
      setBoost(normalizeBoost(combined?.boost ?? null));
      setWatchEarn(combined?.watchEarn ?? null);

      setIsLoading(false);

      const miningChannel = supabase
        .channel(`mining:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "mining_data",
            filter: `user_id=eq.${uid}`,
          },
          (payload) =>
            setMiningData(normalizeMining(payload.new as RawMiningRow))
        )
        .subscribe();

      channelsRef.current = [miningChannel];
    })();

    return () => {
      mounted = false;
      channelsRef.current.forEach((c) => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, []);

  /* ------------------------------------------------------------
     ACTIONS
  ------------------------------------------------------------ */

  const start = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await startMining(data.user.id);
  }, []);

  const stop = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await stopMining(data.user.id);
  }, []);

  /**
   * ✅ FIXED CLAIM (MANUAL, SAFE)
   */
const claim = useCallback(async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return 0;

  const uid = data.user.id;

  // 🔥 Call backend claim
  const reward = await claimMiningReward(uid);

  // ❌ nothing earned → do nothing
  if (reward <= 0) return 0;

  const now = new Date().toISOString();

  // ✅ HARD RESET SESSION LOCALLY (prevents stale timer & dead start)
  setMiningData((prev) => {
    if (!prev) return prev;

    const next = {
      ...prev,
      miningActive: false,
      lastStart: null,       // 🔥 CRITICAL
      lastClaim: now,
      balance: prev.balance + reward,
    };

    // 🔒 keep ref in sync with state
    miningDataRef.current = next;

    return next;
  });

  return reward;
}, []);


const applyBoostClaim = useCallback(
  (res: { reward: number; boost: RawBoostRow }) => {
    setBoost({
      user_id: res.boost.user_id,
      used_today: res.boost.used_today,
      last_reset: res.boost.last_reset,
      balance: res.boost.balance,
    });

    // 🔥 ALSO ADD REWARD TO MINING BALANCE
    setMiningData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: prev.balance + res.reward,
      };
    });
  },
  []
);


  /* ------------------------------------------------------------
     MANUAL REFRESH
  ------------------------------------------------------------ */

  const refreshAll = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    setIsLoading(true);

    const combined = await getUserData(data.user.id);

    setUserProfile(normalizeProfile(combined?.profile ?? null));
    setMiningData(normalizeMining(combined?.mining ?? null));
    setDailyClaim(combined?.dailyClaim ?? null);
    setBoost(normalizeBoost(combined?.boost ?? null));
    setWatchEarn(combined?.watchEarn ?? null);

    setIsLoading(false);
  }, []);

  const applyDailyClaim = useCallback(
  (res: { reward: number; dailyClaim: RawDailyRow }) => {
    // update daily claim state
    setDailyClaim(res.dailyClaim);

    // add reward to mining balance
    setMiningData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: prev.balance + res.reward,
      };
    });
  },
  []
);


return {
  miningData,
  userProfile,
  dailyClaim,
  boost,
  watchEarn,
  isLoading,
  start,
  stop,
  claim,
  applyBoostClaim,
  applyDailyClaim, // 🔥 ADD THIS
  refreshAll,
};

}
