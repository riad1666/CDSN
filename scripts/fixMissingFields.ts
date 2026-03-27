import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, updateDoc, doc
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

async function run() {
  async function ensureFields(colName: string) {
    console.log(`📦 Patching missing fields in: ${colName}`);
    let updated = 0;
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        const data = d.data();
        let changes: any = {};
        
        if (data.isDeleted === undefined) {
          changes.isDeleted = false;
        }
        
        if (Object.keys(changes).length > 0) {
          await updateDoc(doc(db, colName, d.id), changes);
          updated++;
        }
      }
      console.log(`   ✅ Patched ${updated} items in ${colName}.`);
    } catch(e) {
      console.log(`   ⚠️ Failed to read ${colName}`);
    }
  }

  await ensureFields("expenses");
  await ensureFields("settlements");
  await ensureFields("shoppingItems");
  await ensureFields("notices");
  await ensureFields("cookingSchedules");
  await ensureFields("groups");

  console.log("\n🎉 ALL data successfully patched with isDeleted: false flag!");
}

run().catch(console.error);
