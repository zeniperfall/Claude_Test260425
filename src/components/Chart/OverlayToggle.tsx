"use client";
import type { OverlayConfig } from "./CandlestickChart";
import { cn } from "@/lib/utils";

interface Props {
  value: OverlayConfig;
  onChange: (next: OverlayConfig) => void;
}

const ITEMS: { key: keyof OverlayConfig; label: string; color: string }[] = [
  { key: "sma20", label: "SMA20", color: "#42a5f5" },
  { key: "sma50", label: "SMA50", color: "#ffa726" },
  { key: "bollinger", label: "BB(20,2)", color: "#ab47bc" },
];

export function OverlayToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {ITEMS.map((it) => {
        const active = !!value[it.key];
        return (
          <button
            key={it.key}
            onClick={() => onChange({ ...value, [it.key]: !active })}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border transition-colors",
              active
                ? "border-transparent bg-[var(--bg-3)] text-white"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--bg-3)]",
            )}
            title={`${it.label} 오버레이 ${active ? "끄기" : "켜기"}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: active ? it.color : "transparent", border: `1px solid ${it.color}` }}
            />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
