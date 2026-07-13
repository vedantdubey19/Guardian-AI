'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Bot, 
  LineChart, 
  AlertOctagon, 
  BarChart3, 
  ShieldAlert, 
  Home
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navigationItems = [
    { name: 'Overview', path: '/', icon: Home },
    { name: 'Live Command', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Copilot', path: '/copilot', icon: Bot },
    { name: 'Prediction Center', path: '/predictions', icon: LineChart },
    { name: 'Emergency Room', path: '/emergency', icon: AlertOctagon },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 h-screen glass-panel border-r border-slate-800/60 flex flex-col justify-between py-6 px-4 shrink-0 z-20">
      {/* Brand Header */}
      <div className="flex flex-col gap-1.5 px-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">GUARDIAN AI</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Stadium Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 mt-10 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-white border border-blue-500/30' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {/* Highlight Neon Indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/4 w-1 h-1/2 rounded-r-md bg-[#00f2fe] shadow-lg shadow-[#00f2fe]/80"></span>
              )}
              
              <Icon className={`w-4 h-4 transition-colors ${
                isActive ? 'text-[#00f2fe]' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Branding */}
      <div className="border-t border-slate-800/60 pt-4 flex flex-col gap-2 px-2 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Core AI Nodes Synced</span>
        </div>
        <p className="text-[9px]">FIFA World Cup 2026 Operations</p>
      </div>
    </aside>
  );
};
