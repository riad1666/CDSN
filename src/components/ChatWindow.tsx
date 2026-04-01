"use client";

import { useAuth } from "@/context/AuthContext";
import { ChatMessage, sendMessage, subscribeToMessages, markChatAsRead, UserBasicInfo, getApprovedUsers } from "@/lib/firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { Send, Loader2, MessageSquare, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface ChatWindowProps {
  chatId: string;
  chatName: string;
  type: "group" | "private";
}

export function ChatWindow({ chatId, chatName, type }: ChatWindowProps) {
  const { userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    const unsubMessages = subscribeToMessages(chatId, (data) => {
      setMessages(data);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      if (err?.code === 'failed-precondition') {
        toast.error("Database indexes are still building. Please wait a few minutes.");
      } else {
        toast.error("Connection lost. Retrying...");
      }
    });

    if (userData?.uid) {
      markChatAsRead(userData.uid, chatId);
    }

    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    return () => unsubMessages();
  }, [chatId, userData?.uid]);

  useEffect(() => {
    if (messages.length > 0 && userData?.uid) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== userData.uid) {
        markChatAsRead(userData.uid, chatId);
      }
    }
  }, [messages.length, chatId, userData?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userData?.uid) return;

    try {
      await sendMessage(chatId, type, userData.uid, newMessage.trim());
      setNewMessage("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/[0.01] rounded-[2rem] overflow-hidden border border-white/5">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${type === 'group' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'}`}>
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-black text-lg tracking-tight uppercase italic">{chatName}</h3>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
               <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">
                 {type === 'group' ? 'Multi-Agent Channel' : 'P2P Secure Line'}
               </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
           <Shield className="w-3.5 h-3.5 text-white/20" />
           <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Encrypted</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Syncing Feed...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
              <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-white" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.3em] italic">Awaiting initial transmission</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === userData?.uid;
            const sender = usersMap[msg.senderId];
            const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {showAvatar && !isMe && (
                  <div className="flex items-center gap-2 ml-1 mb-2">
                     {sender?.profileImage ? (
                        <img src={sender.profileImage} className="w-5 h-5 rounded-lg object-cover" />
                     ) : (
                        <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center text-[8px] text-white/40 font-black uppercase">{sender?.name.charAt(0)}</div>
                     )}
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                       {sender?.name || "Unknown"}
                     </span>
                  </div>
                )}
                <div className={`group relative max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-5 rounded-[2rem] text-sm leading-relaxed font-medium ${
                    isMe 
                      ? 'bg-linear-to-br from-primary to-magenta-600 text-white rounded-tr-none shadow-xl shadow-primary/20' 
                      : 'bg-white/5 text-white/80 rounded-tl-none border border-white/10 backdrop-blur-md'
                  }`}>
                    {msg.text}
                    <div className={`text-[8px] mt-2 opacity-40 font-black uppercase tracking-tighter ${isMe ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : "..."}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-8 bg-white/[0.02] border-t border-white/5 backdrop-blur-md">
        <form onSubmit={handleSend} className="relative group">
          <div className="absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background/40 to-transparent pointer-events-none"></div>
          <input 
            type="text"
            placeholder="Secure transmission..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-8 pr-16 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-medium"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:grayscale"
          >
            <Send className="w-5 h-5 pointer-events-none" />
          </button>
        </form>
      </div>
    </div>
  );
}
