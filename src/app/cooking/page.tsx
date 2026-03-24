"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getApprovedUsers, UserBasicInfo } from "@/lib/firebase/firestore";

interface CookingSchedule {
  id: string;
  date: string;
  assignedUser: string;
}

export default function CookingPage() {
  const [schedules, setSchedules] = useState<CookingSchedule[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const q = query(collection(db, "cookingSchedules"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: CookingSchedule[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as CookingSchedule));
      setSchedules(data);
    });
    return () => unsub();
  }, []);

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
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
           Cooking Schedule
        </h2>
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
               const schedule = schedules.find(s => s.date === dateStr);
               const user = schedule ? usersMap[schedule.assignedUser] : null;
               
               return (
                 <div key={day.toString()} className={`h-20 md:h-28 rounded-xl p-2 relative flex flex-col items-center justify-center border ${schedule ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-transparent hover:bg-white/10'} transition-all`}>
                   <span className="absolute top-2 left-2 md:left-3 text-xs md:text-sm font-bold text-white/60">{format(day, "d")}</span>
                   {user && (
                     <div className="mt-3 md:mt-6 flex flex-col items-center">
                       {user.profileImage ? (
                          <img src={user.profileImage} alt={user.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-indigo-400" />
                       ) : (
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10" />
                       )}
                       <span className="text-[9px] md:text-[10px] font-bold text-white mt-1 truncate max-w-full px-1 text-center">{user.name.split(" ")[0]}</span>
                     </div>
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
    </div>
  );
}
