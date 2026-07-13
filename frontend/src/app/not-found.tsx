'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 relative flex items-center justify-center p-6 overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-50 pointer-events-none z-0"></div>

      <div className="glass-panel p-8 rounded-2xl border-rose-500/20 max-w-sm text-center flex flex-col items-center gap-4 relative z-10 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>
        
        <div>
          <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest">404 - Node Offline</h2>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            The telemetry node directory or stadium sector grid coordinate you are attempting to trace is currently offline or does not exist.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-slate-700/60"
        >
          <ArrowLeft className="w-4 h-4" />
          Central Command
        </Link>
      </div>
    </div>
  );
}
