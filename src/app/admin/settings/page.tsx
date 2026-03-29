"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  Bell, 
  Send,
  Save,
  Key,
  Smartphone,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateUserData, broadcastNotification } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { userData } = useAuth();
  const [profile, setProfile] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    whatsapp: userData?.whatsapp || ""
  });
  const [broadcast, setBroadcast] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!userData?.uid) return;
      await updateUserData(userData.uid, profile);
      toast.success("Identity profile updated");
    } catch (e) {
      toast.error("Cluster update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.content) return toast.error("Empty neural signal");
    setLoading(true);
    try {
      await broadcastNotification(broadcast.title, broadcast.content);
      toast.success("Global neural broadcast sent");
      setBroadcast({ title: "", content: "" });
    } catch (e) {
      toast.error("Broadcast transmission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">System Settings</h1>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1 italic">Manage your admin account and system preferences</p>
      </header>

      {/* Profile Section */}
      <section className="bg-[#131422] border border-white/5 p-10 rounded-4xl shadow-2xl space-y-8">
        <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-lg shadow-purple-500/10"><User className="w-5 h-5" /></div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Profile Information</h3>
        </div>
        
        <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            type="text" 
                            className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-purple-500/50 transition-all"
                            value={profile.name}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            type="email" 
                            className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-purple-500/50 transition-all"
                            value={profile.email}
                            onChange={(e) => setProfile({...profile, email: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            
            <div className="space-y-3 max-w-md">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">WhatsApp Number</label>
                <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                    <input 
                        type="text" 
                        className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-purple-500/50 transition-all"
                        value={profile.whatsapp}
                        onChange={(e) => setProfile({...profile, whatsapp: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-fit bg-white/5 border border-white/5 text-white/60 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all mt-4"
            >
                <div className="flex items-center gap-2">
                    {loading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                    Commit Changes
                </div>
            </button>
        </form>
      </section>

      {/* Security Section */}
      <section className="bg-[#131422] border border-white/5 p-10 rounded-4xl shadow-2xl space-y-8">
        <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/10"><Shield className="w-5 h-5" /></div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Security Protocol</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Current Password</label>
                    <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-rose-500 transition-colors" />
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-rose-500/50 transition-all"
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">New Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-rose-500 transition-colors" />
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full bg-white/3 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-rose-500/50 transition-all"
                        />
                    </div>
                </div>
                <button className="w-fit bg-white/5 border border-white/5 text-white/60 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all">
                    Update Keys
                </button>
            </div>
            
            <div className="bg-black/20 p-8 rounded-4xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shadow-xl shadow-green-500/10"><CheckCircle2 className="w-6 h-6" /></div>
                 <h4 className="text-white font-black text-xs italic uppercase tracking-widest">Neural Encryption Active</h4>
                 <p className="text-white/20 text-[9px] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">All administrative commands are encrypted using AES-256 military-grade clusters</p>
            </div>
        </div>
      </section>

      {/* Broadcast System Section */}
      <section className="bg-[#131422] border border-white/5 p-10 rounded-4xl shadow-2xl space-y-8">
        <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-lg shadow-cyan-500/10"><Bell className="w-5 h-5" /></div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Global Broadcast Protocol</h3>
        </div>
        
        <form onSubmit={handleBroadcast} className="space-y-6">
            <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Neural Link Title</label>
                <input 
                    type="text" 
                    placeholder="Enter urgent neural signal title..."
                    className="w-full bg-white/3 border border-white/5 rounded-2xl py-4 px-6 text-xs font-bold text-white placeholder:text-white/10 focus:outline-hidden focus:border-cyan-500/50 transition-all italic"
                    value={broadcast.title}
                    onChange={(e) => setBroadcast({...broadcast, title: e.target.value})}
                />
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Neural Content</label>
                <textarea 
                    rows={4}
                    placeholder="Type your secure message to all platform nodes..."
                    className="w-full bg-white/3 border border-white/5 rounded-4xl p-6 text-xs font-bold text-white/80 placeholder:text-white/10 focus:outline-hidden focus:border-cyan-500/50 transition-all resize-none italic"
                    value={broadcast.content}
                    onChange={(e) => setBroadcast({...broadcast, content: e.target.value})}
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-linear-to-r from-cyan-500 to-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
                {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Send className="w-5 h-5" />}
                Transmit Neural Signal
            </button>
        </form>
      </section>

      <div className="text-center pt-20">
         <p className="text-[8px] font-black text-white/5 uppercase tracking-[1em] italic">Authority Neural Command Center Module Ver 2.0.4</p>
      </div>
    </div>
  );
}
