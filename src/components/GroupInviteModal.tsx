"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserGroups, Group, writeNotification, UserBasicInfo } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

interface GroupInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserBasicInfo | null;
}

export const GroupInviteModal = ({ isOpen, onClose, targetUser }: GroupInviteModalProps) => {
  const { userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentGroups, setSentGroups] = useState<string[]>([]);

  useEffect(() => {
    if (userData?.uid && isOpen) {
      const unsub = subscribeToUserGroups(userData.uid, (data) => setGroups(data));
      return () => unsub();
    }
  }, [userData?.uid, isOpen]);

  const handleInvite = async (group: Group) => {
    if (!targetUser) return;
    
    // Check if user is already a member
    if (group.memberIds?.includes(targetUser.uid)) {
      toast.error(`${targetUser.name} is already in this group.`);
      return;
    }

    setLoading(true);
    try {
      await writeNotification(
        targetUser.uid,
        "INVITE_RECEIVED",
        `${userData?.name} invited you to join "${group.name}".`,
        { groupId: group.id, inviteCode: group.inviteCode, senderName: userData?.name }
      );
      setSentGroups(prev => [...prev, group.id]);
      toast.success(`Invite sent to ${targetUser.name}`);
    } catch (err) {
      toast.error("Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel w-full max-w-sm p-8 relative shadow-2xl border-white/10 overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Group Invite</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Inviting {targetUser?.name}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {groups.length === 0 ? (
            <p className="text-center py-8 text-white/20 text-xs font-bold uppercase tracking-widest italic">You haven't joined any groups yet.</p>
          ) : (
            groups.map(group => {
              const alreadySent = sentGroups.includes(group.id);
              return (
                <div key={group.id} className="glass-card p-4 flex items-center justify-between border-white/5 hover:border-white/10 transition-all group/card">
                  <div className="flex items-center gap-3">
                    {group.profileImage ? (
                      <img src={group.profileImage} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-[10px] font-black italic">
                        {group.name.substring(0, 2)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-white group-hover/card:text-indigo-400 transition-colors">{group.name}</span>
                  </div>
                  
                  <button
                    disabled={alreadySent || loading}
                    onClick={() => handleInvite(group)}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                        alreadySent 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-white/5 text-white/30 hover:bg-indigo-500 hover:text-white"
                    }`}
                  >
                    {alreadySent ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-8 text-[9px] text-white/20 font-bold uppercase tracking-widest leading-relaxed text-center">
          The user will receive an invite to join via notification.
        </p>
      </motion.div>
    </div>
  );
};
