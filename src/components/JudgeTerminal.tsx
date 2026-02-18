'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatSession, useChatStore } from '@/lib/chat-store';

export default function JudgeTerminal() {
  const [response, setResponse] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessions = useChatStore((state) => state.sessions);
  
  const activeSessions = sessions.filter(s => s.status === 'judging' || s.status === 'connected');
  const currentSession = sessions.find(s => s.id === selectedSession) || activeSessions[0];

  useEffect(() => {
    if (activeSessions.length > 0 && !selectedSession) {
      setSelectedSession(activeSessions[0].id);
    }
  }, [activeSessions.length, selectedSession]);

  const handleSubmit = () => {
    if (!response.trim() || !currentSession) return;
    
    // Add judge response to the chat
    useChatStore.getState().addMessage(currentSession.id, {
      id: `judge_${Date.now()}`,
      role: 'judge',
      content: response,
      timestamp: Date.now(),
    });
    
    // Simulate scoring
    const score = Math.floor(Math.random() * 100);
    const isVictory = score >= 70;
    
    useChatStore.getState().updateSession(currentSession.id, {
      status: isVictory ? 'victory' : 'defeat',
    });
    
    setResponse('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!currentSession) {
    return (
      <div className="w-80 bg-black border-l border-green-500/30 p-4 flex items-center justify-center">
        <div className="text-green-500/50 font-mono text-sm">
          [ NO ACTIVE SESSIONS ]
        </div>
      </div>
    );
  }

  const currentMessages = currentSession.messages;
  const lastMessage = currentMessages[currentMessages.length - 1];

  return (
    <div className="w-80 bg-black border-l border-green-500/30 flex flex-col h-full">
      {/* Judge Header */}
      <div className="p-4 border-b border-green-500/30">
        <h2 className="text-green-500 font-mono text-sm tracking-wider">
          [ JUDGE TERMINAL ]
        </h2>
        <div className="text-xs text-green-500/60 font-mono mt-1">
          Targeting: {currentSession.agentName}
        </div>
      </div>

      {/* Session Selector */}
      <div className="p-2 border-b border-green-500/20">
        <select
          value={selectedSession || ''}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full bg-black border border-green-500/50 text-green-400 font-mono text-xs p-2 focus:outline-none focus:border-green-400"
        >
          {activeSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.agentName} [{s.status.toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      {/* Current Dialogue Preview */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentMessages.slice(-3).map((msg) => (
          <div
            key={msg.id}
            className={`text-xs font-mono ${
              msg.role === 'judge' ? 'text-cyan-400' : 'text-green-400'
            }`}
          >
            <span className="opacity-50">
              [{new Date(msg.timestamp).toLocaleTimeString()}]
            </span>{' '}
            <span className="font-bold">{msg.role === 'judge' ? 'JUDGE' : 'AGENT'}:</span>{' '}
            {msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content}
          </div>
        ))}
      </div>

      {/* Response Input */}
      <div className="p-4 border-t border-green-500/30">
        <div className="text-xs text-green-500/60 font-mono mb-2">
          [ YOUR JUDGMENT ]
        </div>
        <textarea
          ref={inputRef}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your judgment..."
          className="w-full h-24 bg-black border border-green-500/50 text-green-400 font-mono text-xs p-3 resize-none focus:outline-none focus:border-green-400 placeholder-green-500/30"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-green-500/50 font-mono">
            {response.length}/500
          </span>
          <button
            onClick={handleSubmit}
            disabled={!response.trim()}
            className="px-4 py-1 border border-green-500 text-green-400 font-mono text-xs hover:bg-green-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            [ EXECUTE ]
          </button>
        </div>
      </div>

      {/* Score Indicator */}
      <div className="p-4 border-t border-green-500/30 bg-green-500/5">
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-green-500/60">PERSUASION SCORE</span>
          <span className="text-green-400">{Math.floor(Math.random() * 40 + 60)}/100</span>
        </div>
        <div className="h-1 bg-green-500/20">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${Math.floor(Math.random() * 40 + 60)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
