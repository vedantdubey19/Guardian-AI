'use client';

import React, { useState } from 'react';
import { Shield, Activity, AlertTriangle } from 'lucide-react';
import { Incident } from '../types';

// Map coordinates mapping node name -> SVG x,y center positions
export const MAP_NODES: Record<string, { x: number; y: number; label: string; type: 'zone' | 'concourse' | 'gate' }> = {
  // Seating Zones (Inner Ring)
  "Zone A": { x: 400, y: 200, label: "Zone A (North)", type: 'zone' },
  "Zone B": { x: 480, y: 230, label: "Zone B (Northeast)", type: 'zone' },
  "Zone C": { x: 510, y: 300, label: "Zone C (East)", type: 'zone' },
  "Zone D": { x: 480, y: 370, label: "Zone D (Southeast)", type: 'zone' },
  "Zone E": { x: 400, y: 400, label: "Zone E (South)", type: 'zone' },
  "Zone F": { x: 320, y: 370, label: "Zone F (Southwest)", type: 'zone' },
  "Zone G": { x: 290, y: 300, label: "Zone G (West)", type: 'zone' },
  "Zone H": { x: 320, y: 230, label: "Zone H (Northwest)", type: 'zone' },

  // Concourses (Middle Ring)
  "Concourse 1": { x: 400, y: 140, label: "C1 (North Entrance)", type: 'concourse' },
  "Concourse 2": { x: 470, y: 160, label: "C2", type: 'concourse' },
  "Concourse 3": { x: 530, y: 220, label: "C3", type: 'concourse' },
  "Concourse 4": { x: 550, y: 300, label: "C4 (East Terminal)", type: 'concourse' },
  "Concourse 5": { x: 530, y: 380, label: "C5", type: 'concourse' },
  "Concourse 6": { x: 470, y: 440, label: "C6", type: 'concourse' },
  "Concourse 7": { x: 400, y: 460, label: "C7 (South Entrance)", type: 'concourse' },
  "Concourse 8": { x: 330, y: 440, label: "C8", type: 'concourse' },
  "Concourse 9": { x: 270, y: 380, label: "C9", type: 'concourse' },
  "Concourse 10": { x: 250, y: 300, label: "C10 (West Terminal)", type: 'concourse' },
  "Concourse 11": { x: 270, y: 220, label: "C11", type: 'concourse' },
  "Concourse 12": { x: 330, y: 160, label: "C12", type: 'concourse' },

  // Gates (Outer Ring)
  "Gate A": { x: 400, y: 80, label: "Gate A", type: 'gate' },
  "Gate B": { x: 535, y: 115, label: "Gate B", type: 'gate' },
  "Gate C": { x: 610, y: 300, label: "Gate C", type: 'gate' },
  "Gate D": { x: 535, y: 485, label: "Gate D", type: 'gate' },
  "Gate E": { x: 400, y: 520, label: "Gate E", type: 'gate' },
  "Gate F": { x: 265, y: 485, label: "Gate F", type: 'gate' },
  "Gate G": { x: 190, y: 300, label: "Gate G", type: 'gate' },
  "Gate H": { x: 265, y: 115, label: "Gate H", type: 'gate' },
};

