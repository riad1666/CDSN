"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { subscribeToNotifications, AppNotification } from "@/lib/firebase/firestore";
import { Bell, CheckCircle, Clock } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { format } from "date-fns";

export default function NotificationsPage() {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userData?.uid) return;
    const unsub = subscribeToNotifications(userData.uid, (data) => setNotifications(data));
    return () => unsub();
  }, [userData?.uid]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { status: "read" });
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => n.status === "unread").map(n => n.id);
    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  if (!userData?.uid) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                 <Bell className="w-6 h-6 text-amber-400" />
              </div>
              Neural Feed
           </h2>
           <p className="text-[10px] text-amber-400 mt-2 font-black uppercase tracking-[0.3em]">Personalized Event Stream</p>
        </div>
        {notifications.some(n => n.status === "unread") && (
          <button 
             onClick={markAllAsRead}
             className="glass-button py-2.5 px-6 text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10"
          >
             Clear Backlog
          </button>
        )}
      </div>

      <div className="glass-panel p-6 border-white/5">
         {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <Bell className="w-12 h-12 text-white mb-4" />
               <p className="text-white font-bold uppercase tracking-widest text-[10px]">No new incoming transmissions.</p>
            </div>
         ) : (
            <div className="space-y-2">
               {notifications.map(notif => (
                  <div 
                     key={notif.id} 
                     className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                        notif.status === "unread" 
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.1)]' 
                        : 'bg-white/2 border-white/5 opacity-60 hover:opacity-100'
                     }`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.status === "unread" ? 'bg-amber-500/20' : 'bg-white/5'
                     }`}>
                        <Bell className={`w-4 h-4 ${notif.status === "unread" ? 'text-amber-400' : 'text-white/40'}`} />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                           <p className={`text-sm ${notif.status === "unread" ? 'text-white font-bold' : 'text-white/80'}`}>
                              {notif.message}
                           </p>
                           {notif.status === "unread" && (
                              <button 
                                 onClick={() => markAsRead(notif.id)}
                                 className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-white text-white/40 transition-colors shrink-0"
                              >
                                 <CheckCircle className="w-4 h-4" />
                              </button>
                           )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           <Clock className="w-3 h-3 text-white/30" />
                           <span className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none">
                              {notif.createdAt ? format(new Date(notif.createdAt), "MMM dd, HH:mm") : "Unknown"}
                           </span>
                           <span className="text-[10px] text-amber-400/50 uppercase font-black tracking-widest leading-none px-2 border-l border-white/10">
                              {notif.type.replace(/_/g, " ")}
                           </span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}
