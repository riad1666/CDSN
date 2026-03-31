"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, Plus, Trash2, ChefHat } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getApprovedUsers, UserBasicInfo } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AssignCookingModal } from "@/components/AssignCookingModal";
import { subscribeToUserGroups, Group, deleteCookingSchedule } from "@/lib/firebase/firestore";

interface CookingSchedule {
  id: string;
  date: string;
  assignedUser: string;
  groupId: string;
  meal?: string;
}

export default function CookingPage() {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState<CookingSchedule[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!userData?.currentGroupId) return;

    // Filter by group membership in the future, for now using global approved users filtered by who is in the schedules
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const q = query(
        collection(db, "cookingSchedules"), 
        where("groupId", "==", userData.currentGroupId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: CookingSchedule[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.isDeleted) {
            data.push({ id: doc.id, ...d } as CookingSchedule);
        }
      });
      // Sort in frontend
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSchedules(data);
    });
    const unsubGroup = subscribeToUserGroups(userData.uid, (groups) => {
      const current = groups.find(g => g.id === userData.currentGroupId);
      if (current) setGroup(current);
    });

    return () => {
      unsub();
      unsubGroup();
    };
  }, [userData?.currentGroupId, userData?.uid]);

  const userRole = group?.memberRoles?.[userData?.uid || ""] || "member";
  const isAdmin = userRole === "admin" || userRole === "owner";

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this cooking duty?")) return;
    try {
        await deleteCookingSchedule(id);
        toast.success("Duty removed");
    } catch (error) {
        toast.error("Failed to remove duty");
    }
  };

  if (!userData?.currentGroupId) {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 max-w-lg w-full"
            >
                <div className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
                    <CalendarIcon className="w-10 h-10 text-orange-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Cooking Schedule</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                    Select a group from the sidebar to view its shared cooking schedule.
                </p>
                <Link href="/dashboard" className="glass-button text-sm py-3 px-8 mx-auto">Go to Dashboard</Link>
            </motion.div>
        </div>
    );
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* 1. Culinary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4 px-4 md:px-0">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
             Culinary Schedule
          </h1>
          <p className="text-white/40 font-medium text-sm md:text-base">
            Strategic meal planning and rotation logistics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => setIsAssignOpen(true)}
              className="px-10 py-5 bg-orange-500 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/30 flex items-center gap-3"
            >
              <Plus className="w-5 h-5" /> Assign Duty
            </button>
          )}
        </div>
      </div>

      {/* 2. Month Selector Hub */}
      <div className="glass-card rounded-[3rem] p-8 flex items-center justify-between mx-4 md:mx-0 border-white/5 relative overflow-hidden group">
         <div className="absolute inset-0 bg-linear-to-r from-orange-500/5 via-transparent to-transparent"></div>
         
         <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-4 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all relative z-10">
            <ChevronLeft className="w-6 h-6" />
         </button>

         <div className="text-center relative z-10">
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">{format(currentMonth, "MMMM")}</h3>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mt-1">{format(currentMonth, "yyyy")} Deployment</p>
         </div>

         <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-4 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all relative z-10">
            <ChevronRight className="w-6 h-6" />
         </button>
      </div>

      {/* 3. The Schedule Feed */}
      <div className="space-y-8 px-4 md:px-0">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
           <h4 className="text-sm font-black text-white/60 uppercase tracking-widest italic">Upcoming Rotations</h4>
           <div className="flex-1 h-px bg-white/5"></div>
           <CalendarIcon className="w-4 h-4 text-white/20" />
        </div>

        <div className="space-y-6">
           {schedules.filter(s => format(new Date(s.date), 'yyyy-MM') === format(currentMonth, 'yyyy-MM')).length === 0 ? (
             <div className="glass-card rounded-[3rem] py-32 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <ChefHat className="w-16 h-16 text-white/20" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">No deployments scheduled for this cycle</p>
             </div>
           ) : (
             schedules.filter(s => format(new Date(s.date), 'yyyy-MM') === format(currentMonth, 'yyyy-MM')).map((sch, i) => {
                const user = usersMap[sch.assignedUser];
                const isMe = sch.assignedUser === userData?.uid;
                const dateObj = new Date(sch.date);
                
                return (
                  <motion.div 
                    key={sch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row items-stretch group hover:border-orange-500/30 transition-all border-white/5 ${isMe ? 'ring-2 ring-orange-500/20' : ''}`}
                  >
                    {/* Left: Date Ribbon */}
                    <div className="w-full md:w-40 bg-linear-to-br from-orange-500 to-amber-600 p-6 flex flex-col items-center justify-center shrink-0">
                       <span className="text-5xl font-black text-white tracking-tighter italic">{format(dateObj, "dd")}</span>
                       <span className="text-xs font-black text-white/60 uppercase tracking-widest mt-1">{format(dateObj, "EEE")}</span>
                    </div>

                    {/* Center: Meal & Chef */}
                    <div className="flex-1 p-8 flex items-center justify-between gap-8">
                       <div className="space-y-4">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Main Menu / Payload</p>
                             <h4 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic truncate max-w-md">
                                {sch.meal || "Untitled Culinary Operation"}
                             </h4>
                          </div>

                          <div className="flex items-center gap-4">
                             <div className="relative">
                                {user?.profileImage ? (
                                  <img src={user.profileImage} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-orange-500/40 transition-all" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-xs font-black text-white/20 uppercase">
                                     {user?.name.charAt(0)}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-background"></div>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Assigned Chef</p>
                                <p className="text-sm font-black text-white italic uppercase tracking-tight">
                                   {user?.name || "Unknown Operator"} {isMe && <span className="text-orange-500 ml-2">(YOU)</span>}
                                </p>
                             </div>
                          </div>
                       </div>

                       <div className="hidden md:flex flex-col items-end gap-3 shrink-0">
                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                             Room {user?.room || "N/A"}
                          </div>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDelete(sch.id)}
                              className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/10"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                    </div>
                  </motion.div>
                )
             })
           )}
        </div>
      </div>

      {/* 4. Strategic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-0">
         <section className="glass-card rounded-[3rem] p-10 space-y-6 relative overflow-hidden bg-orange-500/5 border-orange-500/20">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full"></div>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3 relative z-10">
               <ChefHat className="w-5 h-5 text-orange-400" /> Duty Distribution
            </h3>
            <div className="space-y-4 relative z-10">
               {/* Small horizontal bar chart of deployments per person */}
               {(() => {
                  const counts: Record<string, number> = {};
                  schedules.forEach(s => counts[s.assignedUser] = (counts[s.assignedUser] || 0) + 1);
                  return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([uid, count]) => {
                     const u = usersMap[uid];
                     const max = Math.max(...Object.values(counts));
                     return (
                        <div key={uid} className="space-y-2">
                           <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-white/40">{u?.name || "Member"}</span>
                              <span className="text-orange-400">{count} Duty Cycles</span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(count/max)*100}%` }} className="h-full bg-orange-500 rounded-full" />
                           </div>
                        </div>
                     )
                  })
               })()}
            </div>
         </section>

         <section className="glass-card rounded-[3rem] p-10 flex items-center justify-center text-center relative overflow-hidden border-dashed border-white/10 group">
            <div className="space-y-4">
               <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto border border-white/10 group-hover:bg-white/10 transition-all">
                  <LayoutGrid className="w-8 h-8 text-white/20" />
               </div>
               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Integrate with External Calendar Protocols Soon</p>
            </div>
         </section>
      </div>

      <AssignCookingModal 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
      />
    </div>
  );
}
