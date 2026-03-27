import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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

async function findAllDataAndGroups() {
  console.log("--- Comprehensive Audit of all Database Collections ---");
  
  // 1. All Groups
  const groupSnap = await getDocs(collection(db, "groups"));
  console.log(`\nFound ${groupSnap.size} groups:`);
  groupSnap.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id} | Name: "${data.name}" | Members: ${data.memberIds?.length || 0} | isDeleted: ${data.isDeleted}`);
  });

  // 2. Collection scans
  const collections = ["expenses", "shopping", "shoppingItems", "settlements", "cookingSchedules", "notices"];
  
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    console.log(`\nCollection: ${colName} (${snap.size} docs)`);
    if (snap.size > 0) {
      const counts: Record<string, number> = {};
      snap.forEach(d => {
        const gid = d.data().groupId || "NONE";
        counts[gid] = (counts[gid] || 0) + 1;
      });
      for (const [gid, count] of Object.entries(counts)) {
        console.log(`  -> Group [${gid}]: ${count} docs`);
      }
    }
  }

  // 3. Check current user status (assuming the user is the one reporting)
  // We'll look for all users and see what group they are in
  const userSnap = await getDocs(collection(db, "users"));
  console.log(`\nFound ${userSnap.size} users:`);
  userSnap.forEach(d => {
    const data = d.data();
    console.log(`- User: ${data.name} (${d.id}) | currentGroupId: ${data.currentGroupId} | groupsJoined: ${JSON.stringify(data.groupsJoined)}`);
  });
}

findAllDataAndGroups().catch(console.error);
