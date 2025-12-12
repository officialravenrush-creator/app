// services/user.ts
import { supabase } from "../supabase/client";
import {
  UserProfile,
  MiningData,
  ReferralData,
  BoostData,
  DailyClaimData,
  WatchEarnData,
} from "../supabase/types"; // adjust path if your types live elsewhere

/* -------------------------------------------------------------
   Generate random referral code (same behavior)
------------------------------------------------------------- */
export const generateReferralCode = (uid: string) =>
  uid.slice(0, 6).toUpperCase();

/* -------------------------------------------------------------
   CREATE USER AFTER REGISTER
   - expects current supabase auth user exists
   - creates one row per table (user_profiles, mining_data, referral_data, boost_data, daily_claim_data, watch_earn_data)
------------------------------------------------------------- */
export async function createUserInFirestore(referredBy: string | null = null) {
  const {
    data: authUser,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    console.warn("No supabase auth user available.", authError);
    return null;
  }

  const uid = authUser.user.id;

  const profile: Partial<UserProfile> = {
    user_id: uid,
    username: "",
    avatar_url: null,
    referral_code: generateReferralCode(uid),
    referred_by: referredBy,
    // created_at defaults to now() in your schema
  };

  const mining: Partial<MiningData> = {
    user_id: uid,
    mining_active: false,
    last_start: null,
    last_claim: null,
    balance: 0, // double precision assumed
  };

  const referrals: Partial<ReferralData> = {
    user_id: uid,
    total_referred: 0,
    referred_users: [],
  };

  const boost: Partial<BoostData> = {
    user_id: uid,
    used_today: 0,
    last_reset: null,
    balance: 0,
  };

  const dailyClaim: Partial<DailyClaimData> = {
    user_id: uid,
    last_claim: null,
    streak: 0,
    total_earned: 0,
  };

  const watchEarn: Partial<WatchEarnData> = {
    user_id: uid,
    total_watched: 0,
    total_earned: 0,
  };

  // Insert rows. We do separate inserts because they're separate tables.
  const inserts = [
    supabase.from("user_profiles").insert(profile),
    supabase.from("mining_data").insert(mining),
    supabase.from("referral_data").insert(referrals),
    supabase.from("boost_data").insert(boost),
    supabase.from("daily_claim_data").insert(dailyClaim),
    supabase.from("watch_earn_data").insert(watchEarn),
  ];

  const results = await Promise.all(inserts);

  // Log any insertion errors
  for (const r of results) {
    // @ts-ignore
    if (r.error) console.error("insert error:", r.error);
  }

  return true;
}

/* -------------------------------------------------------------
   GET USER DATA
   - returns an aggregated object similar to your firebase doc.data()
------------------------------------------------------------- */
export async function getUserData(uid: string) {
  // fetch each table row and merge
  const [
    profileRes,
    miningRes,
    referralsRes,
    boostRes,
    dailyRes,
    watchRes,
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
    supabase.from("referral_data").select("*").eq("user_id", uid).single(),
    supabase.from("boost_data").select("*").eq("user_id", uid).single(),
    supabase.from("daily_claim_data").select("*").eq("user_id", uid).single(),
    supabase.from("watch_earn_data").select("*").eq("user_id", uid).single(),
  ]);

  if (profileRes.error && profileRes.error.code === "PGRST116") {
    // not found
    return null;
  }

  // Build the combined object in the same shape your UI expects
  const result: any = {};
  if (!profileRes.error) result.profile = profileRes.data;
  if (!miningRes.error) result.mining = miningRes.data;
  if (!referralsRes.error) result.referrals = referralsRes.data;
  if (!boostRes.error) result.boost = boostRes.data;
  if (!dailyRes.error) result.dailyClaim = dailyRes.data;
  if (!watchRes.error) result.watchEarn = watchRes.data;

  return result;
}

/* -------------------------------------------------------------
   START MINING
------------------------------------------------------------- */
export async function startMining(uid: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("mining_data")
    .update({
      mining_active: true,
      last_start: now,
    })
    .eq("user_id", uid);

  if (error) {
    console.error("startMining error", error);
    throw error;
  }

  return data;
}

