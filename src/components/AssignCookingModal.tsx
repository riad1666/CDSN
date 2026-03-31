"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Calendar as CalendarIcon, ChefHat } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { UserBasicInfo, getGroupMembers, writeNotification, writeGroupActivity, updateCookingSchedule } from "@/lib/firebase/firestore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface CookingSchedule {
  id: string;
  date: string;
  assignedUser: string;
  groupId: string;
  meal?: string;
}

interface AssignCookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  editSchedule?: CookingSchedule | null;
}

export function AssignCookingModal({ isOpen, onClose, initialDate, editSchedule }: AssignCookingModalProps) {
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [assignedUser, setAssignedUser] = useState("");
  const [meal, setMeal] = useState("");
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editSchedule) {
      setAssignedUser(editSchedule.assignedUser);
      setMeal(editSchedule.meal || "");
      setDate(editSchedule.date);
    } else {
      setAssignedUser("");
      setMeal("");
      setDate(initialDate || new Date().toISOString().split('T')[0]);
    }
  }, [editSchedule, initialDate, isOpen]);

  useEffect(() => {
    if (isOpen && userData?.currentGroupId) {
      getGroupMembers(userData.currentGroupId).then(list => setUsers(list));
    }
  }, [isOpen, userData?.currentGroupId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUser || !date) return toast.error("Please select a person and a date");

    setLoading(true);
    try {
      if (!userData?.currentGroupId) throw new Error("No group selected.");

      // If not editing, check if someone is already assigned for this date
      if (!editSchedule) {
        const existing = await getDocs(query(
          collection(db, "cookingSchedules"),
          where("groupId", "==", userData.currentGroupId),
          where("date", "==", date),
          where("isDeleted", "==", false)
        ));
        
        if (!existing.empty) {
          throw new Error("Someone is already assigned for this date.");
        }

        await addDoc(collection(db, "cookingSchedules"), {
          assignedUser,
          date,
          meal,
          groupId: userData.currentGroupId,
          assignedBy: userData.uid,
          createdAt: new Date().toISOString(),
          isDeleted: false
        });
      } else {
        await updateCookingSchedule(editSchedule.id, {
          assignedUser,
          date,
          meal,
        });
      }

      const targetUser = users.find(u => u.uid === assignedUser);
      
      // Log activity
      await writeGroupActivity(
        userData.currentGroupId,
        editSchedule ? "cooking_updated" : "cooking_assigned",
        `${userData.name} ${editSchedule ? 'updated' : 'assigned'} cooking duty for ${date}`,
        userData.uid
      );

      // Notify user
      if (assignedUser !== userData.uid) {
        await writeNotification(
          assignedUser,
          "NOTICE_ADDED",
          `Cooking duty for ${date} has been ${editSchedule ? 'updated' : 'assigned to you'} by ${userData.name}.`,
          { groupId: userData.currentGroupId, date }
        );
      }

      toast.success(editSchedule ? "Duty updated!" : "Cooking duty assigned!");
      onClose();
    } catch(err: any) {
      toast.error(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-sm p-8 relative shadow-2xl border-white/10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
            <ChefHat className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">{editSchedule ? "Edit Duty" : "Assign Duty"}</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cooking Schedule Management</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Select Resident</label>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold appearance-none"
              value={assignedUser}
              onChange={e => setAssignedUser(e.target.value)}
            >
              <option value="" className="bg-[#0f101a]">Choose someone...</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid} className="bg-[#0f101a]">{u.name} (Room {u.room})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Planned Meal / Menu</label>
            <input 
              type="text"
              placeholder="e.g., Chicken Curry, Pasta Night"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold"
              value={meal}
              onChange={e => setMeal(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Date of Duty</label>
            <div className="relative">
               <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
               <input 
                 type="date" 
                 className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold"
                 value={date}
                 onChange={e => setDate(e.target.value)}
               />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editSchedule ? "Update Duty" : "Confirm Assignment")}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
