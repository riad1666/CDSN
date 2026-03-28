"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useRef } from "react";
import { User, Lock, Camera, Loader2, ArrowLeft, Shield, Eye, EyeOff } from "lucide-react";
import { updateUserProfileImage, updateUserGender } from "@/lib/firebase/firestore";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { resendVerificationEmail, updateUserEmail } from "@/lib/firebase/auth";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { userData, user } = useAuth();
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Account Settings</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Personalize your profile & security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Picture */}
        <div className="md:col-span-1">
            <section className="glass-panel p-8 flex flex-col items-center">
                <div className="relative group mb-6">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-all duration-300 relative bg-white/5">
                        {userData.profileImage ? (
                            <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="w-12 h-12 text-white/20" />
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
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
                
                <h2 className="text-xl font-bold text-white mb-1">{userData.name}</h2>
                <p className="text-xs text-white/40 mb-6 font-medium">{userData.studentId}</p>
                
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    userData.role === 'superadmin' ? 'bg-rose-500/20 text-rose-400' : 
                    userData.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 
                    'bg-emerald-500/20 text-emerald-400'
                }`}>
                    {userData.role}
                </div>
            </section>
        </div>

        {/* Right Column: Information & Security */}
        <div className="md:col-span-2 space-y-6">
            <section className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase">Public Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Email Address</p>
                        <div className="glass-panel bg-white/2 border-white/5 p-4 text-sm text-white/60 font-medium">
                            {userData.email}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Room Number</p>
                        <div className="glass-panel bg-white/2 border-white/5 p-4 text-sm text-white font-bold text-center">
                            {userData.room}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Gender</p>
                        {userData.gender ? (
                            <div className="glass-panel bg-primary/5 border border-primary/20 p-4 text-sm text-white font-black capitalize text-center">
                                {userData.gender}
                            </div>
                        ) : (
                            <select 
                                value={userData.gender || ""} 
                                onChange={async (e) => {
                                    try {
                                        await updateUserGender(userData.uid, e.target.value as any);
                                        toast.success("Gender updated! This cannot be changed later.");
                                    } catch (error) {
                                        toast.error("Failed to update gender");
                                    }
                                }}
                                className="w-full glass-panel bg-white/2 border-white/5 p-4 text-sm text-white font-bold capitalize text-center appearance-none cursor-pointer hover:bg-white/5 transition-colors focus:ring-1 focus:ring-primary/40 outline-none"
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="male" className="bg-[#0f101a]">Male</option>
                                <option value="female" className="bg-[#0f101a]">Female</option>
                            </select>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">WhatsApp</p>
                        <div className="glass-panel bg-white/2 border-white/5 p-4 text-sm text-white font-medium text-center">
                            {userData.whatsapp}
                        </div>
                    </div>
                </div>
            </section>

            <section className="glass-panel p-8 border-l-primary/30">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase">Account Security</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white/2 border border-white/5">
                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-bold text-sm uppercase tracking-tight">Email Verification</h4>
                                {user?.emailVerified ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">Verified</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[8px] font-black uppercase">Unverified</span>
                                )}
                            </div>
                            
                            {isEditingEmail ? (
                                <div className="mt-3 flex gap-2">
                                    <input 
                                        type="email"
                                        className="glass-input text-xs py-2 px-3 w-full"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Enter new email address"
                                    />
                                    <button 
                                        onClick={async () => {
                                            if (!newEmail || newEmail === user?.email) return setIsEditingEmail(false);
                                            setIsUpdatingEmail(true);
                                            try {
                                                await updateUserEmail(newEmail);
                                                toast.success("Email updated! Verification mail sent.");
                                                setIsEditingEmail(false);
                                            } catch (e: any) {
                                                toast.error(e.message || "Failed to update email");
                                            } finally {
                                                setIsUpdatingEmail(false);
                                            }
                                        }}
                                        disabled={isUpdatingEmail}
                                        className="text-[10px] px-3 py-1 bg-primary/20 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all"
                                    >
                                        {isUpdatingEmail ? <Loader2 className="w-3 h-3 animate-spin"/> : "Save"}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingEmail(false)}
                                        className="text-[10px] px-3 py-1 bg-white/5 text-white/40 font-bold rounded-lg hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between w-full">
                                    <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                                        {userData.email}
                                    </p>
                                    {!user?.emailVerified && (
                                        <button 
                                            onClick={() => {
                                                setNewEmail(userData.email);
                                                setIsEditingEmail(true);
                                            }}
                                            className="text-[10px] text-primary hover:underline font-bold"
                                        >
                                            Change Email
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
                                        toast.success("Verification email sent!");
                                    } catch (e: any) {
                                        toast.error(e.message || "Failed to resend");
                                    } finally {
                                        setIsResending(false);
                                    }
                                }}
                                disabled={isResending}
                                className="glass-button text-[10px] py-2.5 px-6 shrink-0"
                            >
                                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend Link"}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white/2 border border-white/5">
                        <div>
                            <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Account Password</h4>
                            <p className="text-[10px] text-white/40 font-medium leading-relaxed">Update your password regularly to keep your account secure.</p>
                        </div>
                        <button 
                            onClick={() => setIsPasswordOpen(true)}
                            className="glass-button text-[10px] py-2.5 px-6 shrink-0"
                        >
                            <Lock className="w-3.5 h-3.5 mr-2" /> Change Password
                        </button>
                    </div>
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
