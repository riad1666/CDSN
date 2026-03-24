"use client";

import { useState } from "react";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { uploadReceipts } from "@/lib/firebase/storage";
import toast from "react-hot-toast";

export function AddShoppingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return toast.error("Title and amount required");

    setLoading(true);
    try {
      const shopRef = await addDoc(collection(db, "shopping"), {
        title,
        details,
        amount: parseFloat(amount),
        addedBy: userData?.name,
        date: new Date().toISOString(),
        images: [] 
      });

      if (images.length > 0) {
        const imageUrls = await uploadReceipts(images, shopRef.id);
        await updateDoc(doc(db, "shopping", shopRef.id), { images: imageUrls });
      }

      toast.success("Shopping created!");
      onClose();
      setTitle(""); setDetails(""); setAmount(""); setImages([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to create shopping");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Add Shopping</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
           {/* Inputs for Title, Details, Amount, File Upload matching AddExpense */}
           <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Title</label>
            <input type="text" className="w-full glass-input" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Details</label>
            <textarea className="w-full glass-input min-h-[80px]" value={details} onChange={e => setDetails(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Amount (₩)</label>
            <input type="number" className="w-full glass-input" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-semibold text-white/60 uppercase">Images</label>
             <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center relative hover:bg-white/5 transition-colors cursor-pointer group">
               <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               <ImageIcon className="w-8 h-8 text-white/30 group-hover:text-primary transition-colors mb-2" />
               <p className="text-sm text-white/60">{images.length > 0 ? `${images.length} files` : "Click to upload"}</p>
             </div>
          </div>
          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
}
