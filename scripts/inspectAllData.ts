import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function inspect() {
  const output: any = {
    users: [],
    groups: [],
    collections: {}
  };

  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(d => {
    output.users.push({ id: d.id, ...d.data() });
  });

  const groupsSnap = await getDocs(collection(db, "groups"));
  groupsSnap.forEach(d => {
    output.groups.push({ id: d.id, ...d.data() });
  });

  const cols = ["expenses", "shoppingItems", "settlements", "cookingSchedules", "notices", "cookingSchedule"];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, c));
      output.collections[c] = [];
      snap.forEach(d => {
        output.collections[c].push({ id: d.id, ...d.data() });
      });
    } catch(e) {}
  }

  fs.writeFileSync("db_dump.json", JSON.stringify(output, null, 2), "utf8");
  console.log("Database dump saved to db_dump.json");
}

inspect().catch(console.error);
