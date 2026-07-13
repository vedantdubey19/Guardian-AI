'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../layout';
import { StadiumMap } from '../../../components/StadiumMap';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  Download, 
  Activity,
  FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import { ExecutiveSummaryReport } from '../../../types';

export default function CommandCenter() {
  const { 
    telemetry, 
    activeIncidents, 
    selectedNode, 
    setSelectedNode,
    activeRoute,
    setActiveRoute 
  } = useDashboard();

  const [sitRep, setSitRep] = useState<ExecutiveSummaryReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Fetch the latest executive situation report
  const fetchSituationReport = React.useCallback(async () => {
    setLoadingReport(true);
    try {
      const report = await api.getSituationReport();
      setSitRep(report);
    } catch (err) {
      console.error('Failed to fetch AI situation report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSituationReport();
    }, 0);
    // Refresh report every 15 seconds to reflect simulated shifts
    const interval = setInterval(fetchSituationReport, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchSituationReport]);

  const totalOccupants = telemetry?.total_visitors ?? 24500;
  const overallRisk = telemetry?.overall_risk_score ?? 12.5;
  const phase = telemetry?.phase ?? 'ingress';
  const systemHealth = telemetry?.system_health ?? 'nominal';
  
  // Format Phase name
  const getPhaseDisplay = (p: string) => {
    if (p === 'ingress') return 'Ingress';
    if (p === 'match') return 'Match-Play';
    return 'Egress';
  };

  // One-click situation report PDF-like text download
  const downloadReport = () => {
    if (!sitRep) return;
    const reportText = `
==================================================
GUARDIAN AI - SITUATION REPORT
FIFA World Cup 2026 Stadium Operations
Generated: ${new Date(sitRep.timestamp).toLocaleString()}
==================================================

1. EXECUTIVE SUMMARY:
${sitRep.executive_summary}

2. CURRENT ISSUES & INCIDENTS:
${sitRep.current_issues_summary}

3. PREDICTIVE RISK OUTLOOK (10-30 MINS):
${sitRep.predicted_issues_summary}

4. CRITICAL ZONE PRIORITY RANKING:
${sitRep.priority_ranking.map((zone, idx) => `  [${idx + 1}] ${zone}`).join('\n')}

5. AI RECOMMENDED ACTIONS:
${sitRep.recommended_actions.map((act) => `  - ${act}`).join('\n')}

--------------------------------------------------
System Operations Health: ${systemHealth.toUpperCase()}
Total Spectators Logged: ${totalOccupants.toLocaleString()}
Stadium Risk Index: ${overallRisk}%
==================================================
    `;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GuardianAI_SituationReport_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-slate-800/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Total Occupants</div>
            <div className="text-2xl font-black text-slate-100">{totalOccupants.toLocaleString()}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live telemetry scan
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[#00f2fe]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-slate-800/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Risk Score</div>
            <div className="text-2xl font-black text-rose-400">{overallRisk}%</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${overallRisk > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              Aggregate risk index
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-slate-800/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Active Incidents</div>
            <div className="text-2xl font-black text-amber-500">{activeIncidents.length}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">Security/Medical queues</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-slate-800/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Operational Phase</div>
            <div className="text-2xl font-black text-cyan-400">{getPhaseDisplay(phase)}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">FIFA entry/exit cycle</div>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-sm font-extrabold text-slate-200">Interactive Crowd Heatmap</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Click any zone or gate to select it for AI predicting and pathing.</p>
            </div>
            {selectedNode && (
              <button 
                onClick={() => { setSelectedNode(''); setActiveRoute([]); }}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                Clear Selection
              </button>
            )}
          </div>
          <StadiumMap 
            densities={telemetry?.densities ?? {}} 
            counts={telemetry?.counts ?? {}} 
            activeIncidents={activeIncidents} 
            responders={telemetry?.responders ?? []}
            activeRoutePath={activeRoute}
            selectedNode={selectedNode}
            onNodeClick={(node) => {
              setSelectedNode(node);
              // Clear routing lines if selected node changes to avoid mapping confusion
              setActiveRoute([]);
            }}
          />
        </div>

        {/* Right Column: AI Situation Report & Alerts (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* AI Situation Report Panel */}
          <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">AI Situation Report</h3>
              </div>
              {sitRep && (
                <button
                  onClick={downloadReport}
                  className="glass-panel text-[10px] font-bold px-2.5 py-1 rounded-lg text-slate-300 hover:text-white flex items-center gap-1.5 border-slate-700/60 hover:bg-slate-800/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Summary
                </button>
              )}
            </div>

            {loadingReport && !sitRep ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-[#00f2fe]/30 border-t-[#00f2fe] rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Generating summary...</span>
              </div>
            ) : sitRep ? (
              <div className="flex flex-col gap-4 text-xs">
                {/* Executive Summary */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Executive Summary</span>
                  <p className="text-slate-300 font-medium leading-relaxed leading-5">
                    {sitRep.executive_summary}
                  </p>
                </div>

                {/* Current Issues */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Current Incidents</span>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    {sitRep.current_issues_summary}
                  </p>
                </div>

                {/* Predicted Issues */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-[#00f2fe] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Predictive Threat Outlook
                  </span>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    {sitRep.predicted_issues_summary}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Command Recommendations</span>
                  <ul className="space-y-1.5">
                    {sitRep.recommended_actions.map((act, idx) => (
                      <li key={idx} className="text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 text-xs">
                Unable to load AI situation summary telemetry data.
              </div>
            )}
          </div>

          {/* Active Incidents Operations Log */}
          <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Live Incident Log</h3>
              </div>
              <span className="text-[10px] bg-slate-800/50 px-2 py-0.5 rounded text-slate-400 font-bold">
                {activeIncidents.length} active
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {activeIncidents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-medium">
                  No active emergency incidents logged in stadium sectors.
                </div>
              ) : (
                activeIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 transition-all flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${inc.severity === 'critical' || inc.severity === 'high' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`}></span>
                        <span className="font-bold text-slate-200 capitalize">{inc.type.replace('_', ' ')}</span>
                        <span className="text-slate-500 text-[10px]">•</span>
                        <span className="text-[#00f2fe] font-bold text-[10px]">{inc.zone}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                        {inc.description}
                      </p>
                      <div className="text-[9px] text-slate-500 mt-1 font-semibold">
                        Dispatched: {inc.responders_dispatched} responders
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      inc.severity === 'critical' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
                        : (inc.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30')
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
