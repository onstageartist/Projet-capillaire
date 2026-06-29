"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthState } from "@/lib/use-auth-state";

const ICONS = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  scan: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
  suivi: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  offres: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  espace: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
};

export default function MobileNav() {
  const pathname = usePathname();
  const auth = useAuthState();

  // Barre d'application : reservee aux personnes connectees.
  if (auth === "loading" || auth === "out") return null;

  const tabs =
    auth === "subscriber"
      ? [
          { href: "/app", label: "Espace", icon: ICONS.espace },
          { href: "/scan", label: "Scanner", icon: ICONS.scan },
          { href: "/suivi", label: "Suivi", icon: ICONS.suivi },
          { href: "/", label: "Accueil", icon: ICONS.home },
        ]
      : [
          { href: "/", label: "Accueil", icon: ICONS.home },
          { href: "/scan", label: "Scanner", icon: ICONS.scan },
          { href: "/suivi", label: "Suivi", icon: ICONS.suivi },
          { href: "/plus", label: "Offres", icon: ICONS.offres },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface sm:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={tab.icon} />
              </svg>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
