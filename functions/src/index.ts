import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const changeUserEmail = onCall(async (request) => {
  const { data, auth } = request;

  // 1. Check if caller is authenticated
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Security: Verify caller is a superadmin in Firestore database
  const callerDoc = await admin.firestore().collection("users").doc(auth.uid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.role !== "superadmin") {
    throw new HttpsError("permission-denied", "Only Super Admins can perform this action.");
  }

  const { targetUid, newEmail } = data;

  if (!targetUid || !newEmail) {
    throw new HttpsError("invalid-argument", "Missing targetUid or newEmail.");
  }

  try {
    // 3. Update Firebase Auth
    await admin.auth().updateUser(targetUid, {
      email: newEmail,
    });

    // 4. Update Firestore User Document
    await admin.firestore().collection("users").doc(targetUid).update({
      email: newEmail,
    });

    return { success: true, message: "Email updated successfully." };
  } catch (error: any) {
    console.error("Error updating user email:", error);
    throw new HttpsError("internal", error.message || "Failed to update email.");
  }
});
