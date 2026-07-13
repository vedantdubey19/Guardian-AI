'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Timer, 
  PieChart as PieIcon,
  Activity,
  Calendar
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Crowd Density Trends (Area Chart)
  const densityTrendsData = [
    { name: '15:00', 'Zone A': 20, 'Zone B': 35, 'Gate C': 75 },
    { name: '15:15', 'Zone A': 35, 'Zone B': 40, 'Gate C': 80 },
    { name: '15:30', 'Zone A': 50, 'Zone B': 55, 'Gate C': 85 },
    { name: '15:45', 'Zone A': 65, 'Zone B': 60, 'Gate C': 90 },
    { name: '16:00', 'Zone A': 85, 'Zone B': 80, 'Gate C': 30 }, // Ingress ends, match begins
    { name: '16:15', 'Zone A': 88, 'Zone B': 84, 'Gate C': 15 },
  ];

  // 2. Incidents by Type (Bar Chart)
  const incidentFrequencyData = [
    { name: 'Medical', 'Incidents': 18, fill: '#ef4444' },
    { name: 'Gate Block', 'Incidents': 12, fill: '#f59e0b' },
    { name: 'Power Grid', 'Incidents': 4, fill: '#3b82f6' },
    { name: 'Suspicious Group', 'Incidents': 7, fill: '#a855f7' },
    { name: 'Fire Hazard', 'Incidents': 2, fill: '#dc2626' },
  ];

  // 3. Response Dispatch Speed (Bar Chart)
  const responseTimeData = [
    { name: 'Critical', 'Response Time (s)': 42 },
    { name: 'High', 'Response Time (s)': 78 },
    { name: 'Medium', 'Response Time (s)': 145 },
    { name: 'Low', 'Response Time (s)': 230 },
  ];

  // 4. Exit Utilization (Pie Chart)
  const exitUtilizationData = [
    { name: 'Gate A/B', value: 35, color: '#3b82f6' },
    { name: 'Gate C/D', value: 28, color: '#06b6d4' },
    { name: 'Gate E/F', value: 22, color: '#10b981' },
    { name: 'Gate G/H', value: 15, color: '#8b5cf6' },
  ];

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      
      {/* Header Widget */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Stadium Historical Analytics
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Retrospective evaluation of safety logs, dispatch parameters, and gate flow utilization.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 glass-panel px-3 py-1.5 rounded-lg border-slate-850">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Matchday 3 Egress Logs</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Chart 1: Crowd Density Shifts (Area Chart) */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <TrendingUp className="w-4.5 h-4.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Crowd Density Trends</h3>
          </div>
          <div className="w-full aspect-[16/9] text-xs">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={densityTrendsData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorZoneA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGateC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Zone A" stroke="#f43f5e" fillOpacity={1} fill="url(#colorZoneA)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Gate C" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGateC)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-900/30 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>

        {/* Chart 2: Incident Frequency by Sector Type (Bar Chart) */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Incident Counts by Type</h3>
          </div>
          <div className="w-full aspect-[16/9] text-xs">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentFrequencyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="Incidents" radius={[4, 4, 0, 0]}>
                    {incidentFrequencyData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-900/30 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>

        {/* Chart 3: Average Responder speed in seconds (Bar Chart) */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <Timer className="w-4.5 h-4.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Average Dispatch Response Time (Seconds)</h3>
          </div>
          <div className="w-full aspect-[16/9] text-xs">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseTimeData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="Response Time (s)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-900/30 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>

        {/* Chart 4: Exit Gate Utilization (Pie Chart) */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <PieIcon className="w-4.5 h-4.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Exit Gate Utilization Ratio</h3>
          </div>
          <div className="w-full aspect-[16/9] flex items-center justify-center text-xs">
            {mounted ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={exitUtilizationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {exitUtilizationData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-col gap-2.5">
                  {exitUtilizationData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }}></span>
                      <span className="font-bold text-slate-300">{entry.name}:</span>
                      <span className="font-black text-slate-100">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-slate-900/30 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
