'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { useWebSocket } from '../../hooks/useWebSocket';
import { api } from '../../services/api';
import { LiveTelemetry, Incident } from '../../types';

interface DashboardContextType {
  telemetry: LiveTelemetry | null;
  isConnected: boolean;
  activeIncidents: Incident[];
  refreshIncidents: () => Promise<void>;
  selectedNode: string;
  setSelectedNode: (node: string) => void;
  activeRoute: string[];
  setActiveRoute: (route: string[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { telemetry, isConnected } = useWebSocket();
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<string[]>([]);

  // Fetch active incidents from the database
  const refreshIncidents = useCallback(async () => {
    try {
      const data = await api.getIncidents('active');
      setActiveIncidents(data);
    } catch (err) {
      console.error('Failed to fetch active incidents list:', err);
    }
  }, []);

  // Poll active incidents list occasionally in case WebSockets drop
  useEffect(() => {
    refreshIncidents();
    const interval = setInterval(refreshIncidents, 8000);
    return () => clearInterval(interval);
  }, [refreshIncidents]);

  // Sync incident updates coming from WebSockets
  useEffect(() => {
    if (telemetry) {
      // Periodic synchronization - WebSockets push also triggers list refresh
      refreshIncidents();
    }
  }, [telemetry, refreshIncidents]);

  return (
    <DashboardContext.Provider
      value={{
        telemetry,
        isConnected,
        activeIncidents,
        refreshIncidents,
        selectedNode,
        setSelectedNode,
        activeRoute,
        setActiveRoute,
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-[#060913] text-slate-100">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Core Contents */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header System State bar */}
          <Header telemetry={telemetry} activeIncidentsCount={activeIncidents.length} />

          {/* Page Contents */}
          <main className="flex-1 overflow-y-auto relative p-6">
            {/* Cyber grid background layer */}
            <div className="absolute inset-0 cyber-grid pointer-events-none z-0"></div>
            
            {/* Inner Route contents container */}
            <div className="relative z-10 h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
