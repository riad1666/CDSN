"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-[#0a0b14]/50 border border-rose-500/20 rounded-3xl m-4 md:m-8 backdrop-blur-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-rose-400 mb-2 uppercase tracking-tight">Module Glitch</h2>
          <p className="text-sm text-white/60 mb-8 max-w-sm">
            We encountered an unexpected error while rendering this neural module. The error has been securely logged.
          </p>
          <div className="flex justify-center gap-4 w-full">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="py-2.5 px-6 rounded-xl bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-2 hover:bg-rose-500/30 transition-all uppercase text-[10px] tracking-widest"
            >
              <RefreshCw className="w-4 h-4" /> Reset Module
            </button>
            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-6 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors uppercase text-[10px] tracking-widest"
            >
              Hard Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
