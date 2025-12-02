import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth } from "../firebase/firebaseConfig";
import { startMining, stopMining, claimMiningRewards } from "../firebase/mining";
import { MiningData } from "../firebase/types";

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMiningData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        const data = snap.data();
        setMiningData(data?.mining || null);
        setIsLoading(false);
      }
    };
    fetchMiningData();
  }, []);

  const start = async () => {
    if (auth.currentUser) {
      await startMining(auth.currentUser.uid);
      setMiningData((prevState) => {
        if (prevState) {
          return { ...prevState, miningActive: true };
        }
        return { miningActive: true, lastStart: null, lastClaim: null, balance: 0 }; // Default state
      });
    }
  };

  const stop = async () => {
    if (auth.currentUser) {
      await stopMining(auth.currentUser.uid);
      setMiningData((prevState) => {
        if (prevState) {
          return { ...prevState, miningActive: false };
        }
        return { miningActive: false, lastStart: null, lastClaim: null, balance: 0 }; // Default state
      });
    }
  };

  const claim = async () => {
    if (auth.currentUser) {
      const reward = await claimMiningRewards(auth.currentUser.uid);
      setMiningData((prevState) => {
        if (prevState) {
          return { ...prevState, balance: prevState.balance + reward };
        }
        return { balance: reward, miningActive: false, lastStart: null, lastClaim: null }; // Default state
      });
    }
  };

  return {
    miningData,
    isLoading,
    start,
    stop,
    claim,
  };
}
