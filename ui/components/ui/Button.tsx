import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
}

const base =
  "font-display font-semibold uppercase tracking-wide clip-btn inline-flex items-center gap-2 transition-all duration-150 active:translate-y-px active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<string, string> = {
  primary:
    "bg-gradient-to-b from-[#ff7d1f] via-action-orange to-action-dim text-[#1a0d00] shadow-bevel hover:brightness-110 hover:shadow-orange-glow",
  secondary:
    "bg-gradient-to-b from-steel-650 to-steel-800 text-text-hi border border-line shadow-bevel hover:from-[#525960] hover:to-steel-700",
  ghost:
    "bg-transparent text-text-md border border-line hover:border-titanium-500 hover:text-text-hi",
};

const sizes: Record<string, string> = {
  md: "px-[22px] py-3 text-[13px]",
  sm: "px-3.5 py-2 text-[11px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