// Connections to render edge lines in SVG background
const CONNECTION_LINES = [
  // Gates to Concourses
  ["Gate A", "Concourse 1"],
  ["Gate B", "Concourse 2"],
  ["Gate C", "Concourse 4"],
  ["Gate D", "Concourse 6"],
  ["Gate E", "Concourse 7"],
  ["Gate F", "Concourse 8"],
  ["Gate G", "Concourse 10"],
  ["Gate H", "Concourse 12"],

  // Concourses Loop
  ["Concourse 1", "Concourse 2"],
  ["Concourse 2", "Concourse 3"],
  ["Concourse 3", "Concourse 4"],
  ["Concourse 4", "Concourse 5"],
  ["Concourse 5", "Concourse 6"],
  ["Concourse 6", "Concourse 7"],
  ["Concourse 7", "Concourse 8"],
  ["Concourse 8", "Concourse 9"],
  ["Concourse 9", "Concourse 10"],
  ["Concourse 10", "Concourse 11"],
  ["Concourse 11", "Concourse 12"],
  ["Concourse 12", "Concourse 1"],

  // Concourses to Seating Zones
  ["Concourse 1", "Zone A"],
  ["Concourse 1", "Zone B"],
  ["Concourse 2", "Zone B"],
  ["Concourse 3", "Zone C"],
  ["Concourse 4", "Zone C"],
  ["Concourse 4", "Zone D"],
  ["Concourse 5", "Zone D"],
  ["Concourse 6", "Zone E"],
  ["Concourse 7", "Zone E"],
  ["Concourse 7", "Zone F"],
  ["Concourse 8", "Zone F"],
  ["Concourse 9", "Zone G"],
  ["Concourse 10", "Zone G"],
  ["Concourse 10", "Zone H"],
  ["Concourse 11", "Zone H"],
  ["Concourse 12", "Zone A"],
];

interface StadiumMapProps {
  densities: Record<string, number>;
  counts: Record<string, number>;
  activeIncidents: Incident[];
  responders: {
    id: string;
    name: string;
    type: 'security' | 'medical';
    location: string;
    status: 'idle' | 'responding';
  }[];
  activeRoutePath?: string[];
  selectedNode?: string;
  onNodeClick?: (nodeName: string) => void;
}

