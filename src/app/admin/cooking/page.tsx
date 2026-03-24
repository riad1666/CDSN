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
               const schedule = schedules.find(s => s.date === dateStr);
               const user = schedule ? usersMap[schedule.assignedUser] : null;
               
               return (
                 <div key={day.toString()} className={`h-28 rounded-xl p-2 relative flex flex-col items-center justify-center border group ${schedule ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/5 border-transparent hover:bg-white/10'} transition-all`}>
                   <span className="absolute top-2 left-2 text-sm font-bold text-white/60">{format(day, "d")}</span>
                   
                   {schedule && (
                     <button onClick={() => handleDelete(schedule.id)} className="absolute top-2 right-2 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}

                   {user ? (
                     <div className="mt-4 flex flex-col items-center">
                       {user.profileImage ? (
                          <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-indigo-400" />
                       ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10" />
                       )}
                       <span className="text-[10px] font-bold text-white mt-1 truncate max-w-[80px] text-center">{user.name.split(" ")[0]}</span>
                     </div>
                   ) : (
                     <div className="mt-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setSelectedDate(dateStr); setIsOpen(true); }} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-primary transition-colors">
                         <Plus className="w-4 h-4" />
                       </button>
                     </div>
                   )}
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
