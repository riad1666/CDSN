import { collection, query, orderBy, onSnapshot, getDocs, addDoc, updateDoc, doc, where, limit, arrayRemove, arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./config";

// --- NOTICES ---
export interface Notice {
  id: string;
  groupId?: string; // Optional for global notices
  title: string;
  message: string;
  type: "IMPORTANT" | "INFO" | "WARNING";
  createdAt: string;
  isDeleted?: boolean;
}

export const subscribeToNotices = (callback: (notices: Notice[]) => void, groupId?: string) => {
  const q = groupId 
    ? query(collection(db, "notices"), where("groupId", "==", groupId), orderBy("createdAt", "desc"))
    : query(collection(db, "notices"), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const notices: Notice[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        notices.push({ id: doc.id, ...data } as Notice);
      }
    });
    callback(notices);
  });
};

// --- USERS ---
export interface UserBasicInfo {
  uid: string;
  name: string;
  studentId: string;
  profileImage: string;
  room: string;
  whatsapp: string;
  role: "user" | "admin" | "superadmin";
  dob?: string;
  status: "pending" | "approved" | "rejected";
}

export async function searchUsersByStudentId(studentId: string): Promise<UserBasicInfo[]> {
  const q = query(collection(db, "users"), where("studentId", "==", studentId), where("status", "==", "approved"), limit(5));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserBasicInfo));
}

export async function getGroupMembers(groupId: string): Promise<UserBasicInfo[]> {
  const q = query(collection(db, "users"), where("groupsJoined", "array-contains", groupId), where("status", "==", "approved"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserBasicInfo));
}

export async function getUserGroups(groupIds: string[]): Promise<any[]> {
    if (!groupIds || groupIds.length === 0) return [];
    // Firestore 'in' query supports up to 10-30 IDs usually
    const q = query(collection(db, "groups"), where("__name__", "in", groupIds), where("isDeleted", "==", false));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function findOrCreatePersonalTrade(uid1: string, uid2: string): Promise<string> {
  const participants = [uid1, uid2].sort();
  const q = query(collection(db, "personalTrades"), where("participants", "==", participants));
  const snap = await getDocs(q);
  
  if (!snap.empty) return snap.docs[0].id;
  
  const docRef = await addDoc(collection(db, "personalTrades"), {
    participants,
    totalBalance: 0,
    lastActivity: new Date().toISOString(),
    transactions: [],
    isDeleted: false
  });
  return docRef.id;
}

export const getApprovedUsers = async (): Promise<UserBasicInfo[]> => {
  const q = query(collection(db, "users"), where("status", "==", "approved"));
  const snapshot = await getDocs(q);
  const users: UserBasicInfo[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    users.push({ 
      uid: doc.id, 
      name: data.name, 
      studentId: data.studentId,
      profileImage: data.profileImage, 
      room: data.room, 
      whatsapp: data.whatsapp, 
      role: data.role,
      dob: data.dob,
      status: data.status
    });
  });
  return users;
};

// --- EXPENSES ---
export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string; // uid
  splitBetween: string[]; // uids
  date: string;
  receipts: string[];
  isDeleted: boolean;
}

export const subscribeToExpenses = (callback: (expenses: Expense[]) => void, groupId: string) => {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        expenses.push({ id: doc.id, ...data } as Expense);
      }
    });
    callback(expenses);
  });
};

// --- SETTLEMENTS ---
export interface Settlement {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  status: "pending" | "accepted" | "rejected";
  date: string;
  isDeleted: boolean;
}

export const subscribeToSettlements = (callback: (settlements: Settlement[]) => void, groupId: string) => {
  const q = query(collection(db, "settlements"), where("groupId", "==", groupId), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const settlements: Settlement[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        settlements.push({ id: doc.id, ...data } as Settlement);
      }
    });
    callback(settlements);
  });
};

// --- GROUPS ---
export interface Group {
  id: string;
  name: string;
  profileImage: string;
  inviteCode: string;
  totalExpense: number;
  ownerId: string;
  createdAt: string;
  isDeleted: boolean;
  memberIds: string[];
  memberRoles: Record<string, "owner" | "admin" | "member">;
}

export interface GroupMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export const subscribeToUserGroups = (uid: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, "groups"), where("isDeleted", "==", false), where("memberIds", "array-contains", uid));
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() } as Group);
    });
    callback(groups);
  });
};

