"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getApprovedUsers, UserBasicInfo } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

interface CookingSchedule {
  id: string;
  date: string;
  assignedUser: string;
}

export default function AdminCookingPage() {
  const [schedules, setSchedules] = useState<CookingSchedule[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedUser) return toast.error("Select date and user");
    
    const existing = schedules.find(s => s.date === selectedDate);
    if (existing) return toast.error("Date already assigned. Please delete the existing assignment first.");
    
    setLoading(true);
    try {
      await addDoc(collection(db, "cookingSchedules"), {
        date: selectedDate,
        assignedUser: selectedUser
      });
      toast.success("Assigned successfully");
      setIsOpen(false);
      setSelectedDate("");
      setSelectedUser("");
    } catch(err) { toast.error("Failed to assign"); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove assignment?")) return;
    try {
      await deleteDoc(doc(db, "cookingSchedules", id));
      toast.success("Removed assignment");
    } catch(err) { toast.error("Failed to remove"); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Cooking Schedule</h2>
          <p className="text-white/60 text-sm">Assign users to daily cooking duties</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="glass-button py-2.5 px-5 text-sm">
          <Plus className="w-4 h-4" /> Assign Duty
        </button>
      </div>

      <div className="glass-panel p-6">
         <div className="flex items-center justify-between mb-8">
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

         <div className="grid grid-cols-7 gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-white/50 text-sm font-semibold py-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-28 rounded-xl bg-white/5 opacity-50"></div>
            ))}
            
            {days.map(day => {
               const dateStr = format(day, "yyyy-MM-dd");
               const daySchedules = schedules.filter(s => s.date === dateStr);
               
               const bDayMonthDay = format(day, "MM-dd");
               const bdayUsers = Object.values(usersMap).filter(u => u.dob && u.dob.slice(5) === bDayMonthDay);
               const isBirthday = bdayUsers.length > 0;
               
               return (
                 <div key={day.toString()} className={`h-28 rounded-xl p-2 relative flex flex-col items-center justify-center border group ${daySchedules.length > 0 ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/5 border-transparent hover:bg-white/10'} ${isBirthday ? 'ring-2 ring-pink-500/50 hover:bg-pink-500/10' : ''} transition-all`}>
                   <span className={`absolute top-2 left-2 text-sm font-bold ${isBirthday ? 'text-pink-400' : 'text-white/60'}`}>{format(day, "d")}</span>
                   
                   {isBirthday && (
                      <button onClick={(e) => {
                         e.stopPropagation();
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
                                        <div className="ml-4 flex-1 text-left">
                                           <p className="text-sm font-bold text-white flex items-center gap-2">Happy Birthday! <span className="text-xl">🎂</span></p>
                                           <p className="text-xs font-semibold text-pink-400 mt-0.5">{bu.name} <span className="text-white/40 font-normal border-l border-white/20 pl-2 ml-2">Room {bu.room}</span></p>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            ), { duration: 5000 });
                         });
                      }} className={`absolute drop-shadow-md animate-pulse hover:scale-110 transition-transform ${daySchedules.length > 0 ? 'bottom-2 right-2 text-lg' : 'top-1 right-2 text-2xl z-10'}`}>🎂</button>
                   )}

                   <div className="w-full mt-4 flex justify-center gap-1.5 flex-wrap">
                      {daySchedules.map(sch => {
                         const user = usersMap[sch.assignedUser];
                         if (!user) return null;
                         return (
                            <div key={sch.id} className="relative group/user flex flex-col items-center">
                               {user.profileImage ? (
                                  <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-indigo-400" />
                               ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/10" />
                               )}
                               <span className="text-[10px] font-bold text-white mt-1 truncate max-w-[40px] text-center leading-none">{user.name.split(" ")[0]}</span>
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(sch.id); }} className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-1 opacity-0 group-hover/user:opacity-100 transition-opacity z-10 w-4 h-4 flex items-center justify-center">
                                  <Trash2 className="w-3 h-3 text-white" />
                               </button>
                            </div>
                         );
                      })}

                      {daySchedules.length < 2 && (
                         <div className="mt-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity w-full">
                           <button onClick={() => { setSelectedDate(dateStr); setIsOpen(true); }} className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-primary transition-colors">
                             <Plus className="w-3 h-3" />
                           </button>
                         </div>
                      )}
                   </div>
                 </div>
               )
            })}
         </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm p-6 relative">
             <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
             <h2 className="text-2xl font-bold text-white mb-6">Assign Duty</h2>
             <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 uppercase">Date</label>
                  <input type="date" className="w-full glass-input" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 uppercase">User</label>
                  <select className="w-full glass-input appearance-none bg-[#1a1b2e]/80" value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} required>
                    <option value="">Select a user...</option>
                    {Object.values(usersMap).map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} (Room {u.room})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full glass-button mt-6 text-sm">
                  {loading ? "Assigning..." : "Confirm Assignment"}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
