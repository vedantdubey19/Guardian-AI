'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { api } from '../../../services/api';
import { CrowdPredictionResponse, PredictionItem } from '../../../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  LineChart as LineIcon, 
  AlertCircle, 
  Calendar, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function PredictionCenter() {
  const { selectedNode, setSelectedNode } = useDashboard();
  
  // Default to Gate C if no node is selected
  const activeZone = selectedNode || 'Gate C';
  
  const [predictionData, setPredictionData] = useState<CrowdPredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch prediction details when active zone changes
  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getCrowdPredictions(activeZone);
        setPredictionData(data);
      } catch (err: any) {
        console.error('Prediction fetch error:', err);
        setError(err.message || 'Failed to load predictive telemetry.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPredictions();
  }, [activeZone]);

  const zoneList = [
    // Gates
    'Gate A', 'Gate B', 'Gate C', 'Gate D', 'Gate E', 'Gate F', 'Gate G', 'Gate H',
    // Seating Zones
    'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H',
    // Concourses
    'Concourse 1', 'Concourse 4', 'Concourse 7', 'Concourse 10', 'Concourse 12'
  ];

  // Recharts Data Mapping
  const chartData = predictionData
    ? predictionData.predictions.map((p) => ({
        time: `+${p.time_horizon_minutes}m`,
        'Risk Index': p.risk_score,
        'Confidence': p.confidence,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      {/* Selector Dropdown Header */}
      <div className="glass-panel p-4.5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <LineIcon className="w-4 h-4 text-cyan-400" />
            AI Crowd Forecasting Hub
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Select a sector to analyze predictive bottlenecks and queuing loads.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Sector:</span>
          <select
            value={activeZone}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition-all font-semibold"
          >
            {zoneList.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !predictionData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-[#00f2fe]/30 border-t-[#00f2fe] rounded-full animate-spin"></div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Consulting Gemini Predictor Node...</span>
        </div>
      ) : error ? (
        <div className="glass-panel p-6 rounded-2xl border-rose-500/20 bg-rose-950/10 text-center flex flex-col items-center justify-center gap-2.5">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <div className="text-xs font-bold text-slate-200">Failed to Retrieve Risk Forecast</div>
          <p className="text-[10px] text-slate-400 max-w-sm">{error}</p>
        </div>
      ) : predictionData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Recharts Prediction Trends (Col 7) */}
          <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">30-Minute Threat Forecast Curve</h3>
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Live Analysis</span>
            </div>

            {/* Recharts Render (Client-only to avoid Hydration mismatches) */}
            <div className="w-full aspect-[2/1] text-xs">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Risk Index"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      activeDot={{ r: 6 }}
                      dot={{ strokeWidth: 1.5, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Confidence"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-slate-900/30 animate-pulse rounded-lg"></div>
              )}
            </div>
            
            <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose-500"></span> Risk Score Index</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-px border-t border-dashed border-cyan-400"></span> Confidence Level %</span>
            </div>
          </div>

          {/* Right: Explanations list (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Explainable AI Risk Predictions</h3>
            </div>

            <div className="space-y-4">
              {predictionData.predictions.map((pred) => {
                const isHighRisk = pred.risk_score > 60;
                const isMediumRisk = pred.risk_score > 30 && pred.risk_score <= 60;
                
                return (
                  <div
                    key={pred.time_horizon_minutes}
                    className={`glass-panel p-4.5 rounded-2xl border-slate-800/60 shadow-lg flex flex-col gap-3 relative overflow-hidden transition-all hover:border-slate-700/80 ${
                      isHighRisk ? 'border-l-2 border-l-rose-500' : (isMediumRisk ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-emerald-500')
                    }`}
                  >
                    {/* Prediction Horizon Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-extrabold text-slate-100 text-xs">
                          In {pred.time_horizon_minutes} Minutes
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[8px] uppercase font-bold text-slate-500">Risk</div>
                          <span className={`text-xs font-black ${isHighRisk ? 'text-rose-400' : (isMediumRisk ? 'text-amber-400' : 'text-emerald-400')}`}>
                            {pred.risk_score}%
                          </span>
                        </div>
                        <div className="text-right border-l border-slate-800 pl-3">
                          <div className="text-[8px] uppercase font-bold text-slate-500">Confidence</div>
                          <span className="text-xs font-black text-cyan-400">{pred.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Congestion Description */}
                    <div className="text-xs leading-relaxed">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">Flow Telemetry Outlook</span>
                      <p className="text-slate-300 font-semibold">{pred.expected_congestion}</p>
                    </div>

                    {/* Explanatory Reasoning */}
                    <div className="text-xs leading-relaxed">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-cyan-400" />
                        Why (Explainable Evidence)
                      </span>
                      <p className="text-slate-400 text-[11px] font-medium leading-relaxed">{pred.reasoning}</p>
                    </div>

                    {/* Recommendations */}
                    <div className="text-xs pt-2.5 border-t border-slate-800/60">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-1.5 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        AI Recommended Safeguards
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {pred.recommended_actions.map((act, i) => (
                          <div key={i} className="text-slate-300 text-[11px] font-medium flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#00f2fe] mt-1.5 shrink-0"></span>
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs">
          Select a sector to generate predictive risk assessments.
        </div>
      )}
    </div>
  );
}
