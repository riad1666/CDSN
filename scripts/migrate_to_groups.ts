import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
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
  console.log("Starting migration...");

  // 1. Create Legacy Group
  const legacyGroupId = "legacy_group_" + Date.now();
  const groupRef = doc(db, "groups", legacyGroupId);
  
  await setDoc(groupRef, {
    name: "Legacy Group",
    profileImage: "",
    inviteCode: "LEGACY123",
    totalExpense: 0,
    ownerId: "SYSTEM", // Placeholder
    createdAt: new Date().toISOString(),
    isDeleted: false,
    memberIds: []
  });

  console.log(`Created group: ${legacyGroupId}`);

  // 2. Add all users to the group
  const usersSnap = await getDocs(collection(db, "users"));
  const userIds: string[] = [];
  const userBatch = writeBatch(db);
  
  usersSnap.forEach((userDoc) => {
    userIds.push(userDoc.id);
    userBatch.update(doc(db, "users", userDoc.id), {
      groupsJoined: [legacyGroupId],
      currentGroupId: legacyGroupId
    });
  });
  
  await userBatch.commit();
  await updateDoc(groupRef, { memberIds: userIds });
  console.log(`Migrated ${userIds.length} users to the legacy group.`);

  // 3. Migrate Expenses
  const expensesSnap = await getDocs(collection(db, "expenses"));
  const expenseBatch = writeBatch(db);
  let expenseCount = 0;
  
  expensesSnap.forEach((expDoc) => {
    if (!expDoc.data().groupId) {
      expenseBatch.update(doc(db, "expenses", expDoc.id), {
        groupId: legacyGroupId,
        isDeleted: false
      });
      expenseCount++;
    }
  });
  
  if (expenseCount > 0) await expenseBatch.commit();
  console.log(`Migrated ${expenseCount} expenses.`);

  // 4. Migrate Settlements
  const settlementsSnap = await getDocs(collection(db, "settlements"));
  const settlementBatch = writeBatch(db);
  let settlementCount = 0;
  
  settlementsSnap.forEach((setDoc) => {
    if (!setDoc.data().groupId) {
      settlementBatch.update(doc(db, "settlements", setDoc.id), {
        groupId: legacyGroupId,
        isDeleted: false
      });
      settlementCount++;
    }
  });
  
  if (settlementCount > 0) await settlementBatch.commit();
  console.log(`Migrated ${settlementCount} settlements.`);

  // 5. Migrate Notices
  const noticesSnap = await getDocs(collection(db, "notices"));
  const noticeBatch = writeBatch(db);
  let noticeCount = 0;
  
  noticesSnap.forEach((notDoc) => {
    if (!notDoc.data().groupId) {
      noticeBatch.update(doc(db, "notices", notDoc.id), {
        groupId: legacyGroupId,
        isDeleted: false
      });
      noticeCount++;
    }
  });
  
  if (noticeCount > 0) await noticeBatch.commit();
  console.log(`Migrated ${noticeCount} notices.`);

  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
