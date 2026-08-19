import { InputHTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function FieldLabel({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-1.5 block",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full bg-graphite-950 border border-line text-text-hi px-3 py-[11px] text-sm clip-cut-sm placeholder:text-text-lo",
        "focus:border-action-orange focus:shadow-[0_0_0_3px_rgba(255,106,0,.15)] focus:outline-none transition-colors",
        className
      )}
      {...props}
    />
  );
}
