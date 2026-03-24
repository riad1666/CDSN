import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "./config";

export interface RegisterData {
  name: string;
  email: string;
  whatsapp: string;
  room: string;
  studentId: string;
  password?: string;
  profileImage: string;
}

export const registerUser = async (data: RegisterData) => {
  if (!data.password) throw new Error("Password is required");

  // Check if student ID is unique
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("studentId", "==", data.studentId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("Student ID is already registered.");
  }

  // Create auth user
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const user = userCredential.user;

  // Create user document in Firestore
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, {
    name: data.name,
    email: data.email,
    whatsapp: data.whatsapp,
    room: data.room,
    studentId: data.studentId,
    profileImage: data.profileImage || "",
    role: "user",
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Sign out immediately because they are "pending"
  await firebaseSignOut(auth);

  return user;
};

export const loginUser = async (loginId: string, password: string) => {
  let email = loginId;
  
  // Admin Auto-Seeding Logic
  if (loginId === "admin" || loginId === "admin@cds.com") {
    email = "admin@cds.com";
    if (password !== "4526491#") throw new Error("Invalid admin credentials");
    
    // Check if the admin document exists in Firestore
    const usersRef = collection(db, "users");
    const qAdmin = query(usersRef, where("email", "==", "admin@cds.com"));
    const adminSnap = await getDocs(qAdmin);
    
    if (adminSnap.empty) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, "admin@cds.com", "4526491#");
        await setDoc(doc(db, "users", cred.user.uid), {
          name: "System Admin",
          email: "admin@cds.com",
          studentId: "admin",
          whatsapp: "System",
          room: "Admin",
          profileImage: "",
          role: "admin",
          status: "approved",
          createdAt: new Date().toISOString()
        });
        return cred;
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(auth, "admin@cds.com", "4526491#");
          await setDoc(doc(db, "users", cred.user.uid), {
            name: "System Admin",
            email: "admin@cds.com",
            studentId: "admin",
            whatsapp: "System",
            room: "Admin",
            profileImage: "",
            role: "admin",
            status: "approved",
            createdAt: new Date().toISOString()
          });
          return cred;
        }
        throw err;
      }
    } else {
      // Just login normally bypassing student ID check
      const cred = await signInWithEmailAndPassword(auth, "admin@cds.com", "4526491#");
      return cred;
    }
  }

  // If loginId is not an email, assume it's a student ID and find the email
  if (!loginId.includes("@")) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("studentId", "==", loginId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("User not found with this Student ID.");
    }
    
    // Get the email from the corresponding user document
    email = querySnapshot.docs[0].data().email;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  
  // Check user status before allowing login
  const usersRef = collection(db, "users");
  const qStatus = query(usersRef, where("email", "==", email));
  const statusSnapshot = await getDocs(qStatus);
  
  if (!statusSnapshot.empty) {
    const userData = statusSnapshot.docs[0].data();
    if (userData.status === "pending") {
      await firebaseSignOut(auth);
      throw new Error("Your account is under review. Please wait for admin approval.");
    }
    if (userData.status === "rejected") {
      await firebaseSignOut(auth);
      throw new Error("Your account was rejected. Please contact the admin.");
    }
  }

  return credential;
};

export const logoutUser = async () => {
  return firebaseSignOut(auth);
};
