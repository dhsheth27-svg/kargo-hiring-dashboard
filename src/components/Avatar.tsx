import { pal, initials } from "@/lib/theme";

export default function Avatar({
  name,
  hue,
  size = 40,
  radius = "50%",
}: {
  name: string;
  hue: number;
  size?: number;
  radius?: string | number;
}) {
  const p = pal(hue);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `radial-gradient(circle at 30% 25%, white, ${p.mid} 70%)`,
        border: "1px solid white",
        color: p.ink,
        display: "grid",
        placeItems: "center",
        fontWeight: 500,
        fontSize: size * 0.34,
      }}
    >
      {initials(name)}
    </div>
  );
}
