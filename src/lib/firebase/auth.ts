import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateEmail,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";

export interface RegisterData {
  name: string;
  email: string;
  whatsapp: string;
  room: string;
  studentId: string;
  dob: string;
  gender: "male" | "female";
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
      gender: data.gender,
      profileImage: imageUrl,
      role: "user",
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    console.log("STEP 7: Sending email verification...");
    const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
    };
    try {
        await sendEmailVerification(user, actionCodeSettings);
    } catch (ve) {
        console.error("VERIFICATION EMAIL FAILED:", ve);
        // We don't throw here to avoid deleting the user just because an email failed.
        // The user can try resending from the login/settings page.
    }

    console.log("STEP 8: Document saved & Email sent. Signing out.");
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
          role: "superadmin",
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
            role: "superadmin",
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
  const user = credential.user;
  const isEmailLogin = loginId.includes("@");

  // 1. Email Verification Check
  if (isEmailLogin && !user.emailVerified) {
    await firebaseSignOut(auth);
    throw new Error("Email not verified. Please verify your email to login with email address, or use your Student ID to login without verification.");
  }

  // 2. Fetch User Data from Firestore
  const usersRef = collection(db, "users");
  const qStatus = query(usersRef, where("email", "==", email));
  const statusSnapshot = await getDocs(qStatus);
  
  if (!statusSnapshot.empty) {
    const userDoc = statusSnapshot.docs[0];
    const userData = userDoc.data();
    
    // 3. Auto-Approval Logic
    // If the user is verified, auto-approve them in Firestore if they are still pending
    if (userData.status === "pending") {
      await updateDoc(doc(db, "users", user.uid), { status: "approved" });
      userData.status = "approved"; // reflect update locally
    }

    // 4. Status checks
    if (userData.bannedUntil && new Date(userData.bannedUntil) > new Date()) {
      await firebaseSignOut(auth);
      throw new Error("You're Temporary BAN for violating rules.");
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

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user found. Please login first.");
  
  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  };
  
  try {
    await sendEmailVerification(user, actionCodeSettings);
  } catch (error: any) {
    console.error("RESEND FAILED:", error);
    if (error.code === "auth/unauthorized-continue-uri") {
        throw new Error("This domain is not authorized for email redirects. Please add it to Firebase Console > Authentication > Settings > Authorized domains.");
    }
    throw error;
  }
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

export const updateUserEmail = async (newEmail: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user found");

  if (!user.emailVerified) {
    // SCENARIO 1: Unverified user correcting a wrong email (mistake at registration)
    try {
      console.log("Correcting unverified email address...");
      // For unverified users, updateEmail is the only way to avoid 'fixing typos' with external verification
      await updateEmail(user, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      await resendVerificationEmail();
    } catch (error: any) {
      console.error("EMAIL SWAP ERROR:", error);
      if (error.code === "auth/operation-not-allowed") {
        throw new Error("Action Blocked: Please enable 'Email link (passwordless sign-in)' OR disable 'Email enumeration protection' in your Firebase Console > Authentication.");
      }
      if (error.code === "auth/requires-recent-login") {
        throw new Error("Please Logout and Login again to verify your identity before changing your email.");
      }
      throw error;
    }
  } else {
    // SCENARIO 2: Verified user changing their secure email
    const actionCodeSettings = {
       url: `${window.location.origin}/settings`,
       handleCodeInApp: true,
    };
    try {
      console.log("Sending verification for new email address...");
      await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);
      
      // We update Firestore so the UI remains in sync with the user's intent
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
    } catch (error: any) {
      console.error("SECURE EMAIL UPDATE ERROR:", error);
      if (error.code === "auth/operation-not-allowed") {
        throw new Error("Action Blocked: Modern email updates require 'Email link (passwordless sign-in)' to be enabled in Firebase Console.");
      }
      throw error;
    }
  }
};

export const resetPasswordUser = async (email: string) => {
  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  };
  return sendPasswordResetEmail(auth, email, actionCodeSettings);
};