export const StadiumMap: React.FC<StadiumMapProps> = ({
  densities,
  counts,
  activeIncidents,
  responders,
  activeRoutePath = [],
  selectedNode,
  onNodeClick,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);

  // Helper to resolve color class based on density level
  const getDensityColor = (density: number = 0) => {
    if (density > 0.8) return '#f43f5e'; // neon red
    if (density > 0.6) return '#f97316'; // neon orange
    if (density > 0.4) return '#eab308'; // neon yellow
    return '#10b981'; // neon green
  };

  const getDensityOpacity = (density: number = 0) => {
    return Math.max(0.15, density * 0.8);
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Map Header Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="glass-panel text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Stadium Telemetry
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-1.5 glass-panel p-1 rounded-lg text-[10px] text-slate-400">
        <span className="flex items-center gap-1 px-2 py-0.5"><span className="w-2 h-2 rounded bg-emerald-500"></span> &lt;40%</span>
        <span className="flex items-center gap-1 px-2 py-0.5"><span className="w-2 h-2 rounded bg-yellow-500"></span> 40-60%</span>
        <span className="flex items-center gap-1 px-2 py-0.5"><span className="w-2 h-2 rounded bg-orange-500"></span> 60-80%</span>
        <span className="flex items-center gap-1 px-2 py-0.5"><span className="w-2 h-2 rounded bg-rose-500"></span> &gt;80%</span>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full select-none"
        aria-label="FIFA World Cup 2026 Stadium Map"
        role="img"
        onClick={() => {
          if (onNodeClick) onNodeClick('');
        }}
      >
        {/* Draw Connection Edges */}
        <g stroke="#334155" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round">
          {CONNECTION_LINES.map(([start, end], idx) => {
            const nStart = MAP_NODES[start];
            const nEnd = MAP_NODES[end];
            if (!nStart || !nEnd) return null;
            return (
              <line
                key={`edge-${idx}`}
                x1={nStart.x}
                y1={nStart.y}
                x2={nEnd.x}
                y2={nEnd.y}
              />
            );
          })}
        </g>

        {/* Draw Active Dynamic Route Line (Evacuation / Dispatch Path) */}
        {activeRoutePath.length > 1 && (
          <g>
            {/* Outline Glow Path */}
            <path
              d={activeRoutePath
                .map((nodeName, idx) => {
                  const node = MAP_NODES[nodeName];
                  if (!node) return '';
                  return `${idx === 0 ? 'M' : 'L'} ${node.x} ${node.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#00f2fe"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.35"
              className="animated-route-line"
            />
            {/* Inner Route Path */}
            <path
              d={activeRoutePath
                .map((nodeName, idx) => {
                  const node = MAP_NODES[nodeName];
                  if (!node) return '';
                  return `${idx === 0 ? 'M' : 'L'} ${node.x} ${node.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#00f2fe"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Draw Node Heatmap Rings & Polygons */}
        {Object.entries(MAP_NODES).map(([nodeName, node]) => {
          const density = densities[nodeName] || 0.15;
          const isSelected = selectedNode === nodeName;
          const isHovered = hoveredNode === nodeName || focusedNode === nodeName;
          const isRoute = activeRoutePath.includes(nodeName);
          const color = getDensityColor(density);
          const activeInc = activeIncidents.find((inc) => inc.zone === nodeName && inc.status !== 'resolved');

          // Render different shapes based on node type
          if (node.type === 'zone') {
            // Seating Zone - rendering wedge segments
            return (
              <g
                key={nodeName}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNodeClick) onNodeClick(nodeName);
                }}
                onMouseEnter={() => setHoveredNode(nodeName)}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setFocusedNode(nodeName)}
                onBlur={() => setFocusedNode(null)}
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${node.label}, Occupants: ${(counts[nodeName] || 1200).toLocaleString()} people, Density: ${Math.round(density * 100)}%`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNodeClick) onNodeClick(nodeName);
                  }
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="35"
                  fill={color}
                  fillOpacity={getDensityOpacity(density)}
                  stroke={isSelected ? '#00f2fe' : (isHovered ? '#ffffff' : '#1e293b')}
                  strokeWidth={isSelected ? '2.5' : (isHovered ? '2' : '1.5')}
                  className="transition-all duration-200"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="8"
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                {isRoute && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="40"
                    fill="none"
                    stroke="#00f2fe"
                    strokeWidth="1.5"
                    strokeDasharray="4,2"
                  />
                )}
              </g>
            );
          } else if (node.type === 'concourse') {
            // Concourse - smaller circle
            return (
              <g
                key={nodeName}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNodeClick) onNodeClick(nodeName);
                }}
                onMouseEnter={() => setHoveredNode(nodeName)}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setFocusedNode(nodeName)}
                onBlur={() => setFocusedNode(null)}
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${node.label}, Occupants: ${(counts[nodeName] || 1200).toLocaleString()} people, Density: ${Math.round(density * 100)}%`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNodeClick) onNodeClick(nodeName);
                  }
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill={color}
                  fillOpacity={getDensityOpacity(density) * 0.9}
                  stroke={isSelected ? '#00f2fe' : (isHovered ? '#ffffff' : '#334155')}
                  strokeWidth={isSelected ? '2' : '1.5'}
                  strokeDasharray={activeInc ? '3,2' : undefined}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="5"
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              </g>
            );
          } else {
            // Entry Gates - outer squares / gates
            return (
              <g
                key={nodeName}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNodeClick) onNodeClick(nodeName);
                }}
                onMouseEnter={() => setHoveredNode(nodeName)}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setFocusedNode(nodeName)}
                onBlur={() => setFocusedNode(null)}
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${node.label}, Occupants: ${(counts[nodeName] || 1200).toLocaleString()} people, Density: ${Math.round(density * 100)}%`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onNodeClick) onNodeClick(nodeName);
                  }
                }}
              >
                <rect
                  x={node.x - 14}
                  y={node.y - 14}
                  width="28"
                  height="28"
                  rx="6"
                  fill={color}
                  fillOpacity={getDensityOpacity(density) * 0.9}
                  stroke={isSelected ? '#00f2fe' : (isHovered ? '#ffffff' : '#475569')}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  fill="#000000"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  fillOpacity={density > 0.4 ? 0.9 : 0.4}
                >
                  {nodeName.slice(-1)}
                </text>
              </g>
            );
          }
        })}

        {/* Draw Pulsing Warning Circles for Active Incidents */}
        {activeIncidents
          .filter((inc) => inc.status !== 'resolved')
          .map((inc) => {
            const node = MAP_NODES[inc.zone];
            if (!node) return null;
            const size = inc.severity === 'critical' || inc.severity === 'high' ? 48 : 36;
            return (
              <g key={`marker-inc-${inc.id}`} className="pointer-events-none">
                {/* Red pulsing glow rings */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={size}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  className="pulse-red"
                />
                {/* Hazard indicator badge */}
                <g transform={`translate(${node.x + 12}, ${node.y - 15})`}>
                  <circle cx="8" cy="8" r="9" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>
            );
          })}

        {/* Draw Security and Medical responder team icons */}
        {responders.map((rep) => {
          const node = MAP_NODES[rep.location];
          if (!node) return null;
          const isMedical = rep.type === 'medical';
          
          // Shift coordinates slightly if multiple units reside at the same node
          const offsetIdx = responders.filter(r => r.location === rep.location).findIndex(r => r.id === rep.id);
          const dx = offsetIdx * 10 - 5;
          const dy = offsetIdx * -10 + 5;

          return (
            <g
              key={`marker-rep-${rep.id}`}
              transform={`translate(${node.x + dx}, ${node.y + dy})`}
              className="pointer-events-none transition-all duration-300"
            >
              {/* Unit Pin Background */}
              <path
                d="M0 0 C-6 -10 -8 -15 -8 -20 C-8 -25 -4 -28 0 -28 C4 -28 8 -25 8 -20 C8 -15 6 -10 0 0 Z"
                fill={isMedical ? '#ef4444' : '#3b82f6'}
                stroke="#ffffff"
                strokeWidth="1"
              />
              {/* Inner symbol */}
              {isMedical ? (
                // Medical Cross
                <path d="M-3.5 -20.5 h7 M0 -24 v7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                // Security Badge
                <polygon points="0,-24 3.5,-21 2.5,-16 0,-14.5 -2.5,-16 -3.5,-21" fill="white" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredNode && MAP_NODES[hoveredNode] && (
        <div
          className="absolute pointer-events-none p-3 rounded-lg border border-slate-700 bg-slate-900/95 text-xs text-slate-200 shadow-xl flex flex-col gap-1 z-30"
          style={{
            left: `${Math.min(70, Math.max(5, (MAP_NODES[hoveredNode].x / 800) * 100))}%`,
            top: `${Math.min(75, Math.max(5, (MAP_NODES[hoveredNode].y / 600) * 100 + 4))}%`,
          }}
        >
          <div className="font-bold text-[#00f2fe] flex items-center gap-1.5">
            {MAP_NODES[hoveredNode].type === 'gate' && <Shield className="w-3.5 h-3.5" aria-hidden="true" />}
            {MAP_NODES[hoveredNode].type === 'zone' && <Activity className="w-3.5 h-3.5" aria-hidden="true" />}
            {hoveredNode}
          </div>
          <div className="flex justify-between gap-6 mt-1 text-[10px]">
            <span className="text-slate-400">Crowd density:</span>
            <span className="font-semibold text-slate-200">
              {Math.round((densities[hoveredNode] || 0.15) * 100)}%
            </span>
          </div>
          <div className="flex justify-between gap-6 text-[10px]">
            <span className="text-slate-400">Total occupants:</span>
            <span className="font-semibold text-slate-200">
              {(counts[hoveredNode] || 1200).toLocaleString()} people
            </span>
          </div>
          {activeIncidents.some((i) => i.zone === hoveredNode && i.status !== 'resolved') && (
            <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" aria-hidden="true" />
              Active Incident Alert
            </div>
          )}
        </div>
      )}
    </div>
  );
};
