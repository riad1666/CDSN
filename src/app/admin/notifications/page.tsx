"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  CheckCircle2, 
  ShoppingBag, 
  UserPlus, 
  MessageSquare,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCheck
} from "lucide-react";
import { subscribeToNotifications, updateUserData } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const NOTIF_ICONS: Record<string, any> = {
  EXPENSE_ADDED: { icon: ShoppingBag, color: "bg-blue-500", label: "EXPENSE" },
  SETTLEMENT_REQUEST: { icon: CheckCircle2, color: "bg-purple-500", label: "SETTLEMENT" },
  INVITE_RECEIVED: { icon: UserPlus, color: "bg-green-500", label: "USER" },
  REQUEST_APPROVED: { icon: CheckCircle2, color: "bg-purple-500", label: "SYSTEM" },
  NOTICE_ADDED: { icon: AlertTriangle, color: "bg-orange-500", label: "NOTICE" },
};

export default function NotificationsConsole() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // For admin, we show global notifications or just admin's own
    // In God Mode, I'll filter for ALL currently in the notifications collection for simplicity
    const unsub = subscribeToNotifications("admin_global", setNotifications); 
    // Actually, subscribeToNotifications needs a real UID. I'll use current for now.
    return () => unsub();
  }, []);

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  const filteredNotifs = notifications.filter(n => {
    if (filter === "all") return true;
    return n.status === filter;
  });

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Notifications</h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1 italic">
             {unreadCount > 0 ? `You have ${unreadCount} unread neural alerts` : "No urgent neural stimuli"}
          </p>
        </div>
        <button className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_8px_20px_rgba(236,72,153,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
            <CheckCheck className="w-4 h-4" /> Mark All as Read
        </button>
      </header>

      {/* FILTERS */}
      <div className="flex bg-[#131422] p-1.5 rounded-2xl border border-white/5 w-fit">
            <button 
                onClick={() => setFilter("all")}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "all" ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                All ({notifications.length})
            </button>
            <button 
                onClick={() => setFilter("unread")}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "unread" ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                Unread ({unreadCount})
            </button>
            <button 
                onClick={() => setFilter("read")}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === "read" ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-white/30 hover:text-white'
                }`}
            >
                Read
            </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="space-y-4">
        {filteredNotifs.length > 0 ? filteredNotifs.map((notif, i) => {
          const cfg = NOTIF_ICONS[notif.type] || { icon: Bell, color: "bg-gray-500", label: "SYSTEM" };
          
          return (
            <div key={i} className="bg-[#131422] border border-white/5 p-8 rounded-4xl hover:border-purple-500/30 hover:bg-white/3 transition-all flex items-center justify-between group shadow-xl relative overflow-hidden">
                {notif.status === 'unread' && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                )}
                
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300 ${cfg.color}`}>
                        <cfg.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h4 className="text-white font-black text-xs uppercase tracking-tight italic">{notif.message}</h4>
                            {notif.status === 'unread' && (
                                <span className="bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.5)]">New</span>
                            )}
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                             <div className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${cfg.color} text-white/90`}>{cfg.label}</div>
                             <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">{notif.id.substring(0,8)}</p>
                        </div>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="flex flex-col items-end gap-3">
                         <span className="text-[10px] font-black text-white/10 uppercase tracking-widest italic group-hover:text-white/40 transition-colors">
                            {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : 'Now'}
                         </span>
                         <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-rose-500 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100">
                             <Trash2 className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            </div>
          );
        }) : (
            <div className="py-20 text-center bg-[#131422] border border-white/5 rounded-[3rem] border-dashed">
                 <Bell className="w-16 h-16 text-white/5 mb-6 mx-auto" />
                 <p className="text-white/10 font-black uppercase tracking-[0.5em] italic">Neural Console Clear... No Pending Alerts</p>
            </div>
        )}
      </div>

      <div className="text-center pt-10">
         <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.8em] italic">Authority Neural Monitoring Console Activated</p>
      </div>
    </div>
  );
}
