import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, arrayUnion
} from "firebase/firestore";
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

const TARGET_STUDENT_ID = "202617310";
const REAL_GROUP = "legacy_group_1774529896924";
const WRONG_GROUP = "legacy_group_permanent";

async function run() {
  console.log("🔍 Scanning users...");
  const usersSnap = await getDocs(collection(db, "users"));
  let ownerUid = "";
  
  usersSnap.forEach(d => {
    if (d.data().studentId === TARGET_STUDENT_ID) {
      ownerUid = d.id;
    }
  });

  if (!ownerUid) {
    console.log("⚠️ Target user not found.");
    return;
  }

  console.log(`✅ Target user UID: ${ownerUid}`);

  console.log(`🛠️ Re-assigning ownership to real group: ${REAL_GROUP}`);
  await updateDoc(doc(db, "groups", REAL_GROUP), {
    ownerId: ownerUid,
    [`memberRoles.${ownerUid}`]: "owner"
  });

  // Rebind all users exactly to the real group
  for (const d of usersSnap.docs) {
      await updateDoc(doc(db, "users", d.id), {
          currentGroupId: REAL_GROUP,
          groupsJoined: arrayUnion(REAL_GROUP)
      });
  }

  async function patchCollection(colName: string) {
    console.log(`📦 Relocating data in: ${colName}`);
    const snap = await getDocs(collection(db, colName));
    let updated = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (data.groupId === WRONG_GROUP || !data.groupId) {
        await updateDoc(doc(db, colName, d.id), { groupId: REAL_GROUP });
        updated++;
      }
    }
    console.log(`   ✅ Moved ${updated} items.`);
  }

  await patchCollection("expenses");
  await patchCollection("settlements");
  await patchCollection("shoppingItems");
  await patchCollection("notices");
  await patchCollection("cookingSchedules");
  
  try { await patchCollection("cookingSchedule"); } catch(e) {}

  console.log(`🗑️ Deleting the invalid artificial group...`);
  try {
    await deleteDoc(doc(db, "groups", WRONG_GROUP));
    console.log("   ✅ Deleted.");
  } catch (e) {
    console.log("   Failed to delete, might already be gone.");
  }

  console.log("\n🎉 ALL data and ownership correctly restored to the original group 'CDS'!");
}

run().catch(console.error);
