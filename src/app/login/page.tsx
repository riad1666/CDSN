"use client";

import { useState } from "react";
import { loginUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return toast.error("Please fill in all fields");
    
    setLoading(true);
    setUnverified(false);
    try {
      await loginUser(loginId, password);
      router.push("/dashboard"); // Redirect to dashboard explicitly
    } catch (error: any) {
      if (error.message.includes("Email not verified")) {
        setUnverified(true);
      }
      toast.error(error.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const { resendVerificationEmail } = await import("@/lib/firebase/auth");
    setLoading(true);
    try {
      await resendVerificationEmail();
      toast.success("Verification email resent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend email.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    setIsForgotOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 flex flex-col items-center">
        {/* CDS Logo */}
        <img src="/logo.png" alt="CDS Logo" className="w-20 h-20 object-contain mb-6" />
        
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-white/60 text-sm mb-8">Sign in to continue to CDS</p>
        
        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Login ID</label>
            <input 
              type="text" 
              placeholder="Email / Student ID" 
              className="w-full glass-input"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password" 
                className="w-full glass-input pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>

          {unverified && (
            <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-medium leading-relaxed">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Login with Email is blocked until verified. Use your <b>Student ID</b> to login now and fix your email in settings.</span>
                </div>
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={loading}
                  className="w-full py-2 text-primary text-xs font-black uppercase tracking-widest hover:underline"
                >
                  {loading ? "Sending..." : "Resend Verification Link"}
                </button>
            </div>
          )}
        </form>
        
        <div className="mt-6 flex flex-col items-center gap-5 text-sm w-full">
          <button onClick={handleForgot} className="text-primary hover:underline transition-all">
            Forgot Password?
          </button>
          <div className="w-full h-px bg-white/10"></div>
          <div className="text-white/60">
            Don't have an account? <Link href="/register" className="text-primary hover:text-white hover:underline transition-all font-medium ml-1">Create account</Link>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-white/40">
          Convergence Digital Society © 2026
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </div>
  );
}
