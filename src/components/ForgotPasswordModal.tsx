"use client";

import { useState } from "react";
import { X, Loader2, Mail, Fingerprint, ArrowRight } from "lucide-react";
import { resetPasswordUser } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return toast.error("Please enter email or student ID");

    setLoading(true);
    try {
      let email = identifier;

      // If it's a student ID, find the email
      if (!identifier.includes("@")) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentId", "==", identifier));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          throw new Error("No account found with this Student ID");
        }
        email = snap.docs[0].data().email;
      }

      await resetPasswordUser(email);
      setSent(true);
      toast.success("Reset link sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
      <div className="glass-panel w-full max-w-md p-8 relative shadow-2xl border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        {!sent ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 mx-auto">
                <Mail className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tighter uppercase italic">
              Reset Password
            </h2>
            <p className="text-white/40 text-xs text-center mb-8 font-medium px-4">
              Enter the email or Student ID associated with your account and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Identity</label>
                <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="Email / Student ID"
                      className="w-full glass-input py-3 pl-10"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                    />
                    <Fingerprint className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full glass-button py-4 font-black uppercase tracking-[0.2em] text-xs">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="py-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 mx-auto border border-emerald-500/20">
                <Mail className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase italic">Link Sent!</h2>
            <p className="text-white/60 text-sm mb-8">
              Please check your inbox (and spam folder) for the password reset instructions.
            </p>
            <button onClick={onClose} className="w-full glass-button-secondary py-3 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-2 group">
              Back to Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
