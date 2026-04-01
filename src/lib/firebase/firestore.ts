import { collection, query, orderBy, onSnapshot, getDocs, addDoc, updateDoc, setDoc, doc, where, limit, arrayRemove, arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore";
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
    ? query(collection(db, "notices"), where("groupId", "==", groupId))
    : query(collection(db, "notices"));
  
  return onSnapshot(q, (snapshot) => {
    const notices: Notice[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        notices.push({ id: doc.id, ...data } as Notice);
      }
    });
    // Sort by createdAt descending
    notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(notices);
  });
};

// --- USERS ---
export interface UserBasicInfo {
  uid: string;
  name: string;
  email?: string;
  studentId: string;
  profileImage: string;
  room: string;
  whatsapp: string;
  role: "user" | "admin" | "superadmin";
  gender: "male" | "female";
  dob?: string;
  status: "pending" | "approved" | "rejected";
  chatMarkers?: Record<string, Timestamp>;
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
      gender: data.gender,
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
  category: "Food" | "Utilities" | "Supplies" | "Kitchen" | "Grocery" | "Other";
  isDeleted: boolean;
}

export const subscribeToExpenses = (callback: (expenses: Expense[]) => void, groupId: string) => {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        expenses.push({ id: doc.id, ...data } as Expense);
      }
    });
    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(expenses);
  });
};

import { deleteDoc } from "firebase/firestore";

export async function updateExpense(expenseId: string, data: Partial<Expense>): Promise<void> {
    await updateDoc(doc(db, "expenses", expenseId), data);
}

export async function deleteExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, "expenses", expenseId));
}

export async function deleteShopping(shoppingId: string): Promise<void> {
    await deleteDoc(doc(db, "shopping", shoppingId));
}



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
  const q = query(collection(db, "settlements"), where("groupId", "==", groupId));
  return onSnapshot(q, (snapshot) => {
    const settlements: Settlement[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        settlements.push({ id: doc.id, ...data } as Settlement);
      }
    });
    // Sort by date descending
    settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  coverImage?: string; // Base64 or URL
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
}

export interface GroupMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export const subscribeToUserGroups = (uid: string, callback: (groups: Group[]) => void, userRole?: string) => {
  const isSuperAdmin = userRole === "superadmin";
  const q = isSuperAdmin
    ? query(collection(db, "groups"), where("isDeleted", "==", false))
    : query(collection(db, "groups"), where("memberIds", "array-contains", uid), where("isDeleted", "==", false));

  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
        groups.push({ ...doc.data(), id: doc.id } as Group);
    });
    callback(groups);
  });
};

export async function createGroup(name: string, ownerUid: string): Promise<string> {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create the group
    const groupRef = await addDoc(collection(db, "groups"), {
        name,
        profileImage: "",
        inviteCode,
        totalExpense: 0,
        ownerId: ownerUid,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        memberIds: [ownerUid],
        memberRoles: { [ownerUid]: "owner" }
    });

    // Update the owner's user document
    await updateDoc(doc(db, "users", ownerUid), {
        groupsJoined: arrayUnion(groupRef.id),
        currentGroupId: groupRef.id
    });

    await writeGroupActivity(groupRef.id, "group_created", `Group "${name}" was created.`, ownerUid);
    
    return groupRef.id;
}

