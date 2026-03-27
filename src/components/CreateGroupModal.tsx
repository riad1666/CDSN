"use client";

import { useState } from "react";
import { X, Loader2, Camera, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from "react-hot-toast";

export function CreateGroupModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Group name is required");

    setLoading(true);
    try {
      const inviteCode = generateInviteCode();
      const groupRef = await addDoc(collection(db, "groups"), {
        name,
        inviteCode,
        ownerId: userData!.uid,
        memberIds: [userData!.uid],
        totalExpense: 0,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        profileImage: ""
      });

      // Update user's joined groups
      await updateDoc(doc(db, "users", userData!.uid), {
        groupsJoined: arrayUnion(groupRef.id),
        currentGroupId: groupRef.id
      });

      toast.success(`Group "${name}" created! Invite code: ${inviteCode}`);
      onClose();
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
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
        
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 mx-auto">
            <Shield className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tighter">Create Group</h2>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center mb-8">Start a new shared workspace</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Group Name</label>
            <input 
              type="text" 
              placeholder="e.g., Room 402, Project Alpha" 
              className="w-full glass-input text-sm py-4"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-primary/60 leading-relaxed font-bold uppercase tracking-wider">
                  You will be the Owner of this group. You can invite others using a unique code after creation.
              </p>
          </div>

          <button type="submit" disabled={loading} className="w-full glass-button py-4 font-black uppercase tracking-widest text-xs">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Initialize Group"}
          </button>
        </form>
      </div>
    </div>
  );
}
