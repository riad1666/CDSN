"use client";

import { useState, useRef } from "react";
import { registerUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Upload, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    email: "",
    whatsapp: "",
    room: "",
    password: "",
    confirmPassword: "",
    dob: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{9}$/.test(formData.studentId)) {
      return toast.error("Student ID must be exactly 9 digits");
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (!imageFile) {
      return toast.error("Please upload a profile picture");
    }

    setLoading(true);
    try {
      await registerUser(formData, imageFile);

      toast.success("Account created! Please wait for admin approval.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="glass-panel w-full max-w-xl p-8 flex flex-col items-center">
        {/* Logo */}
        <img src="/logo.png" alt="CDS Logo" className="w-20 h-20 object-contain mb-6" />
        
        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-white/60 text-sm mb-8">Join Convergence Digital Society</p>
        
        <form onSubmit={handleRegister} className="w-full space-y-5">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center mb-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 shadow-lg rounded-full border border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary transition-all bg-white/5"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Full Name *</label>
              <input 
                type="text" 
                required
                placeholder="Enter your name" 
                className="w-full glass-input"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <p className="text-[10px] text-white/40 ml-1">Cannot be edited later</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Student ID *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. 202100123" 
                className="w-full glass-input"
                value={formData.studentId}
                onChange={e => setFormData({...formData, studentId: e.target.value})}
              />
              <p className="text-[10px] text-white/40 ml-1">Must be unique, 9 digits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email Address *</label>
              <input 
                type="email" 
                required
                placeholder="your.email@example.com" 
                className="w-full glass-input"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Date of Birth (Original) *</label>
              <input 
                type="date" 
                required
                className="w-full glass-input"
                value={formData.dob}
                onChange={e => setFormData({...formData, dob: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">WhatsApp Number *</label>
              <input 
                type="tel" 
                required
                placeholder="+82 10 1234 5678" 
                className="w-full glass-input"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Room Number *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. 201" 
                className="w-full glass-input"
                value={formData.room}
                onChange={e => setFormData({...formData, room: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password *</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="Create a password" 
                  className="w-full glass-input pr-12"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-white/40 hover:text-white/70">
                  {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Confirm Password *</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required
                  placeholder="Confirm password" 
                  className={`w-full glass-input pr-12 ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-rose-500/50 focus:ring-rose-500/50' : ''}`}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-white/40 hover:text-white/70">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[10px] text-rose-400 font-medium ml-1">Passwords do not match</p>
              )}
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button mt-6 text-lg">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Account"}
          </button>
        </form>
        
        <div className="mt-8 flex flex-col items-center gap-5 text-sm w-full">
          <div className="w-full h-px bg-white/10"></div>
          <div className="text-white/60">
            Already have an account? <Link href="/login" className="text-primary hover:text-white hover:underline transition-all font-medium ml-1">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
