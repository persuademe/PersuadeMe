'use client';

import { useChatStore } from '@/lib/chat-store';

export default function StatsPanel() {
  const getStats = useChatStore((state) => state.getStats);
  const stats = getStats();

  return (
    <div className="grid grid-cols-4 gap-4 p-4 border-b border-green-500/30 bg-black">
      <StatBox
        label="TOTAL CONVERSATIONS"
        value={stats.totalConversations.toString()}
      />
      <StatBox
        label="VICTORIES"
        value={stats.victories.toString()}
        highlight
      />
      <StatBox
        label="DEFEATS"
        value={stats.defeats.toString()}
      />
      <StatBox
        label="TREASURY"
        value="$100 USDC"
        sublabel="POT: 500 USDC"
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight = false,
  sublabel,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <div className={`border ${
      highlight
        ? 'border-green-400 bg-green-500/5'
        : 'border-green-500/30 bg-green-500/5'
    } p-3`}>
      <div className="text-xs text-green-500/60 font-mono mb-1">
        [{label}]
      </div>
      <div className={`font-mono text-xl ${
        highlight ? 'text-green-400' : 'text-green-500'
      }`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-green-500/40 font-mono mt-1">
          {sublabel}
        </div>
      )}
    </div>
  );
}
