"use client";

import { useState } from "react";
import { X, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { changePasswordUser } from "@/lib/firebase/auth";

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match.");
    }
    
    setLoading(true);
    try {
      await changePasswordUser(oldPassword, newPassword);
      toast.success("Password successfully changed!");
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOld(false);
    setShowNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="glass-panel w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
        <button onClick={handleClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-orange-400" />
          </span>
          Change Password
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <input 
                type={showOld ? "text" : "password"} 
                required
                className="w-full glass-input pr-12"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-4 top-3.5 text-white/40 hover:text-white/70">
                {showOld ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"} 
                required
                className="w-full glass-input pr-12"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-3.5 text-white/40 hover:text-white/70">
                {showNew ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"} 
                required
                className={`w-full glass-input pr-12 ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-rose-500/50' : ''}`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-rose-400 font-medium ml-1">Passwords do not match</p>
            )}
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
