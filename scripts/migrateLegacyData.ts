/**
 * Run with: npx tsx scripts/migrateLegacyData.ts
 *
 * Links ALL existing expenses, shoppingItems, and settlements that have
 * no groupId (or wrong groupId) to the "Legacy Group".
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, updateDoc, doc, query, where
} from "firebase/firestore";
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

async function migrate() {
  // 1. Find the Legacy Group
  console.log("🔍 Finding Legacy Group...");
  const groupsSnap = await getDocs(collection(db, "groups"));
  let legacyGroupId = "";
  groupsSnap.forEach(d => {
    const data = d.data();
    if (!data.isDeleted && (data.memberIds?.length === 4 || data.name?.toLowerCase().includes("legacy"))) {
      legacyGroupId = d.id;
      console.log(`✅ Found: "${data.name}" (${d.id}) with ${data.memberIds?.length} members`);
    }
  });

  if (!legacyGroupId) {
    console.error("❌ Could not find Legacy Group. Run fixGroupOwner.ts first.");
    process.exit(1);
  }

  // Helper: batch-update all docs in a collection missing groupId or with wrong groupId
  async function patchCollection(colName: string) {
    console.log(`\n📦 Processing collection: ${colName}`);
    const snap = await getDocs(collection(db, colName));
    let updated = 0;
    let skipped = 0;

    for (const d of snap.docs) {
      const data = d.data();
      // Patch if: no groupId, or groupId is empty string, or groupId is different from legacyGroupId
      // but we don't override documents that already have a valid, different groupId
      const hasGroupId = data.groupId && data.groupId.trim() !== "";
      if (!hasGroupId) {
        await updateDoc(doc(db, colName, d.id), { groupId: legacyGroupId });
        updated++;
        process.stdout.write(".");
      } else {
        skipped++;
      }
    }
    console.log(`\n  ✅ Updated: ${updated}, Skipped (already has groupId): ${skipped}`);
  }

  await patchCollection("expenses");
  await patchCollection("settlements");
  await patchCollection("shoppingItems");

  // Also patch notices that have no groupId
  console.log(`\n📦 Processing collection: notices`);
  const noticesSnap = await getDocs(collection(db, "notices"));
  let noticeUpdated = 0;
  for (const d of noticesSnap.docs) {
    const data = d.data();
    if (!data.groupId) {
      await updateDoc(doc(db, "notices", d.id), { groupId: legacyGroupId });
      noticeUpdated++;
    }
  }
  console.log(`  ✅ Updated: ${noticeUpdated} notices`);

  // Also patch cooking schedule
  console.log(`\n📦 Processing collection: cookingSchedule`);
  const cookSnap = await getDocs(collection(db, "cookingSchedule"));
  let cookUpdated = 0;
  for (const d of cookSnap.docs) {
    const data = d.data();
    if (!data.groupId) {
      await updateDoc(doc(db, "cookingSchedule", d.id), { groupId: legacyGroupId });
      cookUpdated++;
    }
  }
  console.log(`  ✅ Updated: ${cookUpdated} cooking records`);

  console.log("\n🎉 Migration complete! All legacy data linked to: " + legacyGroupId);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
