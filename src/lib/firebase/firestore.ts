import { collection, query, orderBy, onSnapshot, getDocs, addDoc, updateDoc, doc, where } from "firebase/firestore";
import { db } from "./config";

// --- NOTICES ---
export interface Notice {
  id: string;
  title: string;
  message: string;
  type: "IMPORTANT" | "INFO" | "WARNING";
  createdAt: string;
}

export const subscribeToNotices = (callback: (notices: Notice[]) => void) => {
  const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const notices: Notice[] = [];
    snapshot.forEach((doc) => {
      notices.push({ id: doc.id, ...doc.data() } as Notice);
    });
    callback(notices);
  });
};

// --- USERS ---
export interface UserBasicInfo {
  uid: string;
  name: string;
  profileImage: string;
  room: string;
  whatsapp: string;
}

export const getApprovedUsers = async (): Promise<UserBasicInfo[]> => {
  const q = query(collection(db, "users"), where("status", "==", "approved"), where("role", "==", "user"));
  const snapshot = await getDocs(q);
  const users: UserBasicInfo[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    users.push({ uid: doc.id, name: data.name, profileImage: data.profileImage, room: data.room, whatsapp: data.whatsapp });
  });
  return users;
};

// --- EXPENSES ---
export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string; // uid
  splitBetween: string[]; // uids
  date: string;
  receipts: string[];
}

export const subscribeToExpenses = (callback: (expenses: Expense[]) => void) => {
  const q = query(collection(db, "expenses"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() } as Expense);
    });
    callback(expenses);
  });
};

// --- SETTLEMENTS ---
export interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  status: "pending" | "accepted" | "rejected";
  date: string;
}

export const subscribeToSettlements = (callback: (settlements: Settlement[]) => void) => {
  const q = query(collection(db, "settlements"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const settlements: Settlement[] = [];
    snapshot.forEach((doc) => {
      settlements.push({ id: doc.id, ...doc.data() } as Settlement);
    });
    callback(settlements);
  });
};