export async function findGroupByCode(code: string): Promise<Group | null> {
    const q = query(collection(db, "groups"), where("inviteCode", "==", code), where("isDeleted", "==", false), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Group;
}

export async function updateGroupInviteCode(groupId: string, newCode: string): Promise<void> {
    // Check uniqueness
    const existing = await findGroupByCode(newCode);
    if (existing && existing.id !== groupId) throw new Error("This Group ID is already taken.");
    
    await updateDoc(doc(db, "groups", groupId), { inviteCode: newCode });
    await writeGroupActivity(groupId, "settings_updated", `Group ID was updated to ${newCode}.`);
}

export async function inviteUserToGroupByStudentId(groupId: string, senderId: string, studentId: string): Promise<void> {
    const users = await searchUsersByStudentId(studentId);
    if (users.length === 0) throw new Error("User not found.");
    const targetUser = users[0];
    
    const groupNameSnap = await getDocs(query(collection(db, "groups"), where("__name__", "==", groupId)));
    const groupName = groupNameSnap.empty ? "a group" : groupNameSnap.docs[0].data().name;

    await writeNotification(targetUser.uid, "INVITE_RECEIVED", `You were invited to join "${groupName}" by Student ID ${studentId}`, { groupId, senderId });
}

// --- PERSONAL TRADES ---
export interface PersonalTrade {
  id: string;
  participants: string[]; // [uid1, uid2]
  totalBalance: number; // Balance from uid1 perspective (uid1_owes - uid2_owes)
  lastActivity: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  isDeleted?: boolean;
}


export const subscribeToPersonalTrades = (uid: string, callback: (trades: PersonalTrade[]) => void, userRole?: string) => {
  const isSuperAdmin = userRole === "superadmin";
  const q = isSuperAdmin
    ? query(collection(db, "personalTrades"), orderBy("lastActivity", "desc"))
    : query(collection(db, "personalTrades"), where("participants", "array-contains", uid), orderBy("lastActivity", "desc"));

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
  const q = query(collection(db, "notifications"), where("userId", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as AppNotification);
    });
    // Sort by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
    // Sort by createdAt descending
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(data);
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

// --- NEW HELPERS ---

export async function deleteCookingSchedule(id: string): Promise<void> {
    await updateDoc(doc(db, "cookingSchedules", id), { isDeleted: true });
}

export async function updateCookingSchedule(id: string, data: any): Promise<void> {
    await updateDoc(doc(db, "cookingSchedules", id), data);
}

export async function updateGroupCoverPhoto(groupId: string, base64: string): Promise<void> {
    await updateDoc(doc(db, "groups", groupId), { coverImage: base64 });
}

export async function updateGroupProfileImage(groupId: string, base64: string): Promise<void> {
    await updateDoc(doc(db, "groups", groupId), { profileImage: base64 });
}

export async function updateUserProfileImage(uid: string, base64: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), { profileImage: base64 });
}

export async function updateUserGender(uid: string, gender: "male" | "female"): Promise<void> {
    await updateDoc(doc(db, "users", uid), { gender });
}

// --- MEAL PLANS ---
export interface MealPlan {
  id: string;
  groupId: string;
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  isDeleted: boolean;
  createdAt: string;
}

export function subscribeToMealPlans(groupId: string, callback: (meals: MealPlan[]) => void) {
  const q = query(
    collection(db, "mealPlans"),
    where("groupId", "==", groupId),
    where("isDeleted", "==", false)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MealPlan));
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    callback(data);
  });
}

// --- CHAT MESSAGES ---
export interface ChatMessage {
  id: string;
  chatId: string;
  type: "group" | "private";
  senderId: string;
  text: string;
  timestamp: any;
}

export async function sendMessage(chatId: string, type: "group" | "private", senderId: string, text: string): Promise<void> {
  await addDoc(collection(db, "messages"), {
    chatId,
    type,
    senderId,
    text,
    timestamp: serverTimestamp()
  });

  // Update last activity and message in parent
  const ref = type === "group" ? doc(db, "groups", chatId) : doc(db, "personalTrades", chatId);
  await updateDoc(ref, { 
    lastActivity: new Date().toISOString(),
    lastMessage: {
        text,
        senderId,
        timestamp: serverTimestamp()
    }
  });
}

export function subscribeToMessages(chatId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) {
  const q = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    orderBy("timestamp", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, (error) => {
    console.error("Firestore Error in subscribeToMessages:", error);
    if (onError) onError(error);
  });
}

export async function markChatAsRead(userId: string, chatId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    [`chatMarkers.${chatId}`]: serverTimestamp()
  });
}

