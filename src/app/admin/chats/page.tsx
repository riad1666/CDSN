"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  Shield, 
  Clock, 
  Users, 
  User, 
  Send, 
  MoreVertical,
  ChevronLeft
} from "lucide-react";
import { getAllGroups, getAllPersonalTrades, subscribeToMessages } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";

export default function ChatMonitoringPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatType, setChatType] = useState<"group" | "private">("group");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const unsub = subscribeToMessages(selectedChat.id, setMessages);
      return () => unsub();
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  const loadChats = async () => {
    const [g, t] = await Promise.all([getAllGroups(), getAllPersonalTrades()]);
    setGroups(g);
    setTrades(t);
  };

  const currentList = chatType === "group" ? groups : trades;
  const filteredList = currentList.filter(c => 
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.participants?.join(" ") || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Chat Monitoring</h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Monitor group and private conversations</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Shield className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Admin Monitoring Mode Active</span>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* CHAT LIST */}
        <div className="w-96 flex flex-col bg-[#131422] rounded-[2.5rem] border border-white/5 overflow-hidden shrink-0">
            <div className="p-6 space-y-6">
                <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
                    <button 
                        onClick={() => { setChatType("group"); setSelectedChat(null); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            chatType === "group" ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" /> Group Chats
                    </button>
                    <button 
                        onClick={() => { setChatType("private"); setSelectedChat(null); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            chatType === "private" ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
                        }`}
                    >
                        <User className="w-3.5 h-3.5" /> Private Chats
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search chats..." 
                        className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-hidden focus:border-purple-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {filteredList.map((chat) => (
                    <button 
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`w-full text-left p-6 border-b border-white/5 transition-all group flex items-center gap-4 ${
                            selectedChat?.id === chat.id ? 'bg-white/5' : 'hover:bg-white/3'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center font-black italic text-xl ${
                            chatType === "group" ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                            {chat.profileImage ? <img src={chat.profileImage} className="w-full h-full object-cover" /> : (chat.name || "P")?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-white font-black text-xs uppercase tracking-tight truncate">{chat.name || `Chat with ${chat.participants?.[0].substring(0,8)}`}</p>
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic">{chat.lastActivity ? formatDistanceToNow(new Date(chat.lastActivity), { addSuffix: false }) : 'Now'}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] font-medium text-white/30 truncate pr-4 italic">
                                    {chat.lastMessage?.text || "No Neural Data..."}
                                </p>
                                {chat.unreadCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[8px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)]">{chat.unreadCount}</span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* CHAT VIEW */}
        <div className="flex-1 bg-[#131422] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col relative">
            {!selectedChat ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-white/3 rounded-full flex items-center justify-center text-purple-500/20 border border-white/5 mb-8 shadow-2xl">
                        <MessageSquare className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Neural Link Selected</h3>
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 max-w-xs">Select a secure conversation stream from the list to begin platform oversight</p>
                </div>
            ) : (
                <>
                    {/* Chat Header */}
                    <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center">
                                {selectedChat.profileImage ? <img src={selectedChat.profileImage} className="w-full h-full object-cover" /> : (selectedChat.name || "P")?.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-tight italic">{selectedChat.name || "Private Protocol"}</h4>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5 italic">Real-time Stream Intercepted</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/30 hover:text-white transition-all"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                    </header>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar scroll-smooth">
                         {messages.map((msg, i) => (
                             <div key={i} className="flex flex-col gap-2 max-w-[80%] mx-auto first:mt-10">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">{msg.senderId?.substring(0,8)}</span>
                                     <span className="text-[8px] font-medium text-white/10 uppercase italic">Intercepted at {msg.timestamp?.toDate?.().toLocaleTimeString() || 'Now'}</span>
                                 </div>
                                 <div className="bg-white/3 border border-white/5 p-6 rounded-3xl rounded-tl-none relative group">
                                     <p className="text-xs text-white/80 leading-relaxed font-bold italic">"{msg.text}"</p>
                                     <div className="absolute -left-1 top-0 w-1 h-3 bg-purple-500"></div>
                                 </div>
                             </div>
                         ))}
                         {messages.length === 0 && (
                            <div className="h-full flex items-center justify-center italic text-white/10 font-bold uppercase tracking-widest text-xs">
                                End of Stream
                            </div>
                         )}
                    </div>
                </>
            )}
            
            {/* Dark background vignette for depth */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
        </div>
      </div>
    </div>
  );
}
