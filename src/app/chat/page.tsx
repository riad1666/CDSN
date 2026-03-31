"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { MessageSquare, Users, User, ArrowRight } from "lucide-react";
import { subscribeToUserGroups, subscribeToPersonalTrades, Group, PersonalTrade, UserBasicInfo, getApprovedUsers } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ChatWindow } from "@/components/ChatWindow";

export default function ChatPage() {
  const { userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [trades, setTrades] = useState<PersonalTrade[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  
  const [selectedChat, setSelectedChat] = useState<{ id: string; name: string; type: "group" | "private" } | null>(null);

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
    <div className="h-[calc(100vh-180px)] flex gap-8 pb-4">
      {/* 1. Conversations Sidebar */}
      <div className="w-full md:w-80 flex flex-col space-y-6 shrink-0 h-full">
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Comm Link</h2>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Secure Neural Channels</p>
         </div>

         <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
            {/* Group Channels */}
            <div className="space-y-4">
               <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Clusters</span>
               </div>
               {groups.map(g => (
                  <div 
                     key={g.id}
                     onClick={() => setSelectedChat({ id: g.id, name: g.name, type: "group" })}
                     className={`glass-card p-4 cursor-pointer transition-all flex items-center gap-4 group ${selectedChat?.id === g.id ? 'bg-primary/20 border-primary/40 ring-1 ring-primary/40' : 'bg-white/2 border-white/5 hover:border-white/20'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedChat?.id === g.id ? 'bg-primary text-white' : 'bg-white/5 text-white/20'}`}>
                        <Users className="w-5 h-5" />
                     </div>
                     <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate uppercase italic">{g.name}</h4>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest font-black mt-1 truncate">
                           {g.memberIds.length} Agents Active
                        </p>
                     </div>
                  </div>
               ))}
               {groups.length === 0 && <p className="text-[9px] text-white/20 font-black uppercase text-center py-4 italic">No Clusters Active</p>}
            </div>

            {/* Private Channels */}
            <div className="space-y-4">
               <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">P2P Lines</span>
               </div>
               {trades.map(t => {
                  const otherUserId = t.participants.find(id => id !== userData.uid) || "";
                  const otherUser = usersMap[otherUserId];
                  const chatName = otherUser?.name || "Unknown Agent";
                  return (
                     <div 
                        key={t.id}
                        onClick={() => setSelectedChat({ id: t.id, name: chatName, type: "private" })}
                        className={`glass-card p-4 cursor-pointer transition-all flex items-center gap-4 group ${selectedChat?.id === t.id ? 'bg-indigo-500/20 border-indigo-500/40 ring-1 ring-indigo-500/40' : 'bg-white/2 border-white/5 hover:border-white/20'}`}
                     >
                        <div className="shrink-0 relative">
                           {otherUser?.profileImage ? (
                              <img src={otherUser.profileImage} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
                           ) : (
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 text-xs font-black italic">
                                 {chatName.charAt(0)}
                              </div>
                           )}
                           <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-background"></div>
                        </div>
                        <div className="min-w-0">
                           <h4 className="text-xs font-black text-white truncate uppercase italic">{chatName}</h4>
                           <p className="text-[8px] text-indigo-400/50 uppercase tracking-widest font-black mt-1 truncate">
                              Secure Handshake
                           </p>
                        </div>
                     </div>
                  );
               })}
               {trades.length === 0 && <p className="text-[9px] text-white/20 font-black uppercase text-center py-4 italic">No P2P Links Found</p>}
            </div>
         </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 h-full hidden md:block">
         <AnimatePresence mode="wait">
            {selectedChat ? (
               <motion.div 
                 key={selectedChat.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="h-full"
               >
                  <ChatWindow 
                     chatId={selectedChat.id}
                     chatName={selectedChat.name}
                     type={selectedChat.type}
                  />
               </motion.div>
            ) : (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="h-full glass-card rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6"
               >
                  <div className="w-24 h-24 rounded-[2.5rem] bg-white/2 border border-white/5 flex items-center justify-center opacity-20">
                     <MessageSquare className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-xl font-black text-white/20 tracking-tighter uppercase italic">Select Transmission</h3>
                     <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">Establish Secure Link to Continue</p>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Mobile Overlay Chat */}
      <div className="md:hidden">
         {selectedChat && (
            <div className="fixed inset-0 z-100 bg-background p-4">
               <button 
                  onClick={() => setSelectedChat(null)}
                  className="mb-4 flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest"
               >
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to Link
               </button>
               <div className="h-[calc(100vh-100px)]">
                  <ChatWindow 
                     chatId={selectedChat.id}
                     chatName={selectedChat.name}
                     type={selectedChat.type}
                  />
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
