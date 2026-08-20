"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HexLogo } from "@/components/ui";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard del taller",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: "/preot",
    label: "Pre-OT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    href: "/historial",
    label: "Historial de vehículos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-[76px] bg-graphite-900 border-r border-line flex flex-col items-center py-[18px] gap-1.5 flex-none">
      <Link href="/dashboard" className="mb-3.5">
        <HexLogo />
      </Link>

      {NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "relative w-12 h-12 flex items-center justify-center clip-btn border border-transparent transition-all duration-150",
              active
                ? "text-action-orange bg-steel-800 border-line"
                : "text-titanium-300 hover:text-text-hi hover:bg-steel-800"
            )}
          >
            {active && (
              <span
                className="absolute left-[-1px] top-1.5 bottom-1.5 w-0.5 bg-action-orange shadow-[0_0_6px_rgba(255,106,0,.35)]"
                aria-hidden="true"
              />
            )}
            <span className="w-5 h-5">{item.icon}</span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/login"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="w-12 h-12 flex items-center justify-center clip-btn text-titanium-300 hover:text-text-hi hover:bg-steel-800 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </Link>
    </nav>
  );
}
