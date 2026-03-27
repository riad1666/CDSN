import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function scanForHiddenGroups() {
  const collections = ["expenses", "shopping", "shoppingItems", "settlements", "cookingSchedules", "notices", "cookingSchedule"];
  const ids: Set<string> = new Set();
  
  console.log("--- Scanning for Unknown Group IDs ---");
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(d => {
        const gid = d.data().groupId;
        if (gid) ids.add(gid);
      });
    } catch(e) {}
  }

  console.log("All Unique Group IDs found in transactional data:");
  ids.forEach(id => console.log(`- ${id}`));
}

scanForHiddenGroups().catch(console.error);
