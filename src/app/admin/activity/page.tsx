"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  UserPlus, 
  CheckCircle2, 
  Settings, 
  MessageSquare,
  History,
  Clock,
  Filter
} from "lucide-react";
import { subscribeToAllActivities } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_ICONS: Record<string, any> = {
  expense: { icon: ShoppingBag, color: "bg-blue-500", label: "EXPENSE" },
  user: { icon: UserPlus, color: "bg-green-500", label: "USER" },
  settlement: { icon: CheckCircle2, color: "bg-purple-500", label: "SETTLEMENT" },
  edit: { icon: Settings, color: "bg-orange-500", label: "EDIT" },
  message: { icon: MessageSquare, color: "bg-indigo-500", label: "MESSAGE" },
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const unsub = subscribeToAllActivities(setActivities);
    return () => unsub();
  }, []);

  const filteredActivities = activities.filter(a => {
    if (filter === "all") return true;
    return a.type.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Activity Log</h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1 italic">Real-time tracking of all platform activities</p>
        </div>
        <div className="flex bg-[#131422] p-1.5 rounded-2xl border border-white/5">
            <button 
                onClick={() => setFilter("all")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "all" ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                All Feed
            </button>
            <button 
                onClick={() => setFilter("expense")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "expense" ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                Expenses
            </button>
            <button 
                onClick={() => setFilter("user")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "user" ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                Neural Links
            </button>
        </div>
      </header>

      {/* TIMELINE FEED */}
      <div className="relative space-y-6 before:absolute before:left-10 before:top-0 before:bottom-0 before:w-px before:bg-white/5 pt-4">
        {filteredActivities.length > 0 ? filteredActivities.map((activity, i) => {
          const type = activity.type.toLowerCase().includes('expense') ? 'expense' : 
                       activity.type.toLowerCase().includes('user') ? 'user' :
                       activity.type.toLowerCase().includes('settlement') ? 'settlement' :
                       activity.type.toLowerCase().includes('edit') ? 'edit' : 'message';
          const cfg = ACTIVITY_ICONS[type];
          
          return (
            <div key={i} className="relative pl-20 group">
              {/* Dot / Icon */}
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl border-2 border-[#070810] flex items-center justify-center text-white shadow-xl transition-all duration-300 group-hover:scale-110 z-10 ${cfg.color}`}>
                <cfg.icon className="w-5 h-5 shrink-0" />
              </div>

              {/* Card */}
              <div className="bg-[#131422] border border-white/5 p-8 rounded-4xl hover:border-purple-500/30 hover:bg-white/3 transition-all flex items-center justify-between shadow-lg">
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-3">
                     <p className="text-white font-black text-xs uppercase tracking-tight italic">
                        <span className="text-purple-500">{activity.actorName || "Neural Identity"}</span> {activity.message}
                     </p>
                     <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${cfg.color} text-white/90`}>{cfg.label}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic">{activity.groupName || "System Neutral"}</p>
                    <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic">{activity.id.substring(0, 10).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                   <div className="flex items-center gap-2 text-white/10 font-black text-[10px] uppercase tracking-widest italic group-hover:text-white/40 transition-colors">
                      <Clock className="w-4 h-4" />
                      {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Neural Delay'}
                   </div>
                </div>
              </div>
            </div>
          );
        }) : (
            <div className="py-20 text-center flex flex-col items-center">
                 <History className="w-16 h-16 text-white/5 mb-6" />
                 <p className="text-white/10 font-bold uppercase tracking-[0.3em] italic">Timeline Synchronizing... No Patterns Detected</p>
            </div>
        )}
      </div>

      <div className="pt-10 text-center border-t border-white/5 mt-20">
         <p className="text-white/10 font-black uppercase tracking-[0.5em] text-[8px] italic shadow-[0_0_20px_rgba(168,85,247,0.1)]">End of Neural Activity Stream</p>
      </div>
    </div>
  );
}
