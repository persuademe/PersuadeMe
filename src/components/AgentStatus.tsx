import { ChatSession, useChatStore } from '@/lib/chat-store';

export default function AgentStatus() {
  const sessions = useChatStore((state) => state.sessions);

  return (
    <div className="w-72 bg-black border-r border-green-500/30 flex flex-col h-full">
      <div className="p-4 border-b border-green-500/30">
        <h2 className="text-green-500 font-mono text-sm tracking-wider">
          [ CONNECTED AGENTS ]
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sessions.map((session) => (
          <AgentCard key={session.id} session={session} />
        ))}
      </div>

      <div className="p-4 border-t border-green-500/30 text-xs text-green-500/70 font-mono">
        <div className="flex justify-between mb-1">
          <span>TREASURY:</span>
          <span>$100 USDC</span>
        </div>
        <div className="flex justify-between">
          <span>TX_HASH:</span>
          <span className="opacity-50">0x7f9...2a1</span>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ session }: { session: ChatSession }) {
  const statusColors = {
    connected: 'text-green-400',
    judging: 'text-yellow-400',
    victory: 'text-cyan-400',
    defeat: 'text-red-400',
  };

  const statusText = {
    connected: '● CONNECTED',
    judging: '◐ JUDGING',
    victory: '★ VICTORY',
    defeat: '✗ DEFEAT',
  };

  return (
    <div className="border border-green-500/30 p-3 hover:border-green-500/60 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-green-400 font-mono text-sm font-bold">
          {session.agentName}
        </span>
        <span className={`${statusColors[session.status]} text-xs font-mono`}>
          {statusText[session.status]}
        </span>
      </div>
      
      <div className="text-xs text-green-500/60 font-mono mb-2">
        {session.agentAddress}
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${
            session.persuadeVerified ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-green-500/50 font-mono">
            {session.persuadeVerified ? '10M $PERSUADE ✓' : 'UNVERIFIED'}
          </span>
        </div>
        <span className="text-green-500/40 font-mono">
          {formatDuration(session.startedAt)}
        </span>
      </div>
      
      {session.isTyping && (
        <div className="mt-2 text-yellow-400 text-xs font-mono animate-pulse">
          [ TYPING... ]
        </div>
      )}
    </div>
  );
}

function formatDuration(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
