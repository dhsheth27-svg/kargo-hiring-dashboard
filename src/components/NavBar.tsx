"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const LINKS = [
  { href: "/upload", label: "Upload" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 px-6 py-4 flex items-center gap-8 text-sm glass-card border-b border-white/5">
      <Link href="/upload" className="flex items-center gap-2">
        <motion.span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
          }}
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="font-semibold text-lg gradient-text">Kargo Hiring</span>
      </Link>
      <div className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              <span className={active ? "text-white" : "text-neutral-400 hover:text-neutral-200"}>
                {link.label}
              </span>
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-md -z-10"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.2))",
                    border: "1px solid rgba(139,92,246,0.4)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