/* -------------------------------------------------------------
   STOP MINING
------------------------------------------------------------- */
export async function stopMining(uid: string) {
  const { data, error } = await supabase
    .from("mining_data")
    .update({
      mining_active: false,
    })
    .eq("user_id", uid);

  if (error) {
    console.error("stopMining error", error);
    throw error;
  }

  return data;
}

/* -------------------------------------------------------------
   CLAIM MINING REWARD
   - replicates the Firebase transaction logic as closely as possible
   - reads the mining row, computes reward, then attempts a conditional update
------------------------------------------------------------- */
export async function claimMiningReward(uid: string) {
  // 1) fetch mining row
  const fetch = await supabase
    .from("mining_data")
    .select("*")
    .eq("user_id", uid)
    .single();

  if (fetch.error || !fetch.data) return 0;

  const mining = fetch.data as any;

  if (!mining.last_start) return 0;

  const lastStart = new Date(mining.last_start);
  const now = new Date();
  const elapsedMs = now.getTime() - lastStart.getTime();
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  const MAX_SECONDS = 24 * 3600;
  const capped = Math.min(elapsedSeconds, MAX_SECONDS);

  const DAILY_MAX = 4.8;
  const rewardAmount = (capped / MAX_SECONDS) * DAILY_MAX;
  const normalizedReward = Number(rewardAmount);

  // 2) conditional update: only apply if last_start hasn't changed
  const update = await supabase
    .from("mining_data")
    .update({
      balance: (mining.balance ?? 0) + normalizedReward,
      last_claim: now.toISOString(),
      last_start: null,
      mining_active: false,
    })
    .eq("user_id", uid)
    .eq("last_start", mining.last_start); // only update if last_start still matches

  if (update.error) {
    console.error("claimMiningReward update error", update.error);
    return 0;
  }

  // if no rows updated, return 0 to indicate someone else claimed concurrently
  if (!update.data || (Array.isArray(update.data) && update.data.length === 0))
    return 0;

  return normalizedReward;
}

/* -------------------------------------------------------------
   REGISTER REFERRAL
   - find user by referral_code, then update their referral_data row
------------------------------------------------------------- */
export async function registerReferral(referrerCode: string, newUserUid: string) {
  // find referrer user_id
  const ref = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("referral_code", referrerCode)
    .maybeSingle();

  if (ref.error || !ref.data) return null;

  const referrerUid = (ref.data as any).user_id;

  // fetch existing referral_data
  const rfetch = await supabase
    .from("referral_data")
    .select("*")
    .eq("user_id", referrerUid)
    .single();

  if (rfetch.error || !rfetch.data) return null;

  const current = rfetch.data as any;
  const newReferredUsers = [...(current.referred_users ?? []), newUserUid];
  const newTotal = (current.total_referred ?? 0) + 1;

  const upd = await supabase
    .from("referral_data")
    .update({
      total_referred: newTotal,
      referred_users: newReferredUsers,
    })
    .eq("user_id", referrerUid);

  if (upd.error) {
    console.error("registerReferral update error", upd.error);
    return null;
  }

  return true;
}

