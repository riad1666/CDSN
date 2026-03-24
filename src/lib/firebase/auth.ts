import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "./config";

export interface RegisterData {
  name: string;
  email: string;
  whatsapp: string;
  room: string;
  studentId: string;
  dob: string;
  password?: string;
  profileImage?: string;
}

export const registerUser = async (data: RegisterData, imageFile: File) => {
  if (!data.password) throw new Error("Password is required");

  console.log("STEP 1: Creating auth user...");
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const user = userCredential.user;
  console.log("STEP 2: Auth complete. UID:", user.uid);

  try {
    console.log("STEP 3: Checking Firestore for unique student ID...");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("studentId", "==", data.studentId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Student ID is already registered.");
    }

    console.log("STEP 4: Uniqueness verified. Uploading Image to Storage...");
    const { uploadProfileImage } = await import("./storage");
    const imageUrl = await uploadProfileImage(imageFile, data.studentId);
    console.log("STEP 5: Image uploaded!", imageUrl);

    console.log("STEP 6: Saving document to Firestore...");
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      name: data.name,
      email: data.email,
      whatsapp: data.whatsapp,
      room: data.room,
      studentId: data.studentId,
      dob: data.dob,
      profileImage: imageUrl,
      role: "user",
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    console.log("STEP 7: Document saved. Signing out.");
    await firebaseSignOut(auth);
    return user;
  } catch (error) {
    console.error("FIREBASE ERROR ENCOUNTERED:", error);
    await user.delete().catch(() => {});
    await firebaseSignOut(auth).catch(() => {});
    throw error;
  }
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
    
    // Check if banned
    if (userData.bannedUntil && new Date(userData.bannedUntil) > new Date()) {
      await firebaseSignOut(auth);
      throw new Error("You're Temporary BAN for violating rules.");
    }

    if (userData.status === "pending") {
      await firebaseSignOut(auth);
      throw new Error("Your account is under review. Please wait for admin approval.");
    }
    if (userData.status === "rejected") {
      await firebaseSignOut(auth);
      throw new Error("Your account was rejected. Please contact the admin.");
    }
  } else {
    // If no document exists, they were deleted by the admin
    await firebaseSignOut(auth);
    throw new Error("User record not found. Your account may have been permanently deleted.");
  }

  return credential;
};

export const logoutUser = async () => {
  return firebaseSignOut(auth);
};

export const changePasswordUser = async (oldPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user");

  // Re-authenticate
  const credential = EmailAuthProvider.credential(user.email, oldPassword);
  await reauthenticateWithCredential(user, credential);

  // Update password
  await updatePassword(user, newPassword);
};
