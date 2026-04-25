"use client";
import { TIMEFRAMES } from "@/lib/markets";
import type { Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.key}
          onClick={() => onChange(tf.key)}
          className={cn(
            "px-2.5 py-1 text-xs rounded transition-colors",
            value === tf.key
              ? "bg-[var(--bg-3)] text-white"
              : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-2)]",
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
