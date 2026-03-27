import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function check() {
  const gs = await getDocs(collection(db, "groups"));
  let out = "Groups Found:\n";
  gs.forEach(d => {
    const data = d.data();
    out += `- ID: ${d.id} | Name: "${data.name}" | Members: ${data.memberIds?.length || 0} | Date: ${data.createdAt}\n`;
  });
  
  fs.writeFileSync(path.join(process.cwd(), "group_debug.txt"), out, "utf8");
  console.log("Written to group_debug.txt");
}
check().catch(console.error);
