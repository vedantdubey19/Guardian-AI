'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
import { api } from '../../../services/api';
import { CopilotMessage } from '../../../types';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Compass, 
  CheckCircle, 
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Gauge
} from 'lucide-react';

export default function DecisionCopilot() {
  const { telemetry, activeIncidents } = useDashboard();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to the Guardian AI Decision Copilot. I have direct visibility over the live stadium grid, active emergency incidents, and security/medical positioning. How can I assist you with operations today?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef<number>(0);

  const suggestedQueries = [
    "Explain today's risks.",
    "Predict next congestion.",
    "Safest evacuation route.",
    "Deploy security efficiently.",
    "Why is Gate C crowded?",
    "What happens if Gate B closes?"
  ];

  // Auto scroll to latest chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    messageIdRef.current += 1;
    const userMsgId = `msg-${messageIdRef.current}`;

    // Add user message
    const userMsg: CopilotMessage = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      // Build conversation history for context (exclude welcome message)
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Call API
      const result = await api.askCopilot(queryText, chatHistory);

      messageIdRef.current += 1;
      const aiMsgId = `msg-ai-${messageIdRef.current}`;

      // Add AI Response
      const aiMsg: CopilotMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        details: result
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error('Copilot query error:', err);
      const errMsgText = err instanceof Error ? err.message : 'Unable to retrieve AI analysis. Check backend server and API keys.';
      
      messageIdRef.current += 1;
      const errMsgId = `msg-err-${messageIdRef.current}`;

      // Add error response
      const errMsg: CopilotMessage = {
        id: errMsgId,
        role: 'assistant',
        content: `Error: ${errMsgText}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] items-stretch">
      {/* Left Column: Quick Suggestions & Context Status (Col 4) */}
      <div className="lg:col-span-4 flex flex-col gap-5 h-full">
        {/* Suggestion Prompts */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <Compass className="w-4.5 h-4.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Suggested Queries</h3>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Click any operational scenario query below to instantly run threat analysis on the live stadium:
          </p>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {suggestedQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(query)}
                disabled={loading}
                className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-800/30 text-xs font-medium text-slate-300 hover:text-white transition-all text-ellipsis overflow-hidden whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Live Context Telemetry Summary */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/60 shadow-xl flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Copilot Telemetry Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs text-slate-300">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-slate-500">Risk Matrix</span>
              <div className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-slate-800/80">
                <span>Stadium Risk Index:</span>
                <span className="font-bold text-rose-400">{telemetry?.overall_risk_score ?? 12}%</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-slate-500">Active Incidents</span>
              <div className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-slate-800/80">
                <span>Active count:</span>
                <span className="font-bold text-amber-500">{activeIncidents.length}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-slate-500">High Congestion sectors</span>
              <div className="space-y-1">
                {Object.entries(telemetry?.densities ?? {})
                  .filter(([, d]) => d > 0.7)
                  .map(([zone, d]) => (
                    <div key={zone} className="flex justify-between items-center text-[11px] bg-red-950/20 px-2.5 py-1 rounded border border-red-500/20 text-rose-300">
                      <span>{zone}</span>
                      <span>{Math.round(d * 100)}% density</span>
                    </div>
                  ))}
                {Object.values(telemetry?.densities ?? {}).filter(d => d > 0.7).length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">No zones currently above 70% density limit.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Chat Console (Col 8) */}
      <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl border-slate-800/60 shadow-xl overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f2fe]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Operations Intelligence Copilot</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Powered by Gemini AI Engine</p>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 items-start ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar for assistant */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00f2fe] shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble Content */}
              <div className="flex flex-col gap-2.5 max-w-[85%]">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/65 text-slate-200 border border-slate-800/80 rounded-tl-none'
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Structured Reasoning Accordions (Gemini Outputs) */}
                {msg.role === 'assistant' && msg.details && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
                    {/* Explainable Reasoning Tab */}
                    <div className="glass-panel p-3.5 rounded-xl border-slate-800/80 bg-slate-950/20 text-xs">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                        AI Analysis Reasoning
                      </h4>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {msg.details.reasoning}
                      </p>
                    </div>

                    {/* Dispatched Actions Plan Tab */}
                    <div className="glass-panel p-3.5 rounded-xl border-slate-800/80 bg-slate-950/20 text-xs">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                        Command Directives
                      </h4>
                      <ul className="space-y-1">
                        {msg.details.suggested_actions.map((act, idx) => (
                          <li key={idx} className="text-slate-300 text-[11px] flex items-start gap-1.5">
                            <span className="text-[#00f2fe] font-bold">{idx + 1}.</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Supporting Telemetry Evidence */}
                    <div className="glass-panel p-3.5 rounded-xl border-slate-800/80 bg-slate-950/20 text-xs">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Supporting Telemetry Evidence
                      </h4>
                      <ul className="space-y-1">
                        {msg.details.supporting_evidence.map((ev, idx) => (
                          <li key={idx} className="text-slate-400 text-[10px] italic flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Reliability Confidence Score */}
                    <div className="glass-panel p-3.5 rounded-xl border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          Model Reliability
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">Confidence probability index</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-400">{msg.details.confidence_score}%</div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Confidence</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Loading Indicator */}
          {loading && (
            <div className="flex gap-4 items-start justify-start" aria-live="assertive">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00f2fe] shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/65 border border-slate-800/80 text-xs text-slate-400 rounded-tl-none flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="typing-cursor font-semibold tracking-wide uppercase text-[10px]">Analyzing telemetry patterns...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Text Form Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-4 border-t border-slate-800/60 bg-slate-950/80 flex gap-2.5 items-center shrink-0"
        >
          <label htmlFor="chatInput" className="sr-only">Ask Copilot</label>
          <input
            id="chatInput"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Copilot: 'Why is Gate C crowded?' or 'Safest route to Gate H'..."
            disabled={loading}
            aria-label="Operations Copilot Query"
            className="flex-1 bg-slate-900/70 border border-slate-800/80 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-blue-500/20 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
