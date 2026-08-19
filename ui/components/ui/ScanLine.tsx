/**
 * Elemento firma de PitStop AI: barre verticalmente un panel,
 * referenciando el gesto de un escáner automotriz (Snap-on/Bosch).
 * Usar con moderación — un solo scanline por vista como máximo.
 */
export function ScanLine() {
  return (
    <div
      className="absolute left-0 right-0 top-0 h-0.5 pointer-events-none animate-scan"
      style={{
        background:
          "linear-gradient(90deg, transparent, #ff6a00 20%, #ff6a00 80%, transparent)",
        boxShadow: "0 0 8px 1px rgba(255,106,0,.35)",
      }}
      aria-hidden="true"
    />
  );
}

export function ScanBar({ pct = 60 }: { pct?: number }) {
  return (
    <div className="h-1.5 bg-graphite-950 border border-line relative overflow-hidden">
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background:
            "repeating-linear-gradient(90deg, #ff6a00 0 6px, #b34b00 6px 12px)",
        }}
      />
    </div>
  );
}

export function ProbBar({ pct }: { pct: number }) {
  return (
    <div className="h-[5px] bg-graphite-950 border border-line-soft overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-action-dim to-action-orange"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
