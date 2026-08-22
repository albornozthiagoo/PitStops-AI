import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "lg";
  rivets?: boolean;
}

/**
 * Contenedor base: chapa cortada en diagonal + gradiente sutil de grafito.
 * Usar para cualquier módulo "ensamblado" (cards, documentos, listas).
 */
export function Panel({
  size = "sm",
  rivets = true,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "relative border border-line bg-gradient-to-b from-graphite-880 to-graphite-900",
        size === "lg" ? "clip-cut-lg" : "clip-cut",
        rivets && "rivets",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
