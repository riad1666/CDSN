import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
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

async function diagnose() {
  console.log("🔍 Starting Deep Diagnosis...");

  // 1. Check the "CDS" Group
  const groupId = "legacy_group_1774529896924";
  const groupDoc = await getDoc(doc(db, "groups", groupId));
  
  if (!groupDoc.exists()) {
    console.error(`❌ Group ${groupId} NOT FOUND in Firestore!`);
  } else {
    const data = groupDoc.data();
    console.log(`✅ Group Found: "${data.name}"`);
    console.log(`   Members: ${JSON.stringify(data.memberIds)}`);
    console.log(`   isDeleted: ${data.isDeleted}`);
  }

  // 2. Check a sample expense
  const expenseQuery = query(collection(db, "expenses"), where("groupId", "==", groupId));
  const expenseSnap = await getDocs(expenseQuery);
  console.log(`📊 Expenses found for this group: ${expenseSnap.size}`);
  if (expenseSnap.size > 0) {
    const first = expenseSnap.docs[0].data();
    console.log(`   Sample Expense: ${first.title} - Amount: ${first.amount} - isDeleted: ${first.isDeleted}`);
  }

  // 3. Check common users
  const userIds = ["DLvVmiylbhWzFgs46U1AdBbt2nx1", "SQ6MimqUW5UbSE7xqJGPl5l2aWW2"];
  for (const uid of userIds) {
    const uDoc = await getDoc(doc(db, "users", uid));
    if (uDoc.exists()) {
      const uData = uDoc.data();
      console.log(`👤 User ${uid} (${uData.name}): currentGroupId = ${uData.currentGroupId}, groupsJoined = ${JSON.stringify(uData.groupsJoined)}`);
    } else {
      console.log(`👤 User ${uid} NOT FOUND`);
    }
  }
}

diagnose().catch(console.error);
