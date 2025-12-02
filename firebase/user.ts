import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { UserProfile, MiningData, ReferralData } from "./types";
import { arrayUnion } from "firebase/firestore";

// Generate random referral code
export const generateReferralCode = (uid: string) =>
  uid.slice(0, 6).toUpperCase();

// ------------------------------
// CREATE USER AFTER REGISTER
// ------------------------------
export async function createUserInFirestore(referredBy: string | null = null) {
  if (!auth.currentUser) return;

  const uid = auth.currentUser.uid;

  const userRef = doc(db, "users", uid);

  const profile: UserProfile = {
    username: "",
    avatarUrl: null,
    referralCode: generateReferralCode(uid),
    referredBy,
    createdAt: serverTimestamp() as Timestamp,
  };

  const mining: MiningData = {
    miningActive: false,
    lastStart: null,
    lastClaim: null,
    balance: 0,
  };

  const referrals: ReferralData = {
    totalReferred: 0,
    referredUsers: [],
  };

  await setDoc(userRef, {
    profile,
    mining,
    referrals,
  });
}

// ------------------------------
// GET USER DATA
// ------------------------------
export async function getUserData(uid: string) {
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? docSnap.data() : null;
}

// ------------------------------
// START MINING
// ------------------------------
export async function startMining(uid: string) {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    "mining.miningActive": true,
    "mining.lastStart": serverTimestamp(),
  });
}

// ------------------------------
// STOP MINING
// ------------------------------
export async function stopMining(uid: string) {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    "mining.miningActive": false,
  });
}

// ------------------------------
// CLAIM REWARDS
// ------------------------------
export async function claimMiningReward(uid: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const mining = data.mining as MiningData;

  if (!mining.lastStart) return;

  // Calculate mined time (seconds)
  const now = Timestamp.now();
  const elapsedMs = now.toMillis() - mining.lastStart.toMillis();
  const minedSeconds = Math.floor(elapsedMs / 1000);

  // Define reward rate
  const rewardPerSecond = 0.001; // example

  const rewardAmount = minedSeconds * rewardPerSecond;

  await updateDoc(userRef, {
    "mining.balance": increment(rewardAmount),
    "mining.lastClaim": serverTimestamp(),
    "mining.lastStart": null,
    "mining.miningActive": false,
  });

  return rewardAmount;
}

// ------------------------------
// REGISTER REFERRAL
// ------------------------------
export async function registerReferral(referrerCode: string, newUserUid: string) {
  // Find user who owns this referral code
  const allUsersSnap = await getDoc(doc(db, "referrals", referrerCode));

  // If no referral document found → skip
  if (!allUsersSnap.exists()) return;

  const referrerUid = allUsersSnap.data().uid;

  const referrerRef = doc(db, "users", referrerUid);

  await updateDoc(referrerRef, {
    "referrals.totalReferred": increment(1),
    "referrals.referredUsers": arrayUnion([newUserUid]),
  });
}
