'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, AlertTriangle, Play } from 'lucide-react';
import { LiveTelemetry } from '../types';

interface HeaderProps {
  telemetry: LiveTelemetry | null;
  activeIncidentsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ telemetry, activeIncidentsCount }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTimeStr(
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const overallRisk = telemetry?.overall_risk_score ?? 12.5;
  const systemHealth = telemetry?.system_health ?? 'nominal';
  const phase = telemetry?.phase ?? 'ingress';
  
  // Format Phase Label
  const getPhaseLabel = (p: string) => {
    if (p === 'ingress') return 'Spectator Ingress';
    if (p === 'match') return 'Match In Play';
    return 'Spectator Egress';
  };

  const riskBadge = React.useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Risk Level</div>
        <div className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end">
          <span className={`w-1.5 h-1.5 rounded-full ${overallRisk > 60 ? 'bg-rose-500' : (overallRisk > 30 ? 'bg-amber-500' : 'bg-emerald-500')}`}></span>
          {overallRisk}%
        </div>
      </div>
    </div>
  ), [overallRisk]);

  const healthBadge = React.useMemo(() => (
    <div className="flex items-center gap-2 glass-panel px-3 py-1 rounded-full text-[10px] font-bold tracking-wide text-slate-300">
      {systemHealth === 'nominal' ? (
        <>
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" aria-hidden="true" />
          <span>System Nominal</span>
        </>
      ) : (
        <>
          <ShieldAlert className="w-4.5 h-4.5 text-rose-400 animate-bounce" aria-hidden="true" />
          <span className="text-rose-400">System Degraded</span>
        </>
      )}
    </div>
  ), [systemHealth]);

  return (
    <header className="w-full h-18 glass-panel border-b border-slate-800/60 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Title / Command Context */}
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-slate-100 tracking-wide">Stadium Command Center</h2>
        <span className="h-4 w-px bg-slate-800"></span>
        
        {/* Phase Indicator */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Phase:</div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-blue-500/10 border border-blue-500/30 text-[#00f2fe] flex items-center gap-1.5">
            <Play className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
            {getPhaseLabel(phase)}
          </span>
        </div>
      </div>

      {/* Metrics & Alarm Indicators */}
      <div className="flex items-center gap-6">
        {/* Risk Score Widget */}
        {riskBadge}

        {/* System Health Badge */}
        {healthBadge}

        {/* Active Emergency Counter */}
        <div className="relative">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${
            activeIncidentsCount > 0 
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 neon-glow-red animate-pulse' 
              : 'bg-slate-800/30 border-slate-700/40 text-slate-400'
          }`}>
            <AlertTriangle className={`w-3.5 h-3.5 ${activeIncidentsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} aria-hidden="true" />
            <span>{activeIncidentsCount} Active Alerts</span>
          </span>
        </div>

        {/* Real-time Digital Clock */}
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-[#00f2fe]" aria-hidden="true" />
          <span>{timeStr || '16:15:26'}</span>
        </div>
      </div>
    </header>
  );
};
