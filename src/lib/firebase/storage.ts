import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

export const uploadProfileImage = async (file: File, uid: string) => {
  const imageRef = ref(storage, `profiles/${uid}_${file.name}`);
  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
};

export const uploadReceipts = async (files: File[], expenseId: string) => {
  const urls = await Promise.all(
    files.map(async (file, index) => {
      const receiptRef = ref(storage, `receipts/${expenseId}_${index}_${file.name}`);
      await uploadBytes(receiptRef, file);
      return getDownloadURL(receiptRef);
    })
  );
  return urls;
};
