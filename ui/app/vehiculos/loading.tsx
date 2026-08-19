export default function Loading() {
  return (
    <div className="h-full flex items-center justify-center p-7">
      <div className="font-mono text-xs text-text-lo flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-action-orange rounded-full animate-pulse2" />
        Cargando vehículos…
      </div>
    </div>
  );
}