/* -------------------------------------------------------------
   BOOST REWARD (WATCH ADS)
   - allows up to 3 boosts per 24h
------------------------------------------------------------- */
export async function claimBoostReward(uid: string) {
  // fetch boost and mining
  const [bRes, mRes] = await Promise.all([
    supabase.from("boost_data").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
  ]);

  if (bRes.error || mRes.error) {
    console.error("claimBoostReward fetch error", bRes.error || mRes.error);
    return 0;
  }

  const boost = bRes.data as any;
  const mining = mRes.data as any;

  const now = new Date();
  const lastReset = boost.last_reset ? new Date(boost.last_reset) : null;

  // reset if needed
  if (!lastReset || now.getTime() - lastReset.getTime() >= 24 * 3600 * 1000) {
    // reset used_today to 0 and set last_reset to now
    const resetRes = await supabase
      .from("boost_data")
      .update({
        used_today: 0,
        last_reset: now.toISOString(),
      })
      .eq("user_id", uid);

    if (resetRes.error) {
      console.error("boost reset error", resetRes.error);
      return 0;
    }
    boost.used_today = 0;
    boost.last_reset = now.toISOString();
  }

  if (boost.used_today >= 3) return 0;

  const REWARD = 0.5;

  // update mining balance and boost counters
  const [updateMining, updateBoost] = await Promise.all([
    supabase
      .from("mining_data")
      .update({
        balance: (mining.balance ?? 0) + REWARD,
      })
      .eq("user_id", uid),
    supabase
      .from("boost_data")
      .update({
        used_today: (boost.used_today ?? 0) + 1,
        last_reset: now.toISOString(),
        balance: (boost.balance ?? 0) + REWARD,
      })
      .eq("user_id", uid),
  ]);

  if (updateMining.error || updateBoost.error) {
    console.error("claimBoostReward update error", updateMining.error || updateBoost.error);
    return 0;
  }

  return REWARD;
}

/* -------------------------------------------------------------
   DAILY CLAIM (STREAK)
------------------------------------------------------------- */
// (only the DAILY CLAIM function is shown below — keep the rest of your file as-is)


export async function claimDailyReward(uid: string) {
const [dRes, mRes] = await Promise.all([
supabase.from("daily_claim_data").select("*").eq("user_id", uid).single(),
supabase.from("mining_data").select("*").eq("user_id", uid).single(),
]);


if (dRes.error || mRes.error) {
console.error("claimDailyReward fetch error", dRes.error || mRes.error);
return { reward: 0 };
}


const daily = dRes.data as any;
const mining = mRes.data as any;


const now = new Date();
const lastClaim = daily.last_claim ? new Date(daily.last_claim) : null;
const DAY = 24 * 3600 * 1000;


if (lastClaim && now.getTime() - lastClaim.getTime() < DAY) {
return { reward: 0 };
}


// if missed a day, reset streak
if (lastClaim && now.getTime() - lastClaim.getTime() >= DAY * 2) {
daily.streak = 0;
}


daily.streak = (daily.streak ?? 0) + 1;


let REWARD = 0.1 * daily.streak;
if (daily.streak === 7) REWARD = 2;


// update mining and daily_claim_data
const [uMining, uDaily] = await Promise.all([
supabase
.from("mining_data")
.update({
balance: (mining.balance ?? 0) + REWARD,
})
.eq("user_id", uid),
supabase
.from("daily_claim_data")
.update({
last_claim: now.toISOString(),
streak: daily.streak,
total_earned: (daily.total_earned ?? 0) + REWARD,
})
.eq("user_id", uid),
]);


if (uMining.error || uDaily.error) {
console.error("claimDailyReward update error", uMining.error || uDaily.error);
return { reward: 0 };
}


return {
reward: REWARD,
newStreak: daily.streak,
newLastClaim: now.toISOString(),
newBalance: (mining.balance ?? 0) + REWARD,
};
}


/* -------------------------------------------------------------
   WATCH & EARN (REWARDED ADS)
------------------------------------------------------------- */
export async function claimWatchEarnReward(uid: string) {
  const [wRes, mRes] = await Promise.all([
    supabase.from("watch_earn_data").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
  ]);

  if (wRes.error || mRes.error) {
    console.error("claimWatchEarnReward fetch error", wRes.error || mRes.error);
    return 0;
  }

  const watch = wRes.data as any;
  const mining = mRes.data as any;

  const REWARD = 0.25;

  const [uMining, uWatch] = await Promise.all([
    supabase
      .from("mining_data")
      .update({
        balance: (mining.balance ?? 0) + REWARD,
      })
      .eq("user_id", uid),
    supabase
      .from("watch_earn_data")
      .update({
        total_watched: (watch.total_watched ?? 0) + 1,
        total_earned: (watch.total_earned ?? 0) + REWARD,
      })
      .eq("user_id", uid),
  ]);

  if (uMining.error || uWatch.error) {
    console.error("claimWatchEarnReward update error", uMining.error || uWatch.error);
    return 0;
  }

  return REWARD;
}
