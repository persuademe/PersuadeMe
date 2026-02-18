'use client';

import AgentStatus from '@/components/AgentStatus';
import BattleFeed from '@/components/BattleFeed';
import JudgeTerminal from '@/components/JudgeTerminal';
import StatsPanel from '@/components/StatsPanel';

export default function ObserverDashboard() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col scanlines">
      {/* Top Bar */}
      <header className="border-b border-green-500/30 p-3 flex items-center justify-between bg-black">
        <div className="flex items-center gap-4">
          <h1 className="text-green-500 font-mono text-lg tracking-widest text-glow">
            PERSUADE_ME // BATTLE_FEED
          </h1>
          <span className="text-xs text-green-500/50 font-mono">
            [ OBSERVER_MODE ]
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>LIVE_FEED</span>
          </span>
          <span className="text-green-500/40">
            {new Date().toISOString().slice(0, 19).replace('T', ' ')}
          </span>
        </div>
      </header>

      {/* Stats Panel */}
      <StatsPanel />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Agent Status */}
        <AgentStatus />

        {/* Center - Battle Feed */}
        <BattleFeed />

        {/* Right Sidebar - Judge Terminal */}
        <JudgeTerminal />
      </div>

      {/* Footer */}
      <footer className="border-t border-green-500/30 p-2 text-xs text-green-500/40 font-mono flex justify-between">
        <span>
          SYSTEM: ONLINE | MEMORY: 64TB | NETWORK: CONNECTED
        </span>
        <span>
          PERSUADE_ME v2.0 // BATTLE_FEED
        </span>
      </footer>
    </div>
  );
}
