"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import {
  Users, Shield, ShieldAlert, LogOut, UserMinus, Activity, Copy, Check,
  Clock, UserPlus, BarChart, PieChart, Loader2, Camera, ChevronDown, Pencil, X, Trash2,
  Plus, Search, Key, RefreshCw
} from "lucide-react";
import {
  Group, UserBasicInfo, ActivityLog, JoinRequest, Expense,
  subscribeToUserGroups, subscribeToGroupActivity, subscribeToJoinRequests,
  subscribeToExpenses, approveJoinRequest, rejectJoinRequest, leaveGroup, removeGroupMember,
  createGroup, findGroupByCode, sendJoinRequest, updateGroupInviteCode, inviteUserToGroupByStudentId
} from "@/lib/firebase/firestore";
import { query, collection, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

// --- LOCAL MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg glass-card border-white/10 rounded-[3rem] overflow-hidden shadow-2xl z-10 bg-background"
        >
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-all z-20">
            <X className="w-5 h-5" />
          </button>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function GroupProfilePage() {
  const { userData, currentGroupId } = useAuth();
  const { formatPrice } = useCurrency();
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

  // Group name editing
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // New Group Discovery & Creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundGroup, setFoundGroup] = useState<Group | null>(null);
  const [requestSending, setRequestSending] = useState(false);

  // Group ID Editing (Invite Code)
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  // Inviting
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteStudentId, setInviteStudentId] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Derived role
  const userId = userData?.uid || "";
  const userRole = (group?.memberRoles && userId) ? group.memberRoles[userId] || "member" : "member";
  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin" || isOwner;
  const isSuperAdmin = userData?.role === "superadmin";

  useEffect(() => {
    if (!currentGroupId) { setLoading(false); return; }
    // Pass userRole (superadmin check) to Firestore subscription
    const unsubGroup = subscribeToUserGroups(userData?.uid || "", (groups) => {
      const current = groups.find(g => g.id === currentGroupId);
      if (current) { setGroup(current); fetchMembers(current.memberIds); }
      setLoading(false);
    }, userData?.role);
    
    const unsubActivity = subscribeToGroupActivity(currentGroupId, (logs) => setActivity(logs));
    let unsubRequests = () => {};
    if (isAdmin || isSuperAdmin) unsubRequests = subscribeToJoinRequests(currentGroupId || "", (reqs) => setRequests(reqs));
    const unsubExpenses = subscribeToExpenses((data) => setGroupExpenses(data), currentGroupId || "");
    return () => { unsubGroup(); unsubActivity(); unsubRequests(); unsubExpenses(); };
  }, [currentGroupId, userData?.uid, userData?.role, isAdmin, isSuperAdmin]);

  // Close dropdown on outside click
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!target.closest(".role-dropdown-container")) {
        setRoleDropdownOpen(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const fetchMembers = async (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0) return;
    try {
      const q = query(collection(db, "users"), where("__name__", "in", memberIds));
      const snap = await getDocs(q);
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserBasicInfo)));
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

  const handleDeleteGroup = async () => {
    if (!group || !isOwner) return;
    const confirmName = window.prompt(`To permanently delete this group, please type its exact name: "${group.name}"`);
    if (confirmName !== group.name) {
      if (confirmName !== null) toast.error("Group name did not match.");
      return;
    }
    setDeletingGroup(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { isDeleted: true });
      await updateDoc(doc(db, "users", userData!.uid), { currentGroupId: "" });
      toast.success(`Group "${group.name}" deleted successfully.`);
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete group");
      setDeletingGroup(false);
    }
  };

  const handleApprove = async (req: JoinRequest) => {
    try { await approveJoinRequest(req.id, group!.id, req.userId); toast.success("Request approved!"); }
    catch { toast.error("Failed to approve"); }
  };

  const handleReject = async (req: JoinRequest) => {
    try { await rejectJoinRequest(req.id, req.userId, group!.id); toast.success("Request rejected"); }
    catch { toast.error("Failed to reject"); }
  };

  const handleKick = async (memberId: string) => {
    if (!window.confirm("Kick this member from group?")) return;
    try { await removeGroupMember(group!.id, memberId); toast.success("Member removed"); }
    catch { toast.error("Failed to remove member"); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingImage(true);
    try {
      const storage = getStorage();
      const sRef = storageRef(storage, `group-images/${group.id}/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      await updateDoc(doc(db, "groups", group.id), { profileImage: url });
      toast.success("Group image updated!");
    } catch (err) { console.error(err); toast.error("Failed to upload image"); }
    finally { setUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleChangeRole = async (memberId: string, newRole: "admin" | "member") => {
    if (!group || !isOwner) return;
    const memberData = members.find(m => m.uid === memberId);
    setUpdatingRole(memberId);
    try {
      const newRoles = { ...group.memberRoles, [memberId]: newRole };
      await updateDoc(doc(db, "groups", group.id), { memberRoles: newRoles });
      toast.success(`${memberData?.name || "Member"} is now ${newRole}`);
    } catch { toast.error("Failed to update role"); }
    finally { setUpdatingRole(null); setRoleDropdownOpen(null); }
  };

  const handleSaveName = async () => {
    if (!group || !newGroupName.trim()) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { name: newGroupName.trim() });
      toast.success("Group name updated!");
      setEditingName(false);
    } catch { toast.error("Failed to update name"); }
    finally { setSavingName(false); }
  };

  const handleSaveCode = async () => {
    if (!group || !newGroupCode.trim()) return;
    setSavingCode(true);
    try {
      await updateGroupInviteCode(group.id, newGroupCode.trim().toUpperCase());
      toast.success("Group ID updated!");
      setIsEditingCode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update Group ID");
    } finally {
      setSavingCode(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createGroupName.trim() || !userData?.uid) return;
    setLoading(true);
    try {
      await createGroup(createGroupName.trim(), userData.uid);
      setIsCreateModalOpen(false);
      setCreateGroupName("");
      toast.success("Group created successfully!");
    } catch {
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchToJoin = async () => {
    if (!joinCode.trim()) return;
    setIsSearching(true);
    setFoundGroup(null);
    try {
      const g = await findGroupByCode(joinCode.trim().toUpperCase());
      if (g) setFoundGroup(g);
      else toast.error("Group not found");
    } catch {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendJoinRequest = async () => {
    if (!foundGroup || !userData?.uid) return;
    setRequestSending(true);
    try {
      await sendJoinRequest(foundGroup.id, userData.uid);
      toast.success("Join request sent to Owner!");
      setIsJoinModalOpen(false);
      setJoinCode("");
      setFoundGroup(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send request");
    } finally {
      setRequestSending(false);
    }
  };

  const handleInviteUser = async () => {
    if (!group || !inviteStudentId.trim()) return;
    setIsInviting(true);
    try {
      await inviteUserToGroupByStudentId(group.id, userData!.uid, inviteStudentId.trim());
      toast.success("Invitation sent!");
      setIsInviteModalOpen(false);
      setInviteStudentId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const startEditName = () => {
    setNewGroupName(group?.name || "");
    setEditingName(true);
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 pb-12">
        <div className="glass-card rounded-[3rem] p-12 text-center space-y-8 border-white/5 bg-linear-to-b from-primary/10 to-transparent">
          <div className="max-w-2xl mx-auto space-y-4">
             <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <Users className="w-12 h-12 text-primary" />
             </div>
             <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-tight">Syncing Societies</h2>
             <p className="text-white/40 text-lg font-medium leading-relaxed">
               Welcome to the Convergence Network. Join an existing cluster or initialize your own digital society.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
             <motion.button 
               whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
               onClick={() => setIsJoinModalOpen(true)}
               className="glass-card p-10 rounded-[2.5rem] border-white/10 hover:border-primary/40 transition-all text-left space-y-6 group"
             >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all">
                   <Search className="w-8 h-8 text-primary group-hover:text-white" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Join Cluster</h3>
                   <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Connect via Group ID</p>
                </div>
             </motion.button>

             <motion.button 
               whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
               onClick={() => setIsCreateModalOpen(true)}
               className="glass-card p-10 rounded-[2.5rem] border-white/10 hover:border-success/40 transition-all text-left space-y-6 group"
             >
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success transition-all">
                   <Plus className="w-8 h-8 text-success group-hover:text-white" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Initialize Group</h3>
                   <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Found a new digital society</p>
                </div>
             </motion.button>
          </div>
        </div>

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
          <div className="p-8 space-y-8">
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Group Name</label>
                <input 
                  autoFocus
                  required
                  value={createGroupName}
                  onChange={e => setCreateGroupName(e.target.value)}
                  placeholder="e.g. Convergence Elite"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all font-black uppercase italic tracking-tighter text-xl"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-primary rounded-2xl text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30"
              >
                Initialize Society
              </button>
            </form>
          </div>
        </Modal>

        <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)}>
          <div className="p-8 space-y-10">
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Locate Cluster</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <input 
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="ENTER GROUP ID"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all font-black uppercase italic tracking-tighter text-xl"
                />
                <button 
                  onClick={handleSearchToJoin}
                  disabled={isSearching}
                  className="px-8 bg-white/5 rounded-2xl text-white hover:bg-primary transition-all flex items-center justify-center shrink-0"
                >
                  {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                </button>
              </div>

              {foundGroup && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-8 glass-card border-primary/20 bg-primary/5 rounded-[2rem] flex flex-col items-center text-center gap-6"
                >
                   <div className="w-20 h-20 rounded-2.5xl bg-primary/20 flex items-center justify-center text-3xl font-black text-primary italic uppercase tracking-tighter">
                      {foundGroup.name.substring(0, 2)}
                   </div>
                   <div>
                      <h4 className="text-2xl font-black text-white tracking-tight uppercase italic">{foundGroup.name}</h4>
                      <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{foundGroup.memberIds.length} Members active</p>
                   </div>
                   <button 
                     onClick={handleSendJoinRequest}
                     disabled={requestSending}
                     className="w-full py-5 bg-primary rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-primary/40 disabled:opacity-50"
                   >
                     {requestSending ? "Synchronizing..." : "Request Uplink"}
                   </button>
                </motion.div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const totalSpending = groupExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);
  const mySpending = groupExpenses.filter(e => e.paidBy === userData?.uid).reduce((s: number, e: Expense) => s + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <section className="glass-card rounded-[3rem] overflow-hidden relative border-white/10 group/header">
        <div className="h-48 bg-linear-to-br from-primary/30 via-indigo-900/40 to-black/60 relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
           {group.profileImage && (
             <img src={group.profileImage} className="w-full h-full object-cover blur-xl opacity-30 scale-110" />
           )}
        </div>
        <div className="relative -mt-20 px-8 pb-10 flex flex-col md:flex-row items-end gap-8">
            <div className="relative shrink-0">
              <div className="w-40 h-40 rounded-[2.5rem] bg-background border-8 border-background shadow-2xl overflow-hidden group/avatar">
                {group.profileImage ? (
                  <img src={group.profileImage} className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-5xl font-black text-primary italic uppercase tracking-tighter">
                    {group.name.substring(0, 2)}
                  </div>
                )}
                {isOwner && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[2.5rem] z-20">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-center gap-4 mb-4">
                {editingName ? (
                  <div className="flex items-center gap-3 w-full max-w-lg">
                    <input 
                      autoFocus
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      className="text-4xl font-black text-white bg-white/5 border border-primary/40 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-primary/20 w-full tracking-tighter uppercase italic"
                    />
                    <button onClick={handleSaveName} className="p-4 bg-primary rounded-2xl text-white hover:scale-105 active:scale-95 transition-all">
                      <Check className="w-6 h-6" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-4 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{group.name}</h2>
                    {isOwner && (
                      <button onClick={startEditName} className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 group/invite">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Group ID</span>
                  {isEditingCode ? (
                    <div className="flex items-center gap-2">
                       <input 
                         autoFocus
                         value={newGroupCode}
                         onChange={e => setNewGroupCode(e.target.value.toUpperCase())}
                         className="bg-white/10 border border-primary/40 rounded-lg px-2 py-1 text-primary text-xs font-mono font-bold w-24 focus:outline-none"
                       />
                       <button onClick={handleSaveCode} disabled={savingCode} className="text-success hover:scale-110 transition-transform">
                          {savingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                       </button>
                       <button onClick={() => setIsEditingCode(false)} className="text-white/20 hover:text-white">
                          <X className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-mono font-bold text-primary group-hover:text-white transition-colors">{group.inviteCode}</span>
                       {isOwner && (
                         <button 
                           onClick={() => { setNewGroupCode(group.inviteCode); setIsEditingCode(true); }}
                           className="text-white/10 hover:text-white transition-all"
                         >
                            <Pencil className="w-3 h-3" />
                         </button>
                       )}
                    </div>
                  )}
                  {!isEditingCode && (
                    <button onClick={handleCopyCode} className="ml-2 text-white/20 hover:text-white transition-all">
                       {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="px-5 py-2.5 bg-white/2 rounded-2xl border border-white/5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                   {group.memberIds.length} Members
                </div>
                {isOwner && <div className="px-5 py-2.5 bg-warning/10 text-warning rounded-2xl border border-warning/20 text-[10px] font-black uppercase tracking-[0.2em]">👑 Master Access</div>}
              </div>
            </div>

            <div className="flex items-center gap-3 pb-4">
              {!isOwner && (
                <button onClick={handleLeave} className="px-8 py-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Exit Group
                </button>
              )}
              {isOwner && (
                <button onClick={handleDeleteGroup} className="px-8 py-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Dissolve Group
                </button>
              )}
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex p-2 bg-white/5 rounded-[2rem] border border-white/5 overflow-x-auto no-scrollbar gap-2 flex-1">
                {[
                  { id: "members", label: "Members", icon: Users },
                  { id: "activity", label: "Activities", icon: Activity },
                  { id: "requests", label: "Requests", icon: UserPlus, count: requests.length, adminOnly: true },
                  { id: "analytics", label: "Insights", icon: BarChart },
                ].filter(t => !t.adminOnly || isAdmin || isSuperAdmin).map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] transition-all whitespace-nowrap relative ${
                      activeTab === tab.id ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-white/30 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-primary'}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                    {tab.count ? (
                      <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-black ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="hidden md:flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Connect Agent</span>
                </button>
              )}
           </div>

           <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
              <div className="p-8 space-y-8">
                 <div className="space-y-1">
                   <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Secure Invite</h3>
                   <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Search neural ID to add member</p>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Student ID</label>
                       <input 
                          autoFocus
                          value={inviteStudentId}
                          onChange={e => setInviteStudentId(e.target.value)}
                          placeholder="e.g. 23-XXXXX-X"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-success transition-all font-mono font-bold"
                       />
                    </div>
                    <button 
                       onClick={handleInviteUser}
                       disabled={isInviting || !inviteStudentId.trim()}
                       className="w-full py-5 bg-success rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-success/40 disabled:opacity-50"
                    >
                       {isInviting ? "Transmitting..." : "Send Invitation"}
                    </button>
                 </div>
              </div>
           </Modal>

           <AnimatePresence mode="wait">
              {activeTab === "members" && (
                <motion.div key="members" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                   {members.map((member) => {
                     const mRole = group.memberRoles?.[member.uid] || "member";
                     const isMe = member.uid === userId;
                     const canManage = isOwner && !isMe && mRole !== "owner";

                     return (
                       <div key={member.uid} className="glass-card rounded-[2.5rem] p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="relative">
                                {member.profileImage ? (
                                  <img src={member.profileImage} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-primary/40 transition-all" />
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white/20 italic uppercase tracking-tighter">
                                     {member.name.charAt(0)}
                                  </div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${mRole === 'owner' ? 'bg-warning' : mRole === 'admin' ? 'bg-primary' : 'bg-success/40'}`}></div>
                             </div>
                             <div>
                                <h4 className="text-lg font-black text-white tracking-tight leading-none mb-1 uppercase italic">
                                   {member.name} {isMe && <span className="text-[10px] font-black text-primary ml-2 tracking-widest">(YOU)</span>}
                                </h4>
                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                   {member.studentId} • Room {member.room || 'N/A'}
                                </div>
                             </div>
                          </div>

                          <div className="flex items-center gap-3">
                             <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                mRole === 'owner' ? 'bg-warning/10 text-warning' : mRole === 'admin' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/40'
                             }`}>
                                {mRole}
                             </div>
                             {canManage && (
                               <div className="flex items-center gap-2 role-dropdown-container relative">
                                  <button onClick={() => setRoleDropdownOpen(prev => prev === member.uid ? null : member.uid)} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                                     <ChevronDown className={`w-4 h-4 transition-transform ${roleDropdownOpen === member.uid ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {roleDropdownOpen === member.uid && (
                                      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 top-full mt-2 w-48 glass-card border border-white/10 rounded-2xl p-2 z-50 shadow-2xl flex flex-col gap-1 overflow-hidden bg-background">
                                         <div className="px-4 py-2 border-b border-white/5 mb-1"><span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Change Role</span></div>
                                         <button onClick={() => handleChangeRole(member.uid, "admin")} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item ${mRole === 'admin' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}>
                                            <Shield className={`w-4 h-4 ${mRole === 'admin' ? 'text-primary' : 'text-primary/40'}`} /><span className="text-xs font-black uppercase tracking-widest">Admin</span>
                                         </button>
                                         <button onClick={() => handleChangeRole(member.uid, "member")} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item ${mRole === 'member' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}>
                                            <Users className={`w-4 h-4 ${mRole === 'member' ? 'text-white' : 'text-white/20'}`} /><span className="text-xs font-black uppercase tracking-widest">Member</span>
                                         </button>
                                         {updatingRole === member.uid && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-2xl"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  <button onClick={() => handleKick(member.uid)} className="p-3 bg-destructive/10 rounded-xl text-destructive hover:bg-destructive hover:text-white transition-all">
                                     <UserMinus className="w-4 h-4" />
                                  </button>
                               </div>
                             )}
                          </div>
                       </div>
                     )
                   })}
                </motion.div>
              )}

              {activeTab === "activity" && (
                <motion.div key="activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                   {activity.length === 0 ? (
                     <div className="glass-card rounded-[3rem] py-32 flex flex-col items-center justify-center text-center space-y-4">
                        <Activity className="w-16 h-16 text-white/5" />
                        <p className="text-white/20 font-black uppercase tracking-widest italic">No activities logged</p>
                     </div>
                   ) : (
                     <div className="space-y-8 pl-4">
                        {activity.map((log, i) => (
                          <div key={log.id} className="relative flex gap-6">
                             {i !== activity.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-white/5"></div>}
                             <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 z-10"><Clock className="w-4 h-4 text-white/30" /></div>
                             <div className="pb-8">
                                <div className="glass-panel p-5 rounded-[1.5rem] border-white/5 inline-block"><p className="text-sm text-white/80 font-medium leading-relaxed uppercase tracking-tight">{log.message}</p></div>
                                <p className="text-[10px] text-white/20 mt-3 font-black uppercase tracking-widest ml-1">{format(new Date(log.createdAt), "MMM d, h:mm a")}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </motion.div>
              )}

              {activeTab === "requests" && (
                <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                   {requests.length === 0 ? (
                     <div className="glass-card rounded-[3rem] py-32 flex flex-col items-center justify-center text-center space-y-4">
                        <UserPlus className="w-16 h-16 text-white/5" />
                        <p className="text-white/20 font-black uppercase tracking-widest italic">No pending requests</p>
                     </div>
                   ) : requests.map(req => (
                     <div key={req.id} className="glass-card rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Users className="w-6 h-6 text-white/30" /></div>
                           <div>
                              <p className="text-sm font-black text-white uppercase italic tracking-tight">Access Request</p>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">UID: {req.userId.substring(0, 8)}...</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleApprove(req)} className="px-6 py-2.5 bg-success rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Approve</button>
                           <button onClick={() => handleReject(req)} className="px-6 py-2.5 bg-white/5 rounded-xl text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all">Reject</button>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}

              {activeTab === "analytics" && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-info/5 border-info/20">
                         <div className="w-12 h-12 rounded-2xl bg-info/20 flex items-center justify-center"><PieChart className="w-6 h-6 text-info" /></div>
                         <div><p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Total Expenses</p><h3 className="text-4xl font-black text-white tracking-tighter italic">{formatPrice(totalSpending)}</h3></div>
                      </div>
                      <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-success/5 border-success/20">
                         <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center"><BarChart className="w-6 h-6 text-success" /></div>
                         <div><p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Monthly Peak</p><h3 className="text-4xl font-black text-white tracking-tighter italic">{formatPrice(groupExpenses.length > 0 ? (Math.max(...Object.values(groupExpenses.reduce((acc: Record<string, number>, e) => { const m = e.date?.substring(0, 7) || 'n/a'; acc[m] = (acc[m] || 0) + e.amount; return acc; }, {})) as number[])) : 0)}</h3></div>
                      </div>
                   </div>

                   <div className="glass-card rounded-[3rem] p-10 space-y-10">
                      <div className="flex items-center justify-between"><h4 className="text-xl font-black text-white tracking-tighter uppercase italic">Spending Insights</h4><Activity className="w-5 h-5 text-white/20" /></div>
                      <div className="space-y-8">
                        {(() => {
                           const contributors: Record<string, number> = {};
                           groupExpenses.forEach(e => contributors[e.paidBy] = (contributors[e.paidBy] || 0) + e.amount);
                           return Object.entries(contributors).sort((a, b) => b[1] - a[1]).map(([uid, amt]) => {
                             const user = members.find(m => m.uid === uid);
                             const pct = totalSpending > 0 ? (amt / totalSpending) * 100 : 0;
                             return (
                               <div key={uid} className="space-y-3">
                                 <div className="flex justify-between items-end"><div className="space-y-1"><div className="text-[10px] font-black text-white/40 uppercase tracking-widest">{user?.name || 'Unknown'}</div><div className="text-lg font-black text-white tracking-tighter italic">{formatPrice(amt)}</div></div><div className="text-[10px] font-black text-primary tracking-widest">{Math.round(pct)}%</div></div>
                                 <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full bg-linear-to-r from-primary to-indigo-500 rounded-full" /></div>
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

        <div className="space-y-8">
           <section className="glass-card rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden bg-primary/5 border-primary/20">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
              <div className="flex items-center gap-3 relative z-10"><Shield className="w-5 h-5 text-primary" /><h3 className="text-xl font-black text-white tracking-tight uppercase italic">Vault Access</h3></div>
              <div className="space-y-4 relative z-10">
                 <div className="glass-panel p-5 rounded-[1.5rem] border-white/5"><p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Group Total</p><div className="text-2xl font-black text-white italic">{formatPrice(totalSpending)}</div></div>
                 <div className="glass-panel p-5 rounded-[1.5rem] border-primary/10 bg-primary/10 flex items-center justify-between"><div><p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1.5">Your Contribution</p><div className="text-2xl font-black text-primary italic">{formatPrice(mySpending)}</div></div><div className="text-xs font-black text-primary opacity-40">{totalSpending > 0 ? Math.round((mySpending / totalSpending) * 100) : 0}%</div></div>
              </div>
           </section>

           <section className="glass-card rounded-[2.5rem] p-8 space-y-8 border-white/5">
              <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Operations</h3>
              <div className="space-y-6">
                 <div className="flex gap-5"><div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center shrink-0"><ShieldAlert className="w-6 h-6 text-success" /></div><div><p className="text-xs font-black text-white uppercase tracking-widest mb-1 italic">Security Protocol</p><p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase">Multi-tier role management active</p></div></div>
                 <div className="flex gap-5"><div className="w-12 h-12 rounded-2xl bg-info/10 border border-info/20 flex items-center justify-center shrink-0"><Activity className="w-6 h-6 text-info" /></div><div><p className="text-xs font-black text-white uppercase tracking-widest mb-1 italic">Audit Trail</p><p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase">Real-time group ledger enabled</p></div></div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
