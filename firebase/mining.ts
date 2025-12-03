import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

// Start Mining
export const startMining = async (uid: string) => {
  const userRef = doc(db, "miningData", uid);
  const miningData = await getDoc(userRef);
  if (miningData.exists()) {
    await updateDoc(userRef, { miningActive: true, lastStart: new Date() });
  }
};

// Stop Mining
export const stopMining = async (uid: string) => {
  const userRef = doc(db, "miningData", uid);
  await updateDoc(userRef, { miningActive: false, lastStop: new Date() });
};

// Claim Mining Rewards
export const claimMiningRewards = async (uid: string) => {
  const userRef = doc(db, "miningData", uid);
  const miningData = await getDoc(userRef);
  if (miningData.exists()) {
    const currentBalance = miningData.data()?.balance || 0;
    const reward = 10; // Example logic: a fixed reward for each claim
    await updateDoc(userRef, { balance: currentBalance + reward, lastClaim: new Date() });
    return reward;
  }
  return 0;
};
