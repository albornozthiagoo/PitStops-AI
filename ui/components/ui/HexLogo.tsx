export function HexLogo({ size = 34 }: { size?: number }) {
  return (
    <div
      className="relative flex-none border border-line flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #454c52, #2c3135)",
        clipPath: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)",
      }}
    >
      <div
        className="absolute bg-graphite-900"
        style={{
          inset: 3,
          clipPath: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)",
        }}
      />
      <span className="relative z-10 text-action-orange font-display font-bold text-sm">
        P
      </span>
    </div>
  );
}
