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

async function deepSearch() {
  const commonNames = [
    "expense", "expenses", "shopping", "shoppingItems", "shopping_list", 
    "settlements", "settlement", "cooking", "cookingSchedule", "cookingSchedules",
    "notice", "notices", "history", "logs", "transactions", "personalTrades",
    "groupActivity", "joinRequests", "notifications", "activities"
  ];

  console.log("--- Deep Database Search ---");
  for (const name of commonNames) {
    try {
      const snap = await getDocs(collection(db, name));
      if (snap.size > 0) {
        console.log(`✅ Collection Found: ${name} (${snap.size} docs)`);
        const groupCounts: Record<string, number> = {};
        snap.forEach(d => {
          const gid = d.data().groupId || "ORPHAN";
          groupCounts[gid] = (groupCounts[gid] || 0) + 1;
        });
        for (const [gid, count] of Object.entries(groupCounts)) {
          console.log(`   -> Group [${gid}]: ${count} docs`);
        }
      }
    } catch (e) {
      // Ignore errors for non-existent collections
    }
  }
}

deepSearch().catch(console.error);
