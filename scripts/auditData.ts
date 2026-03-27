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

async function checkAllData() {
  const collections = ["expenses", "shoppingItems", "settlements", "notices", "cookingSchedules"];
  console.log("--- Comprehensive Data Audit ---");
  
  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    console.log(`\nCollection: ${col} (Total: ${snap.size})`);
    
    const groupMap: Record<string, number> = {};
    snap.forEach(doc => {
      const gid = doc.data().groupId || "MISSING";
      groupMap[gid] = (groupMap[gid] || 0) + 1;
    });
    
    for (const [gid, count] of Object.entries(groupMap)) {
      console.log(`  - Group [${gid}]: ${count} items`);
    }
  }
}

checkAllData().catch(console.error);
