"use client";

import { useState } from "react";
import { X, Loader2, Key, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from "react-hot-toast";

export function JoinGroupModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return toast.error("Invite code is required");

    setLoading(true);
    try {
      const q = query(collection(db, "groups"), where("inviteCode", "==", inviteCode.toUpperCase()), where("isDeleted", "==", false));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("Invalid invite code or group no longer exists.");
      }

      const groupDoc = snap.docs[0];
      const groupId = groupDoc.id;

      if (userData?.groupsJoined?.includes(groupId)) {
        throw new Error("You are already a member of this group.");
      }

      // Add user to group members and update user document
      await updateDoc(doc(db, "groups", groupId), {
        memberIds: arrayUnion(userData!.uid)
      });

      await updateDoc(doc(db, "users", userData!.uid), {
        groupsJoined: arrayUnion(groupId),
        currentGroupId: groupId
      });

      toast.success(`Welcome to ${groupDoc.data().name}!`);
      onClose();
      setInviteCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-sm p-8 relative shadow-2xl border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 mx-auto">
            <Key className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tighter">Join Group</h2>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center mb-8">Enter a unique code to participate</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Invite Code</label>
            <input 
              type="text" 
              placeholder="e.g., A1B2C3" 
              className="w-full glass-input text-center tracking-[0.5em] text-xl font-black uppercase py-6"
              maxLength={6}
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>
          
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-[10px] text-indigo-400/60 leading-relaxed font-bold uppercase tracking-wider text-center">
                  Once joined, you'll have access to the group's expenses, settlements, and notices.
              </p>
          </div>

          <button type="submit" disabled={loading} className="w-full glass-button-secondary bg-white/5 border border-white/10 py-4 font-black uppercase tracking-widest text-xs hover:bg-white/10">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Access Group"}
          </button>
        </form>
      </div>
    </div>
  );
}
