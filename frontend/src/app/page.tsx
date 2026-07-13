'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShieldAlert, Sparkles, Activity, Users, Shield, ArrowRight } from 'lucide-react';

export default function HomeLanding() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // HTML Canvas Animated Globe/Stadium wireframe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Globe drawing variables
    let angle = 0;
    const radius = Math.min(width, height) * 0.35;
    const points: { x: number; y: number; z: number }[] = [];

    // Generate coordinates on a sphere (Globe lat/long points)
    const count = 180;
    for (let i = 0; i < count; i++) {
      const theta = Math.acos(Math.random() * 2 - 1);
      const phi = Math.random() * Math.PI * 2;
      points.push({
        x: Math.sin(theta) * Math.cos(phi) * radius,
        y: Math.sin(theta) * Math.sin(phi) * radius,
        z: Math.cos(theta) * radius,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      // Rotate angle
      angle += 0.003;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
      ctx.lineWidth = 1;
      
      // Draw latitude lines
      for (let r = 50; r <= radius; r += 50) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Project and draw globe nodes
      points.forEach((pt) => {
        // Rotate around Y axis
        const x1 = pt.x * cos - pt.z * sin;
        const z1 = pt.z * cos + pt.x * sin;
        
        // Depth mapping opacity
        const alpha = (z1 + radius) / (radius * 2);
        
        // Perspective projection
        const scale = 500 / (500 + z1 * 0.5);
        const px = x1 * scale;
        const py = pt.y * scale;

        ctx.fillStyle = `rgba(0, 242, 254, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Glowing links to close points
        points.forEach((other) => {
          const dx = other.x - pt.x;
          const dy = other.y - pt.y;
          const dz = other.z - pt.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist > 0 && dist < 65) {
            const ox = other.x * cos - other.z * sin;
            const oz = other.z * cos + other.x * sin;
            const oAlpha = (oz + radius) / (radius * 2);
            
            const oScale = 500 / (500 + oz * 0.5);
            const opx = ox * oScale;
            const opy = other.y * oScale;

            ctx.strokeStyle = `rgba(79, 172, 254, ${(alpha + oAlpha) * 0.045})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(opx, opy);
            ctx.stroke();
          }
        });
      });

      ctx.restore();
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 relative flex flex-col justify-between overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-75 pointer-events-none z-0"></div>

      {/* Floating Glowing Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none z-0"></div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">GUARDIAN AI</h1>
            <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Stadium Command Node</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 glass-panel px-4 py-1.5 rounded-full border-slate-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Active</span>
        </div>
      </header>

      {/* Hero Body Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-10">
        {/* Left Hand: Typography Hero Intro */}
        <div className="flex-1 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start max-w-2xl">
          <div className="inline-flex items-center gap-2 glass-panel px-3.5 py-1.5 rounded-full border-cyan-500/20 text-[#00f2fe] text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            FIFA World Cup 2026 Command Center
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white">
            Predictive Stadium <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
              Operations Brain
            </span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Guardian AI is an enterprise-grade crowd safety and incident response platform. It utilizes live sensor simulation, graph pathfinding, and the Gemini API to resolve crowd bottlenecks and emergencies before they escalate.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/25 hover:scale-[1.02] flex items-center gap-2 group cursor-pointer"
            >
              Enter Command Console
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Right Hand: 3D Globe Vector Animation Canvas */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none aspect-square relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full max-w-[420px] max-h-[420px] pointer-events-none"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[320px] h-[320px] rounded-full border border-cyan-500/5 animate-ping opacity-25"></div>
          </div>
        </div>
      </main>

      {/* Scrolling Metrics Marquee Footer */}
      <footer className="relative z-10 w-full bg-slate-950/40 border-t border-slate-900 py-4 overflow-hidden shrink-0">
        <div className="flex items-center gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none animate-marquee whitespace-nowrap">
          <div className="flex gap-12 shrink-0">
            <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-400" /> Spectator Egress Tracker Ready</span>
            <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-[#00f2fe]" /> Heatmap density nodes connected</span>
            <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /> RLS Database policies verified</span>
            <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Gemini-1.5-Flash online</span>
          </div>
          <div className="flex gap-12 shrink-0">
            <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-400" /> Spectator Egress Tracker Ready</span>
            <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-[#00f2fe]" /> Heatmap density nodes connected</span>
            <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /> RLS Database policies verified</span>
            <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Gemini-1.5-Flash online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
