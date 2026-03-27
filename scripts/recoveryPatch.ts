import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
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

async function runRecovery() {
  const TARGET_GROUP_ID = "legacy_group_1774529896924";
  console.log(`🚀 Starting Data Recovery for Group: ${TARGET_GROUP_ID}`);

  // 1. Recover Orphaned Shopping
  const shopSnap = await getDocs(collection(db, "shopping"));
  let shopFixed = 0;
  for (const d of shopSnap.docs) {
    const data = d.data();
    if (!data.groupId || data.groupId === "NONE") {
      await updateDoc(doc(db, "shopping", d.id), { groupId: TARGET_GROUP_ID, isDeleted: false });
      shopFixed++;
    }
  }
  console.log(`✅ Fixed ${shopFixed} orphaned shopping items.`);

  // 2. Recover Any Orphaned Expenses
  const expSnap = await getDocs(collection(db, "expenses"));
  let expFixed = 0;
  for (const d of expSnap.docs) {
    const data = d.data();
    if (!data.groupId || data.groupId === "NONE") {
      await updateDoc(doc(db, "expenses", d.id), { groupId: TARGET_GROUP_ID, isDeleted: false });
      expFixed++;
    }
  }
  console.log(`✅ Fixed ${expFixed} orphaned expenses.`);

  // 3. Ensure all members have the currentGroupId set
  const groupDoc = await (await getDocs(collection(db, "groups"))).docs.find(d => d.id === TARGET_GROUP_ID);
  if (groupDoc) {
    const members = groupDoc.data().memberIds || [];
    for (const uid of members) {
      await updateDoc(doc(db, "users", uid), {
        currentGroupId: TARGET_GROUP_ID,
        groupsJoined: arrayUnion(TARGET_GROUP_ID)
      });
      console.log(`👤 Updated User: ${uid}`);
    }
  }

  console.log("\n🎉 DATA RECOVERY COMPLETE!");
}

runRecovery().catch(console.error);
