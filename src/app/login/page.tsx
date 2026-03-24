"use client";

import { useState } from "react";
import { loginUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Lock, User as UserIcon } from "lucide-react";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return toast.error("Please fill in all fields");
    
    setLoading(true);
    try {
      await loginUser(loginId, password);
      // Let global context or page.tsx handle the rest, but we can just push to /
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    toast("Contact admin: mdriadmollik@icloud.com", { icon: "⚠️" });
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
            <div className="relative">
              <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Email / Student ID" 
                className="w-full glass-input pl-12"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
              <input 
                type="password" 
                placeholder="Enter your password" 
                className="w-full glass-input pl-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
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
    </div>
  );
}
