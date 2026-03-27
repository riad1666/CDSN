/**
 * Run with: npx tsx scripts/migrateLegacyData.ts
 *
 * Re-creates the Legacy Group explicitly with specific members if it's missing,
 * sets the owner to 202617310, and links all orphaned data exactly.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, updateDoc, doc, setDoc, arrayUnion
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

const TARGET_STUDENT_ID = "202617310";
const LEGACY_GROUP_ID = "legacy_group_permanent";

async function migrate() {
  console.log("🔍 Scanning users...");
  const usersSnap = await getDocs(collection(db, "users"));
  let ownerUid = "";
  let memberIds: string[] = [];
  
  usersSnap.forEach(d => {
    const data = d.data();
    memberIds.push(d.id);
    if (data.studentId === TARGET_STUDENT_ID) {
      ownerUid = d.id;
    }
  });

  if (!ownerUid) {
    console.warn(`⚠️ Warning: Owner with student ID ${TARGET_STUDENT_ID} not found in DB! Using first available user as owner fallback...`);
    ownerUid = memberIds[0];
  }

  // 1. Force explicitly create or update Legacy Group
  console.log("🛠️ Establishing Legacy Group...");
  await setDoc(doc(db, "groups", LEGACY_GROUP_ID), {
    name: "Legacy Group",
    inviteCode: "LEGACY",
    ownerId: ownerUid,
    memberIds: memberIds,
    memberRoles: { [ownerUid]: "owner" },
    totalExpense: 0,
    createdAt: new Date().toISOString(),
    isDeleted: false,
    profileImage: ""
  }, { merge: true });

  console.log(`✅ Group "${LEGACY_GROUP_ID}" secured. Owner UID: ${ownerUid}`);

  // Update all users so they default to this group
  console.log("📦 Binding users to legacy group...");
  for (const uid of memberIds) {
    await updateDoc(doc(db, "users", uid), {
      currentGroupId: LEGACY_GROUP_ID,
      groupsJoined: arrayUnion(LEGACY_GROUP_ID)
    });
  }

  // Helper: batch-update all docs in a collection missing groupId or with wrong/old groupId
  async function patchCollection(colName: string) {
    console.log(`\n📦 Processing collection: ${colName}`);
    const snap = await getDocs(collection(db, colName));
    let updated = 0;
    let skipped = 0;

    for (const d of snap.docs) {
      const data = d.data();
      // We want to force any unlinked or poorly linked items to LEGACY_GROUP_ID.
      // If it's already tied exactly to LEGACY_GROUP_ID, skip it.
      if (data.groupId !== LEGACY_GROUP_ID) {
        await updateDoc(doc(db, colName, d.id), { groupId: LEGACY_GROUP_ID });
        updated++;
        process.stdout.write(".");
      } else {
        skipped++;
      }
    }
    console.log(`\n  ✅ Updated: ${updated}, Skipped (already correct): ${skipped}`);
  }

  // Patch typical app data
  await patchCollection("expenses");
  await patchCollection("settlements");
  await patchCollection("shoppingItems");
  await patchCollection("notices");

  // Fix correctly referencing "cookingSchedules" 
  await patchCollection("cookingSchedules"); 

  // (Optional) Catch old "cookingSchedule" ghost data if any
  try {
     const snap = await getDocs(collection(db, "cookingSchedule"));
     if (!snap.empty) await patchCollection("cookingSchedule");
  } catch(e) {}

  console.log("\n🎉 Migration complete! Platform strictly linked to Legacy Group.");
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
