import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugData() {
  console.log("--- GROUPS ---");
  const groupsSnap = await getDocs(collection(db, "groups"));
  groupsSnap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id} | Name: ${data.name} | Members: ${data.memberIds?.length} | Owner: ${data.ownerId} | Deleted: ${data.isDeleted}`);
  });

  console.log("\n--- USERS ---");
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id.substring(0, 8)}... | Name: ${data.name} | UID: ${data.studentId} | CurrentGroup: ${data.currentGroupId}`);
  });

  const collectionsToCheck = ["expenses", "shoppingItems", "settlements", "cookingSchedules", "notices"];
  
  for (const col of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, col));
      const groupCounts: Record<string, number> = {};
      snap.forEach(d => {
        const gid = d.data().groupId || "MISSING";
        groupCounts[gid] = (groupCounts[gid] || 0) + 1;
      });
      console.log(`\n--- ${col.toUpperCase()} (${snap.size} total) ---`);
      Object.entries(groupCounts).forEach(([gid, count]) => {
        console.log(`GroupID: ${gid} -> ${count} items`);
      });
    } catch (e) {
      console.log(`Error reading ${col}`);
    }
  }
}

debugData().catch(console.error);
