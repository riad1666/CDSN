/**
 * Run with: npx tsx scripts/fixGroupOwner.ts
 * 
 * This script finds the user with studentId 202617310 and the existing
 * group with 4 members, then sets that user as the group owner.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
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

async function fixGroupOwner() {
  console.log("🔍 Finding user with studentId: 202617310...");

  // 1. Find the user
  const userQuery = query(
    collection(db, "users"),
    where("studentId", "==", "202617310")
  );
  const userSnap = await getDocs(userQuery);

  if (userSnap.empty) {
    console.error("❌ No user found with studentId 202617310");
    process.exit(1);
  }

  const ownerDoc = userSnap.docs[0];
  const ownerId = ownerDoc.id;
  const ownerData = ownerDoc.data();
  console.log(`✅ Found owner: ${ownerData.name} (uid: ${ownerId})`);

  // 2. Find all active groups
  console.log("\n🔍 Finding groups...");
  const groupSnap = await getDocs(collection(db, "groups"));

  const groups: any[] = [];
  groupSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) {
      groups.push({ id: d.id, ...data });
      console.log(`  Group: "${data.name}" | Members: ${data.memberIds?.length ?? 0} | Owner: ${data.ownerId}`);
    }
  });

  // 3. Find the group with 4 members
  const targetGroup = groups.find((g) => g.memberIds?.length === 4);
  if (!targetGroup) {
    // Fallback: pick the first active group
    const fallback = groups[0];
    if (!fallback) {
      console.error("❌ No active groups found.");
      process.exit(1);
    }
    console.log(`\n⚠️  No group with exactly 4 members found. Using first group: "${fallback.name}"`);
    await applyOwner(db, fallback, ownerId);
  } else {
    console.log(`\n✅ Targeting group: "${targetGroup.name}" (${targetGroup.id})`);
    await applyOwner(db, targetGroup, ownerId);
  }

  // 4. Update user's currentGroupId and groupsJoined
  const userGroupsJoined: string[] = ownerData.groupsJoined || [];
  const groupId = targetGroup?.id || groups[0]?.id;
  if (!userGroupsJoined.includes(groupId)) {
    userGroupsJoined.push(groupId);
  }
  await updateDoc(doc(db, "users", ownerId), {
    currentGroupId: groupId,
    groupsJoined: userGroupsJoined,
  });
  console.log(`✅ Updated user's currentGroupId to: ${groupId}`);
  console.log("\n🎉 Done!");
}

async function applyOwner(db: any, group: any, ownerId: string) {
  const memberRoles: Record<string, string> = { ...(group.memberRoles || {}) };

  // Demote previous owner(s) to member if they exist
  for (const [uid, role] of Object.entries(memberRoles)) {
    if (role === "owner" && uid !== ownerId) {
      memberRoles[uid] = "member";
      console.log(`  ↓ Demoted previous owner: ${uid} -> member`);
    }
  }

  // Set new owner
  memberRoles[ownerId] = "owner";

  // Ensure owner is in memberIds
  const memberIds: string[] = [...(group.memberIds || [])];
  if (!memberIds.includes(ownerId)) {
    memberIds.push(ownerId);
    console.log(`  ➕ Added owner to memberIds`);
  }

  await updateDoc(doc(db, "groups", group.id), {
    ownerId,
    memberRoles,
    memberIds,
  });
  console.log(`✅ Group "${group.name}" updated — owner set to ${ownerId}`);
}

fixGroupOwner().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
