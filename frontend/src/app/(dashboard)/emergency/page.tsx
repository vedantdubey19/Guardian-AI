'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { api } from '../../../services/api';
import { Incident, ActionPlanStep } from '../../../types';
import { 
  AlertTriangle, 
  Plus, 
  MapPin, 
  Route, 
  Check, 
  Accessibility, 
  Shield, 
  ListOrdered,
  Eye,
  Activity,
  FileSpreadsheet
} from 'lucide-react';

export default function EmergencyRoom() {
  const { 
    activeIncidents, 
    refreshIncidents, 
    setSelectedNode,
    setActiveRoute 
  } = useDashboard();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formZone, setFormZone] = useState<string>('Zone A');
  const [formType, setFormType] = useState<string>('medical');
  const [formSeverity, setFormSeverity] = useState<string>('medium');
  const [formDescription, setFormDescription] = useState<string>('');

  // Routing State
  const [routeStart, setRouteStart] = useState<string>('Gate A');
  const [accessibilityRequired, setAccessibilityRequired] = useState<boolean>(false);
  const [emergencyVehicle, setEmergencyVehicle] = useState<boolean>(false);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<{
    path: string[];
    travelTime: number;
    safetyRating: string;
    reasoning: string;
  } | null>(null);

  // Load all incidents on load
  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      // Select the first active incident by default if available
      const active = data.filter(i => i.status === 'active');
      if (active.length > 0 && !selectedIncident) {
        setSelectedIncident(active[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents list:', err);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [activeIncidents]);

  // Handle reporting a new incident
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    try {
      const newInc = await api.createIncident({
        zone: formZone,
        type: formType,
        severity: formSeverity,
        priority: formSeverity,
        description: formDescription,
        affected_zones: [formZone]
      });
      
      setFormDescription('');
      setShowAddForm(false);
      await refreshIncidents();
      await loadIncidents();
      setSelectedIncident(newInc);
    } catch (err) {
      console.error('Failed to report incident:', err);
    }
  };

  // Handle resolving an incident
  const handleResolveIncident = async (incId: number) => {
    try {
      await api.updateIncident(incId, { status: 'resolved' });
      await refreshIncidents();
      await loadIncidents();
      
      if (selectedIncident?.id === incId) {
        setSelectedIncident(prev => prev ? { ...prev, status: 'resolved' } : null);
      }
      
      // Clear route lines from map
      setActiveRoute([]);
      setRouteResult(null);
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  // Calculate dynamic route avoiding bottlenecks
  const handleCalculateRoute = async () => {
    if (!selectedIncident) return;
    
    setRouteLoading(true);
    setRouteResult(null);
    try {
      const result = await api.calculateRoute({
        start_node: routeStart,
        end_node: selectedIncident.zone,
        accessibility_required: accessibilityRequired,
        emergency_vehicle: emergencyVehicle
      });

      setRouteResult({
        path: result.path,
        travelTime: result.total_travel_time_seconds,
        safetyRating: result.safety_rating,
        reasoning: result.reasoning
      });

      // Push route path to global layout map so it overlays on StadiumMap
      setActiveRoute(result.path);
      // Select the zone in map view
      setSelectedNode(selectedIncident.zone);
    } catch (err) {
      console.error('Failed to calculate route path:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const zoneList = [
    'Gate A', 'Gate B', 'Gate C', 'Gate D', 'Gate E', 'Gate F', 'Gate G', 'Gate H',
    'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H',
    'Concourse 1', 'Concourse 4', 'Concourse 7', 'Concourse 10'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] items-stretch">
      
      {/* Left Panel: Incidents Operations List & Form (Col 4) */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Toggle Report Form Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            showAddForm 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60' 
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/20'
          }`}
        >
          {showAddForm ? 'Cancel Report' : 'Report New Incident'}
          {showAddForm ? null : <Plus className="w-4 h-4" />}
        </button>

        {/* Report Form Container */}
        {showAddForm ? (
          <form
            onSubmit={handleReportIncident}
            className="glass-panel p-5 rounded-2xl border-slate-800/60 flex flex-col gap-3 shrink-0"
          >
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Log Safety Hazard
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-500">Zone</span>
                <select
                  value={formZone}
                  onChange={(e) => setFormZone(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                >
                  {zoneList.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-500">Type</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none capitalize"
                >
                  {['medical', 'fire', 'gate_blockage', 'stampede', 'power_outage', 'suspicious_movement'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500">Severity</span>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none capitalize"
              >
                {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500">Description</span>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe current spectator emergency or hardware failure..."
                rows={3}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-rose-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!formDescription.trim()}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition-all mt-1 cursor-pointer"
            >
              Dispatch Responders (Real-time AI Plan)
            </button>
          </form>
        ) : null}

        {/* Incident Logs Feed */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex-1 flex flex-col gap-3.5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 shrink-0">
            <FileSpreadsheet className="w-4.5 h-4.5 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Emergency Registry</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {incidents.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs italic font-medium">
                No incidents reported in stadium log database.
              </div>
            ) : (
              incidents.map((inc) => {
                const isActive = inc.status === 'active';
                const isSelected = selectedIncident?.id === inc.id;
                
                return (
                  <div
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      setRouteResult(null); // Clear previous route calculations
                      setActiveRoute([]);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs relative flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-slate-900/90 border-[#00f2fe]/40 shadow-md shadow-[#00f2fe]/5'
                        : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="font-bold text-slate-200 capitalize">{inc.type.replace('_', ' ')}</span>
                      </div>
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                        inc.severity === 'critical' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {inc.severity}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[10px] line-clamp-1 italic">
                      {inc.description}
                    </p>

                    <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Zone: <strong className="text-slate-300 font-semibold">{inc.zone}</strong></span>
                      <span>{formatTime(inc.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Incident Detail, AI Action Plan & Pathing (Col 8) */}
      <div className="lg:col-span-8 flex flex-col gap-5 h-full overflow-y-auto pr-1">
        {selectedIncident ? (
          <>
            {/* Header Details Panel */}
            <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none"></div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    selectedIncident.status === 'active' 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {selectedIncident.status}
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-200 capitalize">
                    {selectedIncident.type.replace('_', ' ')} incident
                  </h2>
                  <span className="text-slate-600 font-bold">•</span>
                  <span className="text-[#00f2fe] font-black text-xs">{selectedIncident.zone}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed max-w-xl font-medium mt-1">
                  {selectedIncident.description}
                </p>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Reported: {new Date(selectedIncident.created_at).toLocaleString()}
                </div>
              </div>

              {selectedIncident.status === 'active' && (
                <button
                  onClick={() => handleResolveIncident(selectedIncident.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-emerald-500/10 shrink-0 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Resolve Incident
                </button>
              )}
            </div>

            {/* AI Action Plan steps */}
            <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
                <ListOrdered className="w-4.5 h-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Tactical Action Plan</h3>
              </div>

              {selectedIncident.action_plan && selectedIncident.action_plan.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedIncident.action_plan.map((step: ActionPlanStep) => (
                    <div
                      key={step.step}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/30 flex gap-3 text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-[#00f2fe] shrink-0 text-[10px]">
                        {step.step}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-200 text-[11px] uppercase tracking-wide">{step.actor}</span>
                          <span className={`text-[8px] uppercase font-extrabold px-1 rounded ${
                            step.priority === 'critical' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {step.priority}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed font-semibold mt-0.5">
                          {step.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs italic">
                  AI responders dispatch guidelines not initialized.
                </div>
              )}
            </div>

            {/* Smart Response Routing */}
            <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
                <Route className="w-4.5 h-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Smart Evacuation / Dispatch Engine</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-2xl">
                Plot response pathing dynamically. The routing engine applies weights automatically to avoid active incident danger radiuses and high occupant corridors.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
                {/* Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500">Starting Location</span>
                  <select
                    value={routeStart}
                    onChange={(e) => setRouteStart(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/35 transition-all font-semibold"
                  >
                    {zoneList
                      .filter((z) => z !== selectedIncident.zone)
                      .map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Toggles */}
                <div className="flex gap-4 p-2 select-none">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase text-slate-300">
                    <input
                      type="checkbox"
                      checked={accessibilityRequired}
                      onChange={(e) => setAccessibilityRequired(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <Accessibility className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Wheelchair Ramps</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase text-slate-300">
                    <input
                      type="checkbox"
                      checked={emergencyVehicle}
                      onChange={(e) => setEmergencyVehicle(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rescue Tunnel</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleCalculateRoute}
                  disabled={routeLoading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-lg hover:shadow-blue-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {routeLoading ? 'Plotting...' : 'Calculate Safe Transit'}
                  <Route className="w-4 h-4" />
                </button>
              </div>

              {/* Route Output Results */}
              {routeResult && (
                <div className="mt-4 p-4 rounded-xl border border-[#00f2fe]/20 bg-slate-900/40 text-xs flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                        routeResult.safetyRating === 'safe' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        Rating: {routeResult.safetyRating}
                      </span>
                      <span className="text-slate-500 font-bold">•</span>
                      <span className="text-slate-300 font-semibold">
                        Travel Time: <strong className="text-[#00f2fe] font-black">{routeResult.travelTime}s</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">{routeResult.path.length} path nodes</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Calculated Path Nodes</span>
                    <p className="text-slate-300 font-bold tracking-wide">
                      {routeResult.path.join(' ➔ ')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Route Logic Analysis</span>
                    <p className="text-slate-400 leading-relaxed font-semibold">
                      {routeResult.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="glass-panel p-20 rounded-2xl border-slate-800/60 shadow-xl text-center text-slate-500 text-xs font-semibold flex flex-col items-center justify-center gap-2">
            <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
            <span>Select an incident from the log feed to inspect and map response path routing.</span>
          </div>
        )}
      </div>

    </div>
  );
}
