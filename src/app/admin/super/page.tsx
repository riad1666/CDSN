"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Shield, Users, LayoutGrid, Settings, Search, CheckCircle, X } from "lucide-react";
import { collection, getDocs, query, where, updateDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { UserBasicInfo } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface GroupData {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberIds: string[];
  isDeleted: boolean;
  profileImage?: string;
}

interface UserManageModal {
  user: UserBasicInfo;
  groups: GroupData[];
}

export default function SuperAdminPage() {
  const { userData } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manageModal, setManageModal] = useState<UserManageModal | null>(null);
  const [manageGroup, setManageGroup] = useState<GroupData | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const groupsSnap = await getDocs(query(collection(db, "groups"), where("isDeleted", "==", false)));
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("studentId", "asc")));

      const groupList = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as GroupData));
      const userList = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserBasicInfo));

      setGroups(groupList);
      setUsers(userList);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleApprove = async (uid: string) => {
    await updateDoc(doc(db, "users", uid), { status: "approved" });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: "approved" } : u));
    toast.success("User approved");
  };

  const handleReject = async (uid: string) => {
    await updateDoc(doc(db, "users", uid), { status: "rejected" });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: "rejected" } : u));
    toast.success("User rejected");
  };

  const handleSetRole = async (uid: string, role: "user" | "admin" | "superadmin") => {
    await updateDoc(doc(db, "users", uid), { role });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
    if (manageModal?.user.uid === uid) {
      setManageModal(prev => prev ? { ...prev, user: { ...prev.user, role } } : null);
    }
    toast.success(`Role changed to ${role}`);
  };

  const handleSetGroupRole = async (groupId: string, userId: string, groupRole: "owner" | "admin" | "member") => {
    // Store group-level role in a sub-document or in the group members map
    await updateDoc(doc(db, "groups", groupId), {
      [`memberRoles.${userId}`]: groupRole
    });
    toast.success(`Group role set to ${groupRole}`);
  };

  const handleEditGroup = async (groupId: string, data: Partial<GroupData>) => {
    await updateDoc(doc(db, "groups", groupId), data);
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...data } : g));
    toast.success("Group updated");
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Soft delete this group? All data remains but users lose access.")) return;
    await updateDoc(doc(db, "groups", groupId), { isDeleted: true });
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setIsGroupModalOpen(false);
    toast.success("Group soft-deleted");
  };

  const handleRegenerateCode = async (groupId: string) => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await handleEditGroup(groupId, { inviteCode: newCode });
  };

  if (userData?.role !== "superadmin") {
    return (
      <div className="h-screen flex items-center justify-center text-rose-500 font-bold text-sm">
        ACCESS DENIED
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.studentId?.includes(search)
  );

  const pendingCount = users.filter(u => u.status === "pending").length;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
            <Shield className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control Center</h2>
            <p className="text-[10px] font-bold text-rose-500/50 tracking-widest uppercase">Global System Administrator — Full Access</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, color: "text-white" },
          { label: "Active Groups", value: groups.length, color: "text-primary" },
          { label: "Pending Approvals", value: pendingCount, color: "text-orange-400" },
          { label: "System Status", value: "HEALTHY", color: "text-emerald-400" },
        ].map(stat => (
          <div key={stat.label} className="glass-panel p-6 border-white/5">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Groups Panel */}
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-white tracking-tight">Active Groups</h3>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {groups.map(group => {
              const owner = users.find(u => u.uid === group.ownerId);
              return (
                <div key={group.id} className="glass-card hover:bg-white/5 p-4 border border-transparent hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary text-sm">
                        {group.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{group.name}</h4>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                          Code: {group.inviteCode} • {group.memberIds?.length || 0} members
                        </p>
                      </div>
                    </div>
                  </div>
                  {owner && (
                    <div className="flex items-center justify-between mt-2">
                       <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Owner: {owner.name}</p>
                       <button
                         onClick={() => {
                            setManageGroup(group);
                            setIsGroupModalOpen(true);
                         }}
                         className="p-1 px-2 rounded bg-white/5 text-white/30 hover:bg-primary/20 hover:text-primary transition-all text-[8px] font-black uppercase tracking-tighter"
                       >
                         Manage
                       </button>
                    </div>
                  )}
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-white/20 text-xs text-center py-8">No groups found.</p>}
          </div>
        </section>

        {/* User Directory */}
        <section className="glass-panel p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white tracking-tight">Global Directory</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-primary transition-all w-32"
              />
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
            {filteredUsers.map(user => (
              <div key={user.uid} className="glass-card p-3 flex items-center justify-between border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  {user.profileImage ? (
                    <img src={user.profileImage} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/20 text-xs font-bold">
                      {user.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h5 className="text-white font-bold text-xs">{user.name}</h5>
                    <p className="text-[9px] text-white/30 font-bold uppercase">
                      {user.studentId} •{" "}
                      <span className={user.role === "superadmin" ? "text-rose-400" : user.role === "admin" ? "text-orange-400" : "text-white/30"}>
                        {user.role}
                      </span>
                      {" "}•{" "}
                      <span className={user.status === "approved" ? "text-emerald-400" : user.status === "pending" ? "text-orange-400" : "text-rose-400"}>
                        {user.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {user.status === "pending" && (
                    <button
                      onClick={() => handleApprove(user.uid)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="Approve User"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setManageModal({ user, groups: groups.filter(g => g.memberIds?.includes(user.uid)) })}
                    className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors"
                    title="Manage User"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Manage User Modal */}
      <AnimatePresence>
        {manageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-md p-8 relative shadow-2xl border-white/10"
            >
              <button
                onClick={() => setManageModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                {manageModal.user.profileImage ? (
                  <img src={manageModal.user.profileImage} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/30 text-xl font-black">
                    {manageModal.user.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter">{manageModal.user.name}</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{manageModal.user.studentId}</p>
                </div>
              </div>

              {/* Global Platform Role */}
              <div className="mb-6">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">Platform Role</label>
                <div className="flex gap-2">
                  {(["user", "admin", "superadmin"] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => handleSetRole(manageModal.user.uid, role)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        manageModal.user.role === role
                          ? role === "superadmin" ? "bg-rose-500 border-rose-500 text-white" : role === "admin" ? "bg-orange-500 border-orange-500 text-white" : "bg-primary border-primary text-white"
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {role === "superadmin" ? "S.Admin" : role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Role Override */}
              {manageModal.groups.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 block">Group Role Override</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {manageModal.groups.map(group => (
                      <div key={group.id} className="flex items-center justify-between glass-card p-3 border-white/5">
                        <div>
                          <p className="text-white font-bold text-xs">{group.name}</p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Code: {group.inviteCode}</p>
                        </div>
                        <div className="flex gap-1">
                          {(["owner", "admin", "member"] as const).map(gRole => (
                            <button
                              key={gRole}
                              onClick={() => handleSetGroupRole(group.id, manageModal.user.uid, gRole)}
                              className="px-2 py-1 rounded-lg bg-white/5 text-white/30 hover:bg-indigo-500/20 hover:text-indigo-400 text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-indigo-500/30"
                            >
                              {gRole}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manageModal.groups.length === 0 && (
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center py-4 border-t border-white/5 mt-4">
                  This user has not joined any groups yet.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Group Modal */}
      <AnimatePresence>
        {isGroupModalOpen && manageGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-sm p-8 relative shadow-2xl border-white/10"
            >
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center font-black text-primary text-xl">
                  {manageGroup.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter">Manage Group</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{manageGroup.id}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Group Name</label>
                  <input
                    type="text"
                    defaultValue={manageGroup.name}
                    onBlur={(e) => handleEditGroup(manageGroup.id, { name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Invite Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manageGroup.inviteCode}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/40 cursor-not-allowed font-mono"
                    />
                    <button
                      onClick={() => handleRegenerateCode(manageGroup.id)}
                      className="px-3 bg-white/5 text-white/30 hover:text-white rounded-xl border border-white/10 transition-all text-[10px] font-black uppercase"
                    >
                      Regen
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => handleDeleteGroup(manageGroup.id)}
                    className="flex-1 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-rose-500/20"
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
