interface WinRateBarProps {
  whiteWins: number;
  draws: number;
  blackWins: number;
  showLabels?: boolean;
}

export function WinRateBar({ whiteWins, draws, blackWins, showLabels = false }: WinRateBarProps) {
  const total = whiteWins + draws + blackWins;
  if (total === 0) return null;

  const whitePercent = (whiteWins / total) * 100;
  const drawPercent = (draws / total) * 100;
  const blackPercent = (blackWins / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div className="bg-white-wins transition-all" style={{ width: `${whitePercent}%` }} />
        <div className="bg-draw transition-all" style={{ width: `${drawPercent}%` }} />
        <div className="bg-black-wins transition-all" style={{ width: `${blackPercent}%` }} />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-secondary">
          <span>{whitePercent.toFixed(0)}%</span>
          <span>{drawPercent.toFixed(0)}%</span>
          <span>{blackPercent.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
