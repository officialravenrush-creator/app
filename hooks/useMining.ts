import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { startMining, stopMining, claimMiningRewards } from "../firebase/mining"; 
import { MiningData, UserProfile } from "../firebase/types";

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);  // State to hold user profile
  const [isLoading, setIsLoading] = useState(true);

  // Fetch mining data and user profile when the user logs in
  useEffect(() => {
    const fetchData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);  // User profile ref
        const userSnap = await getDoc(userRef);

        // Fetch user profile data
        const userProfileData = userSnap.data() as UserProfile;
        setUserProfile(userProfileData);

        const miningRef = doc(db, "miningData", auth.currentUser.uid);  // Mining data ref
        const miningSnap = await getDoc(miningRef);

        // Fetch mining data
        const miningData = miningSnap.data() as MiningData;
        setMiningData(miningData);

        setIsLoading(false);
      }
    };

    fetchData();
  }, []);  // Runs only once after the component mounts

  const start = async () => {
    if (auth.currentUser) {
      await startMining(auth.currentUser.uid);
      setMiningData((prevState) => ({
        ...prevState,
        miningActive: true,
        lastStart: new Timestamp(Date.now() / 1000, 0), // Converting Date to Timestamp
      }));
    }
  };

  const stop = async () => {
    if (auth.currentUser) {
      await stopMining(auth.currentUser.uid);
      setMiningData((prevState) => ({
        ...prevState,
        miningActive: false,
        lastStop: new Timestamp(Date.now() / 1000, 0), // Timestamp when stopped
      }));
    }
  };

  const claim = async () => {
    if (auth.currentUser) {
      const reward = await claimMiningRewards(auth.currentUser.uid);
      setMiningData((prevState) => ({
        ...prevState,
        balance: prevState.balance + reward,
        lastClaim: new Timestamp(Date.now() / 1000, 0),
      }));
    }
  };

  return {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
  };
}
