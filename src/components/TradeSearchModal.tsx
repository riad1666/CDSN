"use client";

import { useState } from "react";
import { X, Search, Loader2, UserPlus, CreditCard } from "lucide-react";
import { searchUsersByStudentId, findOrCreatePersonalTrade, UserBasicInfo } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface TradeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TradeSearchModal({ isOpen, onClose }: TradeSearchModalProps) {
  const { userData } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState<UserBasicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setIsSearching(true);
    try {
      const users = await searchUsersByStudentId(studentId.trim());
      // Filter out self and admins/superadmins
      setResults(users.filter(u => u.uid !== userData?.uid && u.role !== "admin" && u.role !== "superadmin"));
      if (users.length === 0) toast.error("No eligible users found with this Student ID");
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const startTrade = async (targetUid: string) => {
    if (!userData) return;
    setIsStarting(targetUid);
    try {
      await findOrCreatePersonalTrade(userData.uid, targetUid);
      toast.success("Private trade session started!");
      onClose();
      setStudentId("");
      setResults([]);
    } catch (error) {
      toast.error("Failed to start trade");
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative glass-panel w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 shadow-2xl border-white/10">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Start Trade</h2>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Search user by Student ID</p>
            </div>
        </div>

        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="text"
            required
            autoFocus
            className="w-full glass-input py-4 pl-12 pr-4 text-sm font-medium"
            placeholder="Enter Student ID (e.g. 2101001)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <button 
            type="submit" 
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
          </button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {results.map((user) => (
            <div key={user.uid} className="glass-panel p-4 flex items-center justify-between group hover:border-primary/30 transition-all border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/5">
                  {user.profileImage ? (
                    <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">
                      <UserPlus className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm tracking-tight">{user.name}</h4>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">ID: {user.studentId} • {user.room}</p>
                </div>
              </div>
              <button
                onClick={() => startTrade(user.uid)}
                disabled={isStarting !== null}
                className="glass-button py-2 px-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                {isStarting === user.uid ? <Loader2 className="w-3 h-3 animate-spin"/> : <CreditCard className="w-3.5 h-3.5" />}
                Trade
              </button>
            </div>
          ))}
          {results.length === 0 && !isSearching && studentId && (
              <div className="py-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                  No active users found
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
