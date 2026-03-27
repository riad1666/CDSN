import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, listCollections } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Note: listCollections is only available in the admin SDK or via node-firestore, 
// using firebase-admin for this check for clarity.
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
  });
}

const db = admin.firestore();

async function listAllCollections() {
  const collections = await db.listCollections();
  console.log("Found collections:");
  for (const col of collections) {
    const snap = await col.get();
    console.log(`- ${col.id} (${snap.size} docs)`);
  }
}

listAllCollections().catch(console.error);
