// firebase/firestore.ts
import { getFirestore } from "firebase/firestore";
import { app } from "./firebaseConfig";

export const db = getFirestore(app);

