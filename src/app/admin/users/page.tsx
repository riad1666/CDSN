"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit2, 
  Slash, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  X,
  Save,
  Shield,
  User as UserIcon,
  Contact
} from "lucide-react";
import { getAllUsers, updateUserData } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  
  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
        name: user.name || "",
        studentId: user.studentId || "",
        role: user.role || "user",
        status: user.status || "pending"
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
        await updateUserData(selectedUser.uid, editFormData);
        toast.success("User identity updated successfully");
        setIsEditModalOpen(false);
        loadUsers();
    } catch (e) {
        toast.error("Update failed: Storage cluster error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === "approved" ? "rejected" : "approved";
    try {
      await updateUserData(user.uid, { status: newStatus });
      toast.success(`User ${newStatus === 'approved' ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (e) {
      toast.error("Status update failed");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "active") return matchesSearch && u.status === "approved";
    if (filter === "banned") return matchesSearch && u.status === "rejected";
    return matchesSearch;
  });

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">User Management</h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Manage all registered users</p>
        </div>
        <button className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_8px_20px_rgba(236,72,153,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add User
        </button>
      </header>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#131422] p-4 rounded-3xl border border-white/5">
        <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
                type="text" 
                placeholder="Search by name, student ID, or email..." 
                className="w-full bg-white/3 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-hidden focus:border-purple-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
            {['all', 'active', 'banned'].map((f) => (
                <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        filter === f ? 'bg-purple-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
                    }`}
                >
                    {f}
                </button>
            ))}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-[#131422] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-white/5 bg-black/20">
                        <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">User</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Student ID</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Email</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Groups</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-8 py-20 text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Loading Identity Core...</p>
                            </td>
                        </tr>
                    ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-white/3 transition-colors group">
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        {user.profileImage ? (
                                            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-purple-500 font-black text-xs">{user.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-xs uppercase tracking-tight">{user.name}</p>
                                        <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mt-0.5 italic">Joined 2024</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <span className="text-white/60 font-black text-[10px] tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{user.studentId}</span>
                            </td>
                            <td className="px-8 py-5 text-xs text-white/40 font-bold lowercase tracking-wider">{user.email || 'N/A'}</td>
                            <td className="px-8 py-5">
                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-400/20 italic">
                                    {user.groupsJoined?.length || 0} groups
                                </span>
                            </td>
                            <td className="px-8 py-5">
                                <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] ${user.status === 'approved' ? 'text-green-500' : 'text-rose-500'}`}>
                                    {user.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {user.status === 'approved' ? 'Active' : 'Banned'}
                                </span>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleOpenEdit(user)}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-purple-500 hover:border-purple-500/30 transition-all cursor-pointer"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleToggleStatus(user)}
                                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${user.status === 'approved' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500' : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white hover:border-green-500'}`}
                                    >
                                        <Slash className="w-4 h-4" />
                                    </button>
                                    <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-rose-500 hover:border-rose-500/30 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="px-8 py-20 text-center">
                                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No Neural Patterns Found Matching Criteria</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="bg-black/20 px-8 py-5 border-t border-white/5">
            <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] text-center italic">Authority Verified Identity Console</p>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsEditModalOpen(false)}
             ></div>
             <div className="relative w-full max-w-lg bg-[#11121d] border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20"><UserIcon className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-sm italic">Edit User Identity</h3>
                                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-0.5">Override Global Parameters</p>
                            </div>
                        </div>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-white/20 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Contact className="w-3 h-3" /> Full Biological Name</label>
                             <input 
                                type="text" 
                                className="w-full bg-white/3 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white focus:outline-hidden focus:border-purple-500/50 transition-all italic"
                                value={editFormData.name}
                                onChange={(e)=>setEditFormData({...editFormData, name: e.target.value})}
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">Student Designation ID</label>
                             <input 
                                type="text" 
                                className="w-full bg-white/3 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white focus:outline-hidden focus:border-purple-500/50 transition-all italic"
                                value={editFormData.studentId}
                                onChange={(e)=>setEditFormData({...editFormData, studentId: e.target.value})}
                             />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Shield className="w-3 h-3" /> System Role</label>
                                <select 
                                    className="w-full bg-white/3 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white focus:outline-hidden focus:border-purple-500/50 transition-all"
                                    value={editFormData.role}
                                    onChange={(e)=>setEditFormData({...editFormData, role: e.target.value})}
                                >
                                    <option value="user">USER</option>
                                    <option value="admin">ADMIN</option>
                                    <option value="superadmin">GOD_MODE</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] ml-2">Verification Status</label>
                                <select 
                                    className="w-full bg-white/3 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white focus:outline-hidden focus:border-purple-500/50 transition-all"
                                    value={editFormData.status}
                                    onChange={(e)=>setEditFormData({...editFormData, status: e.target.value})}
                                >
                                    <option value="pending">PENDING</option>
                                    <option value="approved">APPROVED</option>
                                    <option value="rejected">REJECTED</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            disabled={isSaving}
                            onClick={handleSaveEdit}
                            className="w-full bg-linear-to-r from-purple-500 to-pink-500 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Save className="w-4 h-4" />}
                            {isSaving ? "Syncing Clusters..." : "Overwrite Parameters"}
                        </button>
                    </div>
                </div>
                <div className="bg-black/20 p-4 border-t border-white/5">
                    <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] text-center italic">Modification of identity requires level 5 clearance</p>
                </div>
             </div>
        </div>
      )}
    </div>
  );
}