// --- PERSONAL TRADES ---
export interface PersonalTrade {
  id: string;
  participants: string[]; // [uid1, uid2]
  totalBalance: number; // Balance from uid1 perspective (uid1_owes - uid2_owes)
  lastActivity: string;
}

export const subscribeToPersonalTrades = (uid: string, callback: (trades: PersonalTrade[]) => void) => {
  const q = query(collection(db, "personalTrades"), where("participants", "array-contains", uid), orderBy("lastActivity", "desc"));
  return onSnapshot(q, (snapshot) => {
    const trades: PersonalTrade[] = [];
    snapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() } as PersonalTrade);
    });
    callback(trades);
  });
};

// --- NOTIFICATIONS ---
export interface AppNotification {
  id: string;
  userId: string;
  type: "EXPENSE_ADDED" | "SETTLEMENT_REQUEST" | "INVITE_RECEIVED" | "REQUEST_APPROVED" | "NOTICE_ADDED";
  message: string;
  data: any;
  status: "unread" | "read";
  createdAt: string;
}

export const subscribeToNotifications = (uid: string, callback: (notifications: AppNotification[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as AppNotification);
    });
    callback(notifications);
  });
};

// --- JOIN REQUESTS ---
export interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export async function sendJoinRequest(groupId: string, userId: string): Promise<void> {
  // Check if a pending request already exists
  const existing = await getDocs(query(
    collection(db, "joinRequests"),
    where("groupId", "==", groupId),
    where("userId", "==", userId),
    where("status", "==", "pending")
  ));
  if (!existing.empty) throw new Error("You already have a pending request for this group.");

  await addDoc(collection(db, "joinRequests"), {
    groupId,
    userId,
    status: "pending",
    createdAt: new Date().toISOString(),
    isDeleted: false,
  });
}

export function subscribeToJoinRequests(groupId: string, callback: (requests: JoinRequest[]) => void) {
  const q = query(
    collection(db, "joinRequests"),
    where("groupId", "==", groupId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest)));
  });
}

export async function approveJoinRequest(requestId: string, groupId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "joinRequests", requestId), { status: "approved" });
  await updateDoc(doc(db, "groups", groupId), { memberIds: arrayUnion(userId) });
  await updateDoc(doc(db, "users", userId), {
    groupsJoined: arrayUnion(groupId),
    currentGroupId: groupId,
  });
  await writeNotification(userId, "REQUEST_APPROVED", "Your request to join the group was approved!", { groupId });
  await writeGroupActivity(groupId, "member_joined", `New member joined the group.`, userId);
}

export async function rejectJoinRequest(requestId: string, userId: string, groupId: string): Promise<void> {
  await updateDoc(doc(db, "joinRequests", requestId), { status: "rejected" });
  await writeNotification(userId, "REQUEST_APPROVED", "Your request to join the group was rejected.", { groupId });
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { memberIds: arrayRemove(userId) });
  await updateDoc(doc(db, "users", userId), {
    groupsJoined: arrayRemove(groupId),
    currentGroupId: null,
  });
  await writeGroupActivity(groupId, "member_left", `A member left the group.`, userId);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { memberIds: arrayRemove(userId) });
  await updateDoc(doc(db, "users", userId), { groupsJoined: arrayRemove(groupId) });
  await writeGroupActivity(groupId, "member_removed", `A member was removed from the group.`, userId);
}

// --- NOTIFICATIONS ---
export async function writeNotification(
  userId: string,
  type: "EXPENSE_ADDED" | "SETTLEMENT_REQUEST" | "INVITE_RECEIVED" | "REQUEST_APPROVED" | "NOTICE_ADDED",
  message: string,
  data: any = {}
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      message,
      data,
      status: "unread",
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Failed to write notification:", e);
  }
}

// --- GROUP ACTIVITY LOG ---
export interface ActivityLog {
  id: string;
  groupId: string;
  type: string;
  message: string;
  actorId?: string;
  createdAt: string;
}

export async function writeGroupActivity(groupId: string, type: string, message: string, actorId?: string): Promise<void> {
  try {
    await addDoc(collection(db, "groupActivity"), {
      groupId,
      type,
      message,
      actorId: actorId || null,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Failed to write group activity:", e);
  }
}

export function subscribeToGroupActivity(groupId: string, callback: (logs: ActivityLog[]) => void) {
  const q = query(
    collection(db, "groupActivity"),
    where("groupId", "==", groupId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
  });
}
