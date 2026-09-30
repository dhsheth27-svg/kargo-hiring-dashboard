"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/roles", label: "Roles" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/candidates", label: "Candidates" },
  { href: "/activity", label: "Activity" },
];

const SPECKS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37.3) % 100,
  y: (i * 61.7) % 100,
  s: 1 + (i % 3),
  d: 3 + (i % 5),
  delay: (i * 0.7) % 5,
}));

function Canvas() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        background:
          "linear-gradient(165deg, oklch(0.55 0.032 162) 0%, oklch(0.44 0.028 172) 50%, oklch(0.36 0.024 180) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: "oklch(0.84 0.06 158)",
          filter: "blur(140px)",
          opacity: 0.55,
          top: -240,
          left: -160,
          animation: "kgFloatA 24s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "oklch(0.84 0.06 45)",
          filter: "blur(140px)",
          opacity: 0.32,
          top: 40,
          right: -160,
          animation: "kgFloatB 28s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "oklch(0.9 0.035 150)",
          filter: "blur(150px)",
          opacity: 0.28,
          bottom: -240,
          left: "28%",
          animation: "kgFloatC 26s ease-in-out infinite",
        }}
      />
      {SPECKS.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            borderRadius: "50%",
            background: "white",
            animation: `kgTwinkle ${p.d}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Header({ activeCount }: { activeCount: number }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "oklch(0.44 0.028 172 / .35)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid oklch(1 0 0 / .12)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          gap: 22,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          className="kg-logo"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "oklch(1 0 0 / .14)",
              border: "1px solid oklch(1 0 0 / .35)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 3,
              padding: 9,
              transition: "transform .7s cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <div style={{ borderRadius: "50%", background: "oklch(0.92 0.04 150)" }} />
            <div style={{ borderRadius: "50%", background: "oklch(0.88 0.06 45)" }} />
            <div style={{ borderRadius: "50%", background: "oklch(0.88 0.05 225)" }} />
            <div style={{ borderRadius: "50%", background: "white" }} />
          </div>
          <div style={{ fontWeight: 400, fontSize: 20, letterSpacing: "-0.02em", color: "white" }}>
            Kargo Hiring
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            gap: 2,
            padding: 5,
            borderRadius: 999,
            background: "oklch(1 0 0 / .12)",
            border: "1px solid oklch(1 0 0 / .25)",
            backdropFilter: "blur(20px)",
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 3,
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  background: active ? "white" : "transparent",
                  color: active ? "oklch(0.28 0.02 170)" : "white",
                  boxShadow: active ? "0 6px 16px -8px oklch(0.15 0.03 170 / .5)" : "none",
                  transition: "all .25s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 999,
              background: "oklch(1 0 0 / .12)",
              border: "1px solid oklch(1 0 0 / .25)",
              color: "white",
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "white",
                animation: "kgPulse 2s ease-out infinite",
              }}
            />
            {activeCount} active
          </div>
          <button
            onClick={() => router.push("/roles/new")}
            aria-label="Create a role"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 25%, oklch(0.97 0.02 60), oklch(0.8 0.06 45))",
              border: "2px solid oklch(1 0 0 / .6)",
              display: "grid",
              placeItems: "center",
              fontWeight: 500,
              fontSize: 13,
              color: "oklch(0.35 0.05 45)",
              cursor: "pointer",
            }}
          >
            KH
          </button>
        </div>
      </div>
    </header>
  );
}

function Dock() {
  const pathname = usePathname();
  const items = [
    { href: "/", short: "◐", label: "Overview" },
    { href: "/pipeline", short: "▤", label: "Pipeline" },
    { href: "/candidates", short: "◎", label: "Candidates" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 999,
        background: "oklch(0.4 0.028 172 / .45)",
        border: "1px solid oklch(1 0 0 / .3)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        boxShadow: "0 20px 50px -20px oklch(0.15 0.03 170 / .7)",
      }}
    >
      {items.map((d) => {
        const active = d.href === "/" ? pathname === "/" : pathname.startsWith(d.href);
        return (
          <Link
            key={d.href}
            href={d.href}
            title={d.label}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: `1px solid ${active ? "white" : "oklch(1 0 0 / .3)"}`,
              background: active ? "oklch(1 0 0 / .25)" : "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              display: "grid",
              placeItems: "center",
              transition: "all .2s",
            }}
          >
            {d.short}
          </Link>
        );
      })}
      <Link
        href="/roles/new"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "6px 6px 6px 22px",
          borderRadius: 999,
          border: "1px solid oklch(1 0 0 / .45)",
          background: "oklch(1 0 0 / .1)",
          color: "white",
          cursor: "pointer",
          fontSize: 19,
          fontWeight: 300,
          letterSpacing: "-0.01em",
        }}
      >
        New role
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "white",
            color: "oklch(0.3 0.02 170)",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            animation: "kgGlow 3s ease-in-out infinite",
          }}
        >
          ✦
        </span>
      </Link>
    </div>
  );
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then((d) => {
        const total = (d.roles ?? []).reduce(
          (sum: number, r: { totalCandidates: number }) => sum + r.totalCandidates,
          0
        );
        setActiveCount(total);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <Canvas />
      <Header activeCount={activeCount} />
      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1320,
          margin: "0 auto",
          padding: "40px 28px 150px",
        }}
      >
        {children}
      </main>
      <Dock />
    </div>
  );
}
