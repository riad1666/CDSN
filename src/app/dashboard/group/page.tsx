"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { 
  Users, Shield, ShieldAlert, LogOut, UserMinus, Activity, Copy, Check,
  Clock, UserPlus, BarChart, PieChart, Loader2, Camera, ChevronDown
} from "lucide-react";
import { 
  Group, UserBasicInfo, ActivityLog, JoinRequest, Expense,
  subscribeToUserGroups, subscribeToGroupActivity, subscribeToJoinRequests,
  subscribeToExpenses, approveJoinRequest, rejectJoinRequest, leaveGroup, removeGroupMember
} from "@/lib/firebase/firestore";
import { query, collection, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function GroupProfilePage() {
  const { userData, currentGroupId } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<UserBasicInfo[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "activity" | "requests" | "analytics">("members");
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Derived role
  const userId = userData?.uid || "";
  const userRole = (group?.memberRoles && userId) ? group.memberRoles[userId] || "member" : "member";
  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin" || isOwner;

  useEffect(() => {
    if (!currentGroupId) {
      setLoading(false);
      return;
    }

    const unsubGroup = subscribeToUserGroups(userData?.uid || "", (groups) => {
      const current = groups.find(g => g.id === currentGroupId);
      if (current) {
        setGroup(current);
        fetchMembers(current.memberIds);
      }
      setLoading(false);
    });

    const unsubActivity = subscribeToGroupActivity(currentGroupId, (logs) => setActivity(logs));

    let unsubRequests = () => {};
    if (isAdmin) {
      unsubRequests = subscribeToJoinRequests(currentGroupId || "", (reqs) => setRequests(reqs));
    }

    const unsubExpenses = subscribeToExpenses((data) => setGroupExpenses(data), currentGroupId || "");

    return () => { unsubGroup(); unsubActivity(); unsubRequests(); unsubExpenses(); };
  }, [currentGroupId, userData?.uid, isAdmin]);

  // Close role dropdown on outside click
  useEffect(() => {
    const handleClick = () => setRoleDropdownOpen(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const fetchMembers = async (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0) return;
    try {
      const q = query(collection(db, "users"), where("__name__", "in", memberIds));
      const snap = await getDocs(q);
      setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserBasicInfo)));
    } catch (err) { console.error("Error fetching members:", err); }
  };

  const handleCopyCode = () => {
    if (!group?.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite code copied!");
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroup(currentGroupId!, userData!.uid);
      toast.success("Left group successfully");
      router.push("/dashboard");
    } catch { toast.error("Failed to leave group"); }
  };

  const handleApprove = async (req: JoinRequest) => {
    try {
      await approveJoinRequest(req.id, group!.id, req.userId);
      toast.success("Request approved!");
    } catch { toast.error("Failed to approve"); }
  };

  const handleReject = async (req: JoinRequest) => {
    try {
      await rejectJoinRequest(req.id, req.userId, group!.id);
      toast.success("Request rejected");
    } catch { toast.error("Failed to reject"); }
  };

  const handleKick = async (memberId: string) => {
    if (!window.confirm("Kick this member from group?")) return;
    try {
      await removeGroupMember(group!.id, memberId);
      toast.success("Member removed");
    } catch { toast.error("Failed to remove member"); }
  };

  // ── NEW: Group profile image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploadingImage(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `group-images/${group.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "groups", group.id), { profileImage: url });
      toast.success("Group image updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── NEW: Change member role ──
  const handleChangeRole = async (memberId: string, newRole: "admin" | "member") => {
    if (!group || !isOwner) return;
    if (memberId === userId) { toast.error("You cannot change your own role"); return; }
    const memberData = members.find(m => m.uid === memberId);
    setUpdatingRole(memberId);
    try {
      const newRoles = { ...group.memberRoles, [memberId]: newRole };
      await updateDoc(doc(db, "groups", group.id), { memberRoles: newRoles });
      toast.success(`${memberData?.name || "Member"} is now ${newRole}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(null);
      setRoleDropdownOpen(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
        <div className="rounded-full bg-white/5 p-4">
          <Users className="h-8 w-8 text-white/20" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">No Group Selected</h3>
          <p className="text-sm text-white/40 max-w-xs">Please select a group from the sidebar to view its profile.</p>
        </div>
      </div>
    );
  }

  const totalSpending = groupExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);
  const mySpending = groupExpenses.filter(e => e.paidBy === userData?.uid).reduce((s: number, e: Expense) => s + e.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Header Card */}
      <section className="glass-panel overflow-hidden relative border-white/10">
        <div className="h-32 bg-linear-to-r from-primary/30 to-indigo-500/20 absolute top-0 left-0 w-full" />
        <div className="relative pt-16 px-8 pb-8 flex flex-col md:flex-row items-end gap-6">

          {/* Group Avatar with upload button for owner */}
          <div className="relative w-32 h-32">
            <div className="w-32 h-32 rounded-3xl bg-[#1a1b2e] border-4 border-[#0f101a] flex items-center justify-center shadow-2xl overflow-hidden">
              {group.profileImage ? (
                <img src={group.profileImage} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-primary italic uppercase">{group.name.substring(0, 2)}</span>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-[#0f101a]"
                title="Change group image"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 pb-2">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{group.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Invite Code:</span>
                <span className="text-xs font-mono font-bold text-primary">{group.inviteCode}</span>
                <button onClick={handleCopyCode} className="text-white/20 hover:text-white transition-colors cursor-pointer">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                {group.memberIds.length} Members
              </div>
              {isOwner && (
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  👑 Owner
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isOwner && (
              <button
                onClick={handleLeave}
                className="px-5 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> Leave Group
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
        {[
          { id: "members", label: "Members", icon: Users },
          { id: "activity", label: "Activities", icon: Activity },
          { id: "requests", label: "Requests", icon: UserPlus, adminOnly: true },
          { id: "analytics", label: "Analytics", icon: BarChart },
        ].filter(t => !t.adminOnly || isAdmin).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
            {tab.id === "requests" && requests.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white text-primary text-[10px] rounded-md font-black">{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">

            {/* ── MEMBERS TAB ── */}
            {activeTab === "members" && (
              <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {members.map(member => {
                  const mRole = group.memberRoles?.[member.uid] || "member";
                  const isMe = member.uid === userData?.uid;
                  const canManage = isOwner && !isMe && mRole !== "owner";

                  return (
                    <div key={member.uid} className="glass-card p-4 flex items-center justify-between hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white/20 font-black text-lg">{member.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {member.name} {isMe && <span className="text-[10px] text-primary ml-1">(You)</span>}
                            </h4>
                            {mRole === "owner" && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                            {mRole === "admin" && <Shield className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{member.studentId} • {mRole}</p>
                        </div>
                      </div>

                      {/* Owner controls: role dropdown + kick */}
                      {canManage && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Role dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setRoleDropdownOpen(roleDropdownOpen === member.uid ? null : member.uid)}
                              disabled={updatingRole === member.uid}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer border border-white/5"
                            >
                              {updatingRole === member.uid ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  {mRole === "admin" ? "Admin" : "Member"}
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>

                            <AnimatePresence>
                              {roleDropdownOpen === member.uid && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  className="absolute right-0 top-full mt-2 w-36 glass-panel p-1 shadow-2xl z-50 border border-white/10"
                                >
                                  <button
                                    onClick={() => handleChangeRole(member.uid, "admin")}
                                    disabled={mRole === "admin"}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                      mRole === "admin" ? "text-primary bg-primary/10 cursor-default" : "text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                                    }`}
                                  >
                                    <Shield className="w-3 h-3" /> Make Admin
                                  </button>
                                  <button
                                    onClick={() => handleChangeRole(member.uid, "member")}
                                    disabled={mRole === "member"}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                      mRole === "member" ? "text-white/40 bg-white/5 cursor-default" : "text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                                    }`}
                                  >
                                    <Users className="w-3 h-3" /> Make Member
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Kick button */}
                          <button
                            onClick={() => handleKick(member.uid)}
                            className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:bg-rose-500/20 hover:text-rose-500 transition-all cursor-pointer"
                            title="Remove from group"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Admin (non-owner) can kick members only */}
                      {isAdmin && !isOwner && !isMe && mRole === "member" && (
                        <button
                          onClick={() => handleKick(member.uid)}
                          className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:bg-rose-500/20 hover:text-rose-500 transition-all cursor-pointer"
                          title="Remove from group"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ── ACTIVITY TAB ── */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {activity.length === 0 ? (
                  <div className="glass-card py-16 flex flex-col items-center justify-center text-center">
                    <Activity className="w-12 h-12 text-white/5 mb-4" />
                    <p className="text-white/20 text-xs font-black uppercase tracking-widest italic">No activities logged yet.</p>
                  </div>
                ) : (
                  activity.map((log) => (
                    <div key={log.id} className="flex gap-4 relative">
                      <div className="w-px h-full bg-white/5 absolute left-4 top-10" />
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 z-10 backdrop-blur-sm">
                        <Clock className="w-4 h-4 text-white/20" />
                      </div>
                      <div className="pb-6 pt-1">
                        <p className="text-xs text-white/80 font-medium leading-relaxed bg-white/2 p-3 rounded-2xl border border-white/5 inline-block">{log.message}</p>
                        <p className="text-[10px] text-white/30 mt-2 ml-1 font-bold uppercase tracking-tighter">
                          {format(new Date(log.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ── REQUESTS TAB ── */}
            {activeTab === "requests" && (
              <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {requests.length === 0 ? (
                  <div className="glass-card py-16 flex flex-col items-center justify-center text-center">
                    <UserPlus className="w-12 h-12 text-white/5 mb-4" />
                    <p className="text-white/20 text-xs font-black uppercase tracking-widest italic">No pending join requests.</p>
                  </div>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className="glass-card p-5 flex items-center justify-between hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Users className="w-6 h-6 text-white/30" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Join Request</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">User ID: {req.userId.substring(0, 12)}...</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(req)} className="px-5 py-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer">
                          Approve
                        </button>
                        <button onClick={() => handleReject(req)} className="px-5 py-2 rounded-xl bg-white/5 text-white/30 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Expenses</p>
                    <p className="text-3xl font-black text-white italic">₩{totalSpending.toLocaleString()}</p>
                  </div>
                  <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Avg / Month</p>
                    <p className="text-3xl font-black text-white italic">
                      ₩{groupExpenses.length > 0 ? Math.round(totalSpending / Math.max(1, new Set(groupExpenses.map(e => e.date?.substring(0, 7))).size)).toLocaleString() : 0}
                    </p>
                  </div>
                </div>

                <div className="glass-panel p-6 border-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Monthly Spending Trend</h4>
                    <PieChart className="w-4 h-4 text-white/20" />
                  </div>
                  <div className="h-48 flex items-end gap-3 px-2 border-b border-white/5 pb-2">
                    {(() => {
                      const monthly: Record<string, number> = {};
                      groupExpenses.forEach(e => {
                        const m = e.date?.substring(0, 7) || "";
                        if (m) monthly[m] = (monthly[m] || 0) + e.amount;
                      });
                      const sorted = Object.keys(monthly).sort().slice(-6);
                      const max = Math.max(...Object.values(monthly), 1);
                      if (sorted.length === 0) return (
                        <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest">No expense data yet</div>
                      );
                      return sorted.map(m => (
                        <div key={m} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-white text-black text-[10px] px-3 py-1.5 rounded-xl whitespace-nowrap z-20 font-black shadow-2xl">₩{monthly[m].toLocaleString()}</div>
                          <div className="w-full bg-linear-to-t from-primary/80 to-indigo-500 rounded-t-xl transition-all group-hover:brightness-125" style={{ height: `${(monthly[m] / max) * 100}%`, minHeight: "8px" }}></div>
                          <span className="text-[9px] text-white/30 font-black uppercase tracking-widest pt-2">{m.split("-")[1].replace(/^0/, "")}M</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="glass-panel p-6 border-white/5">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">Contribution Breakdown</h4>
                  <div className="space-y-5">
                    {(() => {
                      const contributors: Record<string, number> = {};
                      groupExpenses.forEach(e => contributors[e.paidBy] = (contributors[e.paidBy] || 0) + e.amount);
                      if (Object.keys(contributors).length === 0) return (
                        <div className="text-center py-8 text-white/20 text-xs font-bold uppercase tracking-widest">No data yet</div>
                      );
                      return Object.entries(contributors).sort((a, b) => b[1] - a[1]).map(([uid, amt]) => {
                        const user = members.find(m => m.uid === uid);
                        const pct = totalSpending > 0 ? (amt / totalSpending) * 100 : 0;
                        return (
                          <div key={uid} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/60 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {user?.name || "Unknown"}
                              </span>
                              <span className="text-white">₩{amt.toLocaleString()} <span className="text-white/30 ml-1">{Math.round(pct)}%</span></span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-linear-to-r from-primary to-indigo-500" />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="glass-panel p-7 border-primary/20 bg-linear-to-br from-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/10 blur-3xl rounded-full" />
            <h3 className="text-sm font-black text-white uppercase tracking-tighter italic mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Financial Overview
            </h3>
            <div className="space-y-5">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Total Group Spending</p>
                <span className="text-2xl font-black text-white italic">₩{totalSpending.toLocaleString()}</span>
              </div>
              <div className="p-5 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1.5">Your Total Share</p>
                <span className="text-2xl font-black text-primary italic">₩{mySpending.toLocaleString()}</span>
              </div>
            </div>
          </section>

          <section className="glass-panel p-7 border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-tighter italic mb-6">Group Directives</h3>
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mb-1">Encrypted Access</p>
                  <p className="text-[10px] text-white/30 leading-relaxed uppercase">Only authenticated members can view financial records.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mb-1">Role Hierarchy</p>
                  <p className="text-[10px] text-white/30 leading-relaxed uppercase">Owners and Admins hold full administrative authority.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
