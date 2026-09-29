"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/roles/new", label: "New role" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 px-6 py-3 flex items-center gap-8 text-sm"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        Kargo Hiring
      </Link>
      <div className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                background: active ? "var(--accent-soft)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
