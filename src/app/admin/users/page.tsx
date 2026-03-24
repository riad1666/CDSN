"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Edit, RotateCcw, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface UserDoc {
  id: string;
  name: string;
  email: string;
  studentId: string;
  status: "pending" | "approved" | "rejected";
  role: string;
  profileImage: string;
  room: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: UserDoc[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as UserDoc));
      setUsers(data);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      toast.success(`User marked as ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleResetPassword = async (user: UserDoc) => {
    toast("Password reset to Student ID (Demo Note: Requires Cloud Functions in Production)", { 
      icon: "ℹ️",
      duration: 4000 
    });
  };

  const filteredUsers = users.filter(u => u.role !== "admin" && (u.name.toLowerCase().includes(search.toLowerCase()) || u.studentId.includes(search)));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
        <p className="text-white/60 text-sm">Approve, reject, and manage all users in the system</p>
      </div>

      <div className="glass-panel p-6 border-white/5">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
          <input 
            type="text" 
            placeholder="Search by name or student ID..." 
            className="w-full glass-input pl-12 bg-white/5 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                <th className="pb-4 font-semibold pl-4">User</th>
                <th className="pb-4 font-semibold">Student ID</th>
                <th className="pb-4 font-semibold">Room</th>
                <th className="pb-4 font-semibold">Joined Date</th>
                <th className="pb-4 font-semibold">Status</th>
                <th className="pb-4 font-semibold text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 pl-4">
                    <div className="flex items-center gap-3">
                      {user.profileImage ? (
                        <img src={user.profileImage} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                      )}
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-white/40 text-[10px]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-white/70 text-sm">{user.studentId}</td>
                  <td className="py-4 text-white/70 text-sm">{user.room}</td>
                  <td className="py-4 text-white/70 text-sm">{user.createdAt ? format(new Date(user.createdAt), "yyyy-MM-dd") : "N/A"}</td>
                  <td className="py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      user.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {user.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(user.id, "approved")} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/40 hover:scale-110 active:scale-95 transition-all" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(user.id, "rejected")} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/40 hover:scale-110 active:scale-95 transition-all" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleResetPassword(user)} className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center hover:bg-orange-500/40 hover:scale-110 active:scale-95 transition-all" title="Reset Password">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500/40 hover:scale-110 active:scale-95 transition-all" title="Edit User">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-white/40 text-sm">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
