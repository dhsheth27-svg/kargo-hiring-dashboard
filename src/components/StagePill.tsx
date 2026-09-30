import { STAGE_LABELS, STAGE_HUES, type AnyStage } from "@/lib/types";
import { pal } from "@/lib/theme";

export default function StagePill({ stage }: { stage: AnyStage }) {
  const p = pal(STAGE_HUES[stage]);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "5px 11px",
        borderRadius: 999,
        background: "oklch(1 0 0 / .6)",
        border: "1px solid white",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.solid }} />
      {STAGE_LABELS[stage]}
    </span>
  );
}
