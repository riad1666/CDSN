"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useRef } from "react";
import { User, Lock, Camera, Loader2, ArrowLeft, Shield, Eye, EyeOff, Globe, Coins } from "lucide-react";
import { useCurrency, Currency } from "@/context/CurrencyContext";
import { updateUserProfileImage, updateUserGender } from "@/lib/firebase/firestore";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { resendVerificationEmail, updateUserEmail } from "@/lib/firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { userData, user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 (to avoid Firestore limits)
        return toast.error("Image too large (max 1MB for Base64)");
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            await updateUserProfileImage(userData!.uid, base64String);
            toast.success("Profile picture updated!");
        } catch (error) {
            toast.error("Failed to update profile picture");
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  if (!userData) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
               </div>
               <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">System Level: Secure</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">User Protocols</h1>
            <p className="text-white/30 font-medium text-sm md:text-base">Identity management and security interface</p>
        </div>
        <Link href="/dashboard" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all flex items-center gap-3 group">
           <ArrowLeft className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
           <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Return to Base</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Aspect: Profile Matrix */}
        <div className="lg:col-span-4 space-y-8">
            <section className="glass-card rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden group">
                {/* Backglow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all"></div>
                
                <div className="relative mb-8 pt-4">
                    <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-2 border-white/5 group-hover:border-primary/40 transition-all duration-500 relative bg-white/2 shadow-2xl">
                        {userData.profileImage ? (
                            <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="w-16 h-16 text-white/10" />
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center space-y-2">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Uploading...</span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-[0_10px_20px_rgba(var(--color-primary),0.3)] hover:scale-110 active:scale-95 transition-all z-10"
                    >
                        <Camera className="w-5 h-5" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*" 
                    />
                </div>
                
                <div className="space-y-1 relative z-10">
                   <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{userData.name}</h2>
                   <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">{userData.studentId}</p>
                </div>
                
                <div className="mt-8 relative z-10">
                   <div className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${
                       userData.role === 'superadmin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                       userData.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                   }`}>
                       Clearance: {userData.role}
                   </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/5 relative z-10">
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Network</p>
                      <p className="text-xs font-black text-white italic">Node-01</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Status</p>
                      <p className="text-xs font-black text-success italic">Active</p>
                   </div>
                </div>
            </section>
        </div>

        {/* Right Aspect: Secure Credentials & Identity */}
        <div className="lg:col-span-8 space-y-10">
            {/* Identity Protocols */}
            <section className="glass-card rounded-[3rem] p-10 relative overflow-hidden">
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                
                <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                        <User className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Identity Protocols</h3>
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Public profile metadata</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Comm Channel (Email)</p>
                        <div className="glass-card bg-white/2 border-white/5 p-5 text-sm text-white font-bold italic rounded-2xl">
                            {userData.email}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Deployment Sector (Room)</p>
                        <div className="glass-card bg-white/2 border-white/5 p-5 text-sm text-white font-black text-center rounded-2xl italic tracking-tighter">
                            SECTOR-{userData.room}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Gender Matrix</p>
                        <div className="glass-card bg-white/2 border-white/5 p-5 text-sm text-white font-bold italic rounded-2xl">
                            {userData.gender || "Not Specified"}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Direct Signal (WhatsApp)</p>
                        <div className="glass-card bg-white/2 border-white/5 p-5 text-sm text-white font-black text-center rounded-2xl italic">
                            {userData.whatsapp}
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Terminal */}
            <section className="glass-card rounded-[3rem] p-10 border-l-4 border-l-primary/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>
                
                <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Security Terminal</h3>
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Access control and verification</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-[2.5rem] bg-white/2 border border-white/5 group hover:border-primary/20 transition-all">
                        <div className="w-full md:max-w-md">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-white font-black text-sm uppercase tracking-tight italic">Protocol Verification</h4>
                                {user?.emailVerified ? (
                                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Verified</span>
                                ) : (
                                    <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">Pending</span>
                                )}
                            </div>
                            
                            {isEditingEmail ? (
                                <div className="mt-4 flex gap-3">
                                    <input 
                                        type="email"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="New Node Address..."
                                    />
                                    <button 
                                        onClick={async () => {
                                            if (!newEmail || newEmail === user?.email) return setIsEditingEmail(false);
                                            setIsUpdatingEmail(true);
                                            try {
                                                await updateUserEmail(newEmail);
                                                toast.success("Protocol Updated!");
                                                setIsEditingEmail(false);
                                            } catch (e: any) {
                                                toast.error(e.message || "Sync Failed");
                                            } finally {
                                                setIsUpdatingEmail(false);
                                            }
                                        }}
                                        disabled={isUpdatingEmail}
                                        className="px-6 bg-primary text-white font-black text-[10px] uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        {isUpdatingEmail ? <Loader2 className="w-4 h-4 animate-spin"/> : "Sync"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between w-full mt-2">
                                    <p className="text-xs text-white/40 font-bold italic tracking-tight">
                                        {userData.email}
                                    </p>
                                    {!user?.emailVerified && (
                                        <button 
                                            onClick={() => {
                                                setNewEmail(userData.email);
                                                setIsEditingEmail(true);
                                            }}
                                            className="text-[10px] text-primary hover:underline font-black uppercase tracking-widest"
                                        >
                                            Redirect Line
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {!user?.emailVerified && !isEditingEmail && (
                            <button 
                                onClick={async () => {
                                    setIsResending(true);
                                    try {
                                        await resendVerificationEmail();
                                        toast.success("Signal Sent!");
                                    } catch (e: any) {
                                        toast.error("Signal Blocked");
                                    } finally {
                                        setIsResending(false);
                                    }
                                }}
                                disabled={isResending}
                                className="px-8 py-4 bg-white/5 hover:bg-primary hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all shadow-xl"
                            >
                                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Transmit Verification"}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-[2.5rem] bg-white/2 border border-white/5 group hover:border-indigo-400/20 transition-all">
                        <div className="space-y-1">
                            <h4 className="text-white font-black text-sm uppercase tracking-tight italic">Security Cipher</h4>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Update your access key regularly for maximum node integrity.</p>
                        </div>
                        <button 
                            onClick={() => setIsPasswordOpen(true)}
                            className="px-8 py-4 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20 transition-all shadow-xl flex items-center gap-3 shrink-0"
                        >
                            <Lock className="w-4 h-4" /> Rotate Cipher
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Currency Matrix */}
            <section className="glass-card rounded-[3rem] p-10 border-l-4 border-l-success/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 blur-3xl rounded-full"></div>
                
                <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center border border-success/20">
                        <Globe className="w-6 h-6 text-success" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Currency Matrix</h3>
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Global display preferences</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    {[
                        { id: 'KRW', name: 'South Korean Won', symbol: '₩' },
                        { id: 'USD', name: 'US Dollar', symbol: '$' },
                        { id: 'EUR', name: 'Euro', symbol: '€' },
                        { id: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' }
                    ].map((cur) => (
                        <button
                            key={cur.id}
                            onClick={() => {
                                setCurrency(cur.id as Currency);
                                toast.success(`Currency switched to ${cur.id}`);
                            }}
                            className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 group/cur ${
                                currency === cur.id 
                                ? 'bg-success/10 border-success/40 shadow-[0_10px_20px_rgba(var(--color-success),0.1)]' 
                                : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
                            }`}
                        >
                            <span className={`text-3xl font-black italic transition-transform group-hover/cur:scale-110 ${
                                currency === cur.id ? 'text-success' : 'text-white/20'
                            }`}>
                                {cur.symbol}
                            </span>
                            <div className="text-center">
                                <p className={`text-[10px] font-black uppercase tracking-tighter ${
                                    currency === cur.id ? 'text-white' : 'text-white/40'
                                }`}>
                                    {cur.id}
                                </p>
                                <p className="text-[7px] font-bold text-white/10 uppercase tracking-widest whitespace-nowrap">
                                    {cur.name}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
                
                <div className="mt-8 p-6 bg-white/2 rounded-2xl border border-white/5 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-white/20" />
                    </div>
                    <p className="text-[10px] text-white/30 font-bold leading-relaxed uppercase tracking-wide">
                        <span className="text-success">Note:</span> All internal transactions are processed in KRW for maximum node stability. Conversion is performed in real-time at the neural interface layer only.
                    </p>
                </div>
            </section>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordOpen} 
        onClose={() => setIsPasswordOpen(false)} 
      />
    </div>
  );
}