export function subscribeToUnreadCounts(userId: string, chatIds: string[], callback: (counts: Record<string, number>) => void) {
    if (!userId || !chatIds.length) return () => {};

    const counts: Record<string, number> = {};
    const unsubs: (() => void)[] = [];

    chatIds.forEach(chatId => {
        const q = query(
            collection(db, "messages"),
            where("chatId", "==", chatId),
            orderBy("timestamp", "desc"),
            limit(10) // Only check the latest 10 for efficiency
        );

        const unsub = onSnapshot(q, (snap) => {
            // We need to compare with the user's latest chatMarkers
            // Since we can't easily sync chatMarkers inside this snapshot without another listener,
            // we'll listen to the user doc separately or just rely on the latest data we have.
            // Better yet, let's just use the current user's document snapshot for markers.
        });
        unsubs.push(unsub);
    });

    // Actually, a more efficient way is to listen to the user doc once for markers
    // and listen to messages of all chatIds.
    // However, for Simplicity and Reliability, I'll provide a simpler version that comparing timestamps.

    return () => unsubs.forEach(u => u());
}

// Higher level unread count listener that handles the marker correlation
export function subscribeToAllUnread(userId: string, chatIds: string[], callback: (counts: Record<string, number>) => void) {
    const counts: Record<string, number> = {};
    const messageUnsubs: Record<string, () => void> = {};
    const latestMessages: Record<string, any[]> = {};
    let currentMarkers: Record<string, any> = {};

    const updateCounts = () => {
        chatIds.forEach(chatId => {
            const lastRead = currentMarkers[chatId]?.toDate?.() || new Date(0);
            const msgs = latestMessages[chatId] || [];
            const unread = msgs.filter(m => {
                return m.timestamp?.toDate() > lastRead && m.senderId !== userId;
            }).length;
            counts[chatId] = unread;
        });
        callback({ ...counts });
    };

    const unsubUser = onSnapshot(doc(db, "users", userId), (userSnap) => {
        const userData = userSnap.data();
        currentMarkers = userData?.chatMarkers || {};

        // For each chat, we need a message listener if we don't have one
        chatIds.forEach(chatId => {
            if (!messageUnsubs[chatId]) {
                const q = query(
                    collection(db, "messages"),
                    where("chatId", "==", chatId),
                    orderBy("timestamp", "desc"),
                    limit(20)
                );
                messageUnsubs[chatId] = onSnapshot(q, (msgSnap) => {
                    latestMessages[chatId] = msgSnap.docs.map(d => d.data());
                    updateCounts();
                }, (error) => {
                    console.error(`Firestore Error in subscribeToAllUnread for chat ${chatId}:`, error);
                });
            }
        });
        
        // Always update counts when user markers change
        updateCounts();
    });

    return () => {
        unsubUser();
        Object.values(messageUnsubs).forEach(u => u());
    };
}

// --- GLOBAL ADMIN (GOD MODE) ---

export async function getAllUsers(): Promise<UserBasicInfo[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("studentId", "asc")));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserBasicInfo));
}

export async function getAllGroups(): Promise<Group[]> {
  const snap = await getDocs(query(collection(db, "groups"), where("isDeleted", "==", false)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
}

export async function updateUserData(uid: string, data: Partial<UserBasicInfo>): Promise<void> {
    await updateDoc(doc(db, "users", uid), data);
}

export function subscribeToAllActivities(callback: (activities: any[]) => void) {
    const q = query(collection(db, "groupActivity"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

export async function getAllPersonalTrades(): Promise<PersonalTrade[]> {
    const snap = await getDocs(query(collection(db, "personalTrades"), orderBy("lastActivity", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalTrade));
}

// --- ANALYTICS & STATS ---

export function subscribeToSystemStats(callback: (stats: any) => void) {
    let users: any[] = [];
    let groups: any[] = [];
    let expenses: any[] = [];

    const emit = () => {
        callback({
            totalUsers: users.length,
            activeUsers24h: users.filter(u => u.status === "approved").length,
            totalGroups: groups.filter(g => !g.isDeleted).length,
            totalExpenses: expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0),
            pendingRequests: users.filter(u => u.status === "pending").length,
            activeChats: groups.length + users.filter(u => u.status === "approved").length // Placeholder logic
        });
    };

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        users = snap.docs.map(d => d.data());
        emit();
    });

    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
        groups = snap.docs.map(d => d.data());
        emit();
    });

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
        expenses = snap.docs.map(d => d.data());
        emit();
    });

    return () => {
        unsubUsers();
        unsubGroups();
        unsubExpenses();
    };
}

