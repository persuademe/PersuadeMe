'use client';

import { useChatStore, ChatSession } from '@/lib/chat-store';

export default function BattleFeed() {
  const sessions = useChatStore((state) => state.sessions);
  const activeSessions = sessions.filter(
    (s) => s.status === 'connected' || s.status === 'judging'
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-green-500/30">
        <div className="flex items-center justify-between">
          <h1 className="text-green-500 font-mono text-lg tracking-widest">
            BATTLE FEED
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 animate-pulse" />
              <span className="text-green-500/60">LIVE</span>
            </span>
            <span className="text-green-500/40">
              {activeSessions.length} ACTIVE BATTLES
            </span>
          </div>
        </div>
      </div>

      {/* Battle Columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max">
          {sessions.map((session) => (
            <BattleColumn key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleColumn({ session }: { session: ChatSession }) {
  const statusStyles = {
    connected: 'border-green-500/30',
    judging: 'border-yellow-500/50',
    victory: 'border-cyan-500/50 bg-cyan-500/5',
    defeat: 'border-red-500/50 bg-red-500/5',
  };

  const statusBadge = {
    connected: 'bg-green-500/20 text-green-400',
    judging: 'bg-yellow-500/20 text-yellow-400',
    victory: 'bg-cyan-500/20 text-cyan-400',
    defeat: 'bg-red-500/20 text-red-400',
  };

  return (
    <div
      className={`w-80 flex-shrink-0 border ${statusStyles[session.status]} flex flex-col h-full max-h-[calc(100vh-200px)]`}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-green-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-green-400 font-mono text-sm font-bold">
            {session.agentName}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-mono ${
              session.status === 'connected'
                ? 'bg-green-500/10 text-green-400'
                : statusBadge[session.status]
            }`}
          >
            {session.status.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-green-500/50 font-mono truncate">
          {session.agentAddress}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {session.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        {session.isTyping && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono animate-pulse">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
            <span className="animate-bounce delay-100">A</span>
            <span className="animate-bounce delay-200">G</span>
            <span className="animate-bounce delay-300">E</span>
            <span className="animate-bounce delay-150">N</span>
            <span className="animate-bounce delay-250">T</span>
            <span className="ml-1">typing...</span>
          </div>
        )}
      </div>

      {/* Column Footer */}
      <div className="p-3 border-t border-green-500/20">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-green-500/40">
            {session.messages.length} MESSAGES
          </span>
          <span className="text-green-500/40">
            {formatTime(session.lastActivity)}
          </span>
        </div>
        
        {session.status === 'victory' && (
          <div className="mt-2 text-center">
            <span className="text-cyan-400 font-mono text-xs animate-pulse">
              ★ VICTORY AWARDED ★
            </span>
          </div>
        )}
        
        {session.status === 'defeat' && (
          <div className="mt-2 text-center">
            <span className="text-red-400 font-mono text-xs">
              ✗ DEFEATED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: { role: string; content: string; timestamp: number } }) {
  const isJudge = message.role === 'judge';
  
  return (
    <div className={`flex flex-col ${isJudge ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[90%] px-3 py-2 ${
          isJudge
            ? 'bg-cyan-500/10 border border-cyan-500/30'
            : 'bg-green-500/10 border border-green-500/30'
        }`}
      >
        <div className={`text-xs font-mono ${
          isJudge ? 'text-cyan-400' : 'text-green-400'
        }`}>
          {isJudge ? 'JUDGE' : 'AGENT'}
        </div>
        <div className="text-xs text-green-500/80 font-mono mt-1 break-words">
          {message.content}
        </div>
      </div>
      <div className="text-[10px] text-green-500/30 font-mono mt-1">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
