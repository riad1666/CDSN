"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getApprovedUsers, UserBasicInfo } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AssignCookingModal } from "@/components/AssignCookingModal";
import { subscribeToUserGroups, Group } from "@/lib/firebase/firestore";

interface CookingSchedule {
  id: string;
  date: string;
  assignedUser: string;
  groupId: string;
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
        where("groupId", "==", userData.currentGroupId),
        orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: CookingSchedule[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.isDeleted) {
            data.push({ id: doc.id, ...d } as CookingSchedule);
        }
      });
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
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pt-4">
      <div className="flex items-center gap-4 mb-8 pl-4">
        <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-1">
           Cooking Schedule
        </h2>
        {isAdmin && (
           <button 
             onClick={() => setIsAssignOpen(true)}
             className="mr-4 px-4 py-2 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
           >
             <Plus className="w-4 h-4" /> Assign Duty
           </button>
        )}
      </div>

      <div className="glass-panel p-6 mb-8 mx-4">
         <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="glass-button-secondary py-2 px-4 shadow-none">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-orange-500" />
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="glass-button-secondary py-2 px-4 shadow-none">
              Next <ChevronRight className="w-4 h-4" />
            </button>
         </div>

         {/* Calendar Grid */}
         <div className="grid grid-cols-7 gap-2 md:gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-white/50 text-xs md:text-sm font-semibold py-2">
                {day}
              </div>
            ))}
            
            {/* Offset for first day of month */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 md:h-28 rounded-xl bg-white/5 opacity-50"></div>
            ))}
            
            {days.map(day => {
               const dateStr = format(day, "yyyy-MM-dd");
               const daySchedules = schedules.filter(s => s.date === dateStr);
               
               const bDayMonthDay = format(day, "MM-dd");
               const bdayUsers = Object.values(usersMap).filter(u => u.dob && u.dob.slice(5) === bDayMonthDay && group?.memberIds.includes(u.uid));
               const isBirthday = bdayUsers.length > 0;
               
               return (
                 <div 
                   key={day.toString()} 
                   onClick={() => {
                      if (isBirthday) {
                         bdayUsers.forEach(bu => {
                            toast.custom((t) => (
                               <div className={`${t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} transition-all duration-300 max-w-sm w-full bg-[#232048] shadow-2xl rounded-xl pointer-events-auto flex border border-white/10 overflow-hidden`}>
                                  <div className="flex-1 w-0 p-4">
                                     <div className="flex items-center">
                                        <div className="shrink-0">
                                           {bu.profileImage ? (
                                              <img className="h-12 w-12 rounded-full object-cover border-2 border-pink-500" src={bu.profileImage} alt="" />
                                           ) : (
                                              <div className="h-12 w-12 rounded-full bg-white/10 border-2 border-pink-500" />
                                           )}
                                        </div>
                                        <div className="ml-4 flex-1">
                                           <p className="text-sm font-bold text-white flex items-center gap-2">Happy Birthday! <span className="text-xl">🎂</span></p>
                                           <p className="text-xs font-semibold text-pink-400 mt-0.5">{bu.name} <span className="text-white/40 font-normal border-l border-white/20 pl-2 ml-2">Room {bu.room}</span></p>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            ), { duration: 5000 });
                         });
                      }
                   }}
                   className={`h-20 md:h-28 rounded-xl p-1 md:p-2 relative flex flex-col items-center border 
                     ${daySchedules.length > 0 ? (daySchedules.some(s => s.assignedUser === userData?.uid) ? 'bg-orange-500/20 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/50' : 'bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]') : 'bg-white/5 border-transparent'} 
                     ${isBirthday ? 'cursor-pointer hover:bg-pink-500/10 ring-2 ring-pink-500/50' : ''} transition-all`}
                 >
                   <span className={`absolute top-1 md:top-2 left-1.5 md:left-2 text-[10px] md:text-sm font-bold ${daySchedules.some(s => s.assignedUser === userData?.uid) ? 'text-orange-400' : isBirthday ? 'text-pink-400' : 'text-white/60'}`}>{format(day, "d")}</span>
                   
                   {isBirthday && (
                      <span className={`absolute animate-pulse ${daySchedules.length > 0 ? 'bottom-1 right-1 md:bottom-2 md:right-2 text-sm md:text-lg' : 'top-1 right-1 md:top-1 md:right-2 text-sm md:text-2xl z-10'}`}>🎂</span>
                   )}

                   {daySchedules.length > 0 ? (
                      <div className="w-full mt-auto flex justify-center gap-1 md:gap-2 flex-wrap h-full pt-4 md:pt-6 pb-0.5">
                         {daySchedules.map(sch => {
                            const user = usersMap[sch.assignedUser];
                            if (!user) return null;
                            const isMe = sch.assignedUser === userData?.uid;
                            return (
                               <div key={sch.id} className="flex flex-col items-center justify-end h-full">
                                  {user.profileImage ? (
                                     <img src={user.profileImage} alt={user.name} className={`w-5 h-5 md:w-8 md:h-8 rounded-full object-cover border shadow-md ${isMe ? 'border-orange-400/80 shadow-[0_0_8px_rgba(249,115,22,0.3)] ring-1 ring-orange-500/50' : 'border-indigo-400/50'}`} />
                                  ) : (
                                     <div className={`w-5 h-5 md:w-8 md:h-8 rounded-full bg-white/10 border shadow-md ${isMe ? 'border-orange-400/80 ring-1 ring-orange-500/50' : 'border-indigo-400/50'}`} />
                                  )}
                                  <span className={`text-[7px] md:text-[10px] font-bold mt-0.5 truncate max-w-[32px] md:max-w-[44px] text-center mix-blend-screen leading-none ${isMe ? 'text-orange-300 drop-shadow-[0_0_2px_rgba(249,115,22,0.8)]' : 'text-white'}`}>{user.name.split(" ")[0]}</span>
                               </div>
                            );
                         })}
                      </div>
                   ) : (
                      <div className="mt-auto mb-1 md:mb-2 text-[8px] md:text-[10px] text-white/20 italic truncate leading-none">Open date</div>
                   )}
                 </div>
               )
            })}
         </div>
      </div>

      <div className="glass-panel p-6 mx-4 mb-12">
         <h3 className="text-lg font-bold text-white flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
               <CalendarIcon className="w-4 h-4 text-orange-400" />
            </span>
            Upcoming Assignments
         </h3>
         <div className="space-y-4">
           {schedules.filter(s => new Date(s.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 5).map(s => {
             const u = usersMap[s.assignedUser];
             if (!u) return null;
             return (
               <div key={s.id} className="glass-card hover:bg-white/10 transition-colors p-4 flex items-center justify-between border border-transparent hover:border-orange-500/30">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {u.profileImage ? (
                        <img src={u.profileImage} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1b2e] bg-emerald-500"></div>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{u.name}</div>
                      <div className="text-white/40 text-xs mt-0.5">Room {u.room}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-sm md:text-md">{s.date}</div>
                    <div className="text-xs text-white/50 mt-1 uppercase tracking-wider">{format(new Date(s.date), "EEEE")}</div>
                  </div>
               </div>
             )
           })}
           {schedules.filter(s => new Date(s.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
             <div className="text-center py-6 text-white/50 text-sm">No upcoming cooking schedules.</div>
           )}
         </div>
      </div>
      
      <AssignCookingModal 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
      />
    </div>
  );
}
