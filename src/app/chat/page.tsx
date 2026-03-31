"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { MessageSquare, Users, User, ArrowRight } from "lucide-react";
import { subscribeToUserGroups, subscribeToPersonalTrades, Group, PersonalTrade, UserBasicInfo, getApprovedUsers } from "@/lib/firebase/firestore";
import { ChatDrawer } from "@/components/ChatDrawer";

export default function ChatPage() {
  const { userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [trades, setTrades] = useState<PersonalTrade[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  
  const [monitoringChat, setMonitoringChat] = useState<{ id: string; name: string; type: "group" | "private" } | null>(null);

  useEffect(() => {
    if (!userData?.uid) return;
    
    const unsubGroups = subscribeToUserGroups(userData.uid, setGroups);
    const unsubTrades = subscribeToPersonalTrades(userData.uid, setTrades);
    
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    return () => {
       unsubGroups();
       unsubTrades();
    };
  }, [userData?.uid]);

  if (!userData?.uid) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                 <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              Comm Link
           </h2>
           <p className="text-[10px] text-primary mt-2 font-black uppercase tracking-[0.3em]">Encrypted Network Channels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section className="glass-panel p-8 border-primary/20">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
               <Users className="w-5 h-5 text-primary" /> Active Clusters
            </h3>
            <div className="space-y-4">
               {groups.length === 0 && (
                  <div className="p-8 text-center text-white/30 uppercase font-bold tracking-widest text-[10px] border border-dashed border-white/10 rounded-xl">No active group connections</div>
               )}
               {groups.map(g => (
                  <div 
                     key={g.id}
                     onClick={() => setMonitoringChat({ id: g.id, name: g.name, type: "group" })}
                     className="glass-card p-5 group cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between"
                  >
                     <div>
                        <h4 className="text-white font-black">{g.name}</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1.5 flex items-center gap-2">
                           {g.memberIds.length} Agents connected
                        </p>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>
               ))}
            </div>
         </section>

         <section className="glass-panel p-8 border-indigo-500/20">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
               <User className="w-5 h-5 text-indigo-400" /> Private Channels
            </h3>
            <div className="space-y-4">
               {trades.length === 0 && (
                  <div className="p-8 text-center text-white/30 uppercase font-bold tracking-widest text-[10px] border border-dashed border-white/10 rounded-xl">No P2P trades initiated</div>
               )}
               {trades.map(t => {
                  const otherUserId = t.participants.find(id => id !== userData.uid) || "";
                  const otherUser = usersMap[otherUserId];
                  const chatName = otherUser?.name || "Unknown Agent";
                  return (
                     <div 
                        key={t.id}
                        onClick={() => setMonitoringChat({ id: t.id, name: chatName, type: "private" })}
                        className="glass-card p-5 group cursor-pointer hover:border-indigo-500/40 transition-all flex items-center justify-between"
                     >
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              {otherUser?.profileImage ? (
                                 <img src={otherUser.profileImage} className="w-12 h-12 rounded-xl object-cover border-2 border-white/5 group-hover:border-indigo-400 transition-colors" />
                              ) : (
                                 <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl uppercase italic tracking-tighter shadow-lg shadow-indigo-500/10">
                                    {chatName.substring(0, 1)}
                                 </div>
                              )}
                           </div>
                           <div>
                              <h4 className="text-white font-black">{chatName}</h4>
                              <p className="text-[10px] text-indigo-400/50 uppercase tracking-widest font-bold mt-1.5 flex items-center gap-2">
                                 P2P Secure Line
                              </p>
                           </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                           <ArrowRight className="w-4 h-4" />
                        </div>
                     </div>
                  );
               })}
            </div>
         </section>
      </div>

       <ChatDrawer 
         isOpen={!!monitoringChat}
         onClose={() => setMonitoringChat(null)}
         chatId={monitoringChat?.id || ""}
         chatName={monitoringChat?.name || ""}
         type={monitoringChat?.type || "group"}
       />
    </div>
  );
}
