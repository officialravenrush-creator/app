// hooks/useMining.ts
// hooks/useMining.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase/client";
import {
  startMining,
  stopMining,
  claimMiningReward,
  getUserData,
} from "../services/user";

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

export type MiningData = {
  miningActive: boolean;
  lastStart: { toMillis: () => number } | null;
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

function toTimestampLike(iso: string | null) {
  if (!iso) return null;
  return {
    toMillis: () => new Date(iso).getTime(),
  };
}

/* -------------------- Normalizers -------------------- */

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
    lastStart: toTimestampLike(m.last_start),
    lastClaim: m.last_claim ?? null,
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
   Compute display balance (unchanged)
------------------------------------------------------------ */
function computeDisplayBalanceFromMining(mining: MiningData | null) {
  const baseBalance = mining?.balance ?? 0;
  const lastStartObj = mining?.lastStart ?? null;
  const miningActive = mining?.miningActive ?? false;

  if (!miningActive || !lastStartObj) return baseBalance;

  const nowMs = Date.now();
  const lastStartMs = lastStartObj.toMillis();
  const elapsedMs = Math.max(0, nowMs - lastStartMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const cappedSeconds = Math.min(elapsedSeconds, 24 * 3600);

  const perSecond = 4.8 / (24 * 3600);
  const sessionGain = cappedSeconds * perSecond;

  return Math.min(baseBalance + sessionGain, baseBalance + 4.8);
}

/* ------------------------------------------------------------
   Hook
------------------------------------------------------------ */
export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [dailyClaim, setDailyClaim] = useState<RawDailyRow | null>(null);
  const [boost, setBoost] = useState<ReturnType<typeof normalizeBoost> | null>(
    null
  );
  const [watchEarn, setWatchEarn] = useState<RawWatchRow | null>(null);

  const tickRef = useRef<number | null>(null);
  const channelsRef = useRef<any[]>([]);

  /* ------------------------------------------------------------
     Initial load + realtime
  ------------------------------------------------------------ */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setIsLoading(false);
        return;
      }

      const uid = user.id;

      try {
        const combined = await getUserData(uid);
        if (!mounted) return;

        setUserProfile(normalizeProfile(combined?.profile ?? null));
        setMiningData(normalizeMining(combined?.mining ?? null));
        setDailyClaim(combined?.dailyClaim ?? null);
        setBoost(normalizeBoost(combined?.boost ?? null));
        setWatchEarn(combined?.watchEarn ?? null);
      } catch (err) {
        console.error("useMining initial fetch error", err);
      } finally {
        if (mounted) setIsLoading(false);
      }

      /* ------------------------- Realtime ------------------------- */
      const tables = [
        {
          table: "user_profiles",
          setter: (p: RawProfileRow | null) =>
            setUserProfile(normalizeProfile(p)),
        },
        {
          table: "mining_data",
          setter: (r: RawMiningRow | null) => setMiningData(normalizeMining(r)),
        },
        {
          table: "daily_claim_data",
          setter: (r: RawDailyRow | null) => setDailyClaim(r),
        },
        {
          table: "boost_data",
          setter: (r: RawBoostRow | null) => setBoost(normalizeBoost(r)),
        },
        {
          table: "watch_earn_data",
          setter: (r: RawWatchRow | null) => setWatchEarn(r),
        },
        {
          table: "referral_data",
          setter: (_: any) => {},
        },
      ];

      const createdChannels: any[] = [];

      for (const t of tables) {
        const channel = supabase
          .channel(`public:${t.table}:uid:${uid}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: t.table,
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              const record = (payload.new ?? null) as any; // ✅ FIXED
              t.setter(record);
            }
          )
          .subscribe();

        createdChannels.push(channel);
      }

      channelsRef.current = createdChannels;
    })();

    return () => {
      mounted = false;
      channelsRef.current.forEach((ch) => {
        try {
          ch.unsubscribe?.();
        } catch (err) {
          try {
            supabase.removeChannel?.(ch);
          } catch {}
        }
      });
      channelsRef.current = [];
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, []);

  /* ------------------------------------------------------------
     ACTIONS
  ------------------------------------------------------------ */
  const start = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await startMining(user.id);
  }, []);

  const stop = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await stopMining(user.id);
  }, []);

  const claim = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    return await claimMiningReward(user.id);
  }, []);

  /* ------------------------------------------------------------
     Live balance
  ------------------------------------------------------------ */
  const computeDisplayBalance = useCallback((snapshot: MiningData | null) => {
    return computeDisplayBalanceFromMining(snapshot);
  }, []);

  const getLiveBalance = useCallback(() => {
    return computeDisplayBalance(miningData);
  }, [computeDisplayBalance, miningData]);

  /* ------------------------------------------------------------
     Return API
  ------------------------------------------------------------ */
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
    getLiveBalance,
  };
}