export function subscribeToGlobalAnalytics(callback: (data: any) => void) {
    const q = query(collection(db, "expenses"), where("isDeleted", "==", false));
    return onSnapshot(q, (snap) => {
        const expenses = snap.docs.map(d => d.data());
        
        // Group by category
        const categories: Record<string, number> = {};
        expenses.forEach(e => {
            const cat = e.category || "Other";
            categories[cat] = (categories[cat] || 0) + (e.amount || 0);
        });

        // Group by month (last 6 months)
        const monthly: Record<string, number> = {};
        expenses.forEach(e => {
            const date = new Date(e.date);
            const month = date.toLocaleString('default', { month: 'short' });
            monthly[month] = (monthly[month] || 0) + (e.amount || 0);
        });

        callback({
            categories: Object.entries(categories).map(([name, value]) => ({ name, value })),
            monthly: Object.entries(monthly).map(([name, value]) => ({ name, value })),
            topGroups: [] // To be implemented with group join
        });
    });
}

export async function broadcastNotification(title: string, message: string): Promise<void> {
    const users = await getAllUsers();
    const batch = users.map(u => writeNotification(u.uid, "NOTICE_ADDED", `${title}: ${message}`, { isBroadcast: true }));
    await Promise.all(batch);
}

export async function updateAdminSettings(settings: any): Promise<void> {
    await setDoc(doc(db, "adminSettings", "global"), settings, { merge: true });
}

export function subscribeToAdminSettings(callback: (settings: any) => void) {
    return onSnapshot(doc(db, "adminSettings", "global"), (snap) => {
        callback(snap.data() || {});
    });
}

// --- FINANCIAL MAINTENANCE (CLEANUP) ---

export async function refreshFinancialData(): Promise<{ expensesFixed: number, tradesFixed: number, purged: number }> {
    const adminUids = new Set<string>();
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(d => {
        const role = d.data().role;
        if (role === "admin" || role === "superadmin") adminUids.add(d.id);
    });

    let purged = 0;
    // COLLECTIONS TO CLEAN UP
    const collectionsToPurge = ["expenses", "shopping", "settlements", "personalTrades"];
    for(const colName of collectionsToPurge) {
        const snap = await getDocs(collection(db, colName));
        for(const d of snap.docs) {
            if(d.data().isDeleted === true) {
                await deleteDoc(d.ref);
                purged++;
            }
        }
    }

    let expensesFixed = 0;
    const expensesSnap = await getDocs(collection(db, "expenses"));
    for (const d of expensesSnap.docs) {
        const data = d.data() as Expense;
        // Skip if document was just deleted above
        if (!data || data.isDeleted) continue;

        const newSplit = (data.splitBetween || []).filter(uid => !adminUids.has(uid));
        
        if (newSplit.length !== (data.splitBetween || []).length) {
            await updateDoc(d.ref, { splitBetween: newSplit });
            expensesFixed++;
        }
    }

    let tradesFixed = 0;
    const tradesSnap = await getDocs(collection(db, "personalTrades"));
    for (const d of tradesSnap.docs) {
        const data = d.data() as PersonalTrade;
        if (!data || data.isDeleted) continue;

        const pList = data.participants || [];
        const hasAdmin = pList.some(uid => adminUids.has(uid));
        
        if (hasAdmin) {
            await deleteDoc(d.ref);
            tradesFixed++;
        }
    }

    return { expensesFixed, tradesFixed, purged };
}



