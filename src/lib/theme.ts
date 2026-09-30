// "Mist" visual system: one oklch() formula generates a full accent palette
// from a single hue (0-360) — solid / soft / mid / ink. Everything on-brand
// (stage colors, role accents, avatar fills) is derived from a hue number,
// never a hardcoded hex, so the palette stays visually consistent.

export interface Palette {
  solid: string;
  soft: string;
  mid: string;
  ink: string;
}

export function pal(h: number): Palette {
  return {
    solid: `oklch(0.72 0.075 ${h})`,
    soft: `oklch(0.94 0.025 ${h})`,
    mid: `oklch(0.86 0.055 ${h})`,
    ink: `oklch(0.38 0.05 ${h})`,
  };
}

// Deterministic hue from any id string, for entities (candidates) that
// don't carry their own stored hue — stable across reloads, never random.
export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function scoreHue(score: number): number {
  if (score >= 85) return 145; // sage
  if (score >= 70) return 225; // sky
  return 45; // peach
}

export function daysAgo(date: string | Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}
