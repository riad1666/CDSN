"use client";

import { useAuth } from "@/context/AuthContext";
import { ChatMessage, sendMessage, subscribeToMessages, markChatAsRead, UserBasicInfo, getApprovedUsers } from "@/lib/firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { X, Send, User as UserIcon, Loader2, MessageSquare, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  type: "group" | "private";
}

export function ChatDrawer({ isOpen, onClose, chatId, chatName, type }: ChatDrawerProps) {
  const { userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !isOpen) return;

    // Only set loading if we don't have messages for this chat yet or chatId changed
    setLoading(true);
    
    const unsubMessages = subscribeToMessages(chatId, (data) => {
      setMessages(data);
      setLoading(false);
    });

    // Mark as read once when opening or when chatId changes
    if (userData?.uid) {
      markChatAsRead(userData.uid, chatId);
    }

    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    return () => unsubMessages();
  }, [chatId, isOpen, userData?.uid]);

  // Handle marking as read for subsequent new messages while open
  useEffect(() => {
    if (isOpen && messages.length > 0 && userData?.uid) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== userData.uid) {
        markChatAsRead(userData.uid, chatId);
      }
    }
  }, [messages.length, isOpen, chatId, userData?.uid]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-[#0f101a] border-l border-white/10 h-full flex flex-col pointer-events-auto shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'group' ? 'bg-primary/20 text-primary' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">{chatName}</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                {type === 'group' ? 'Group Chat' : 'Private Direct'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-white/20 text-xs font-medium italic">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === userData?.uid;
              const sender = usersMap[msg.senderId];
              const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && !isMe && (
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1 mb-1">
                      {sender?.name || "Member"}
                    </span>
                  )}
                  <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-primary text-white rounded-tr-none shadow-[0_5px_15px_rgba(var(--color-primary),0.2)]' 
                        : 'bg-white/5 text-white/80 rounded-tl-none border border-white/5'
                    }`}>
                      {msg.text}
                      <div className={`text-[8px] mt-1.5 opacity-40 font-bold text-right`}>
                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : "..."}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white/2 border-t border-white/5">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[8px] text-white/20 mt-2 text-center uppercase tracking-[0.2em] font-black">
            End-to-end Encrypted by CDSN
          </p>
        </div>
      </motion.div>
    </div>
  );
}
