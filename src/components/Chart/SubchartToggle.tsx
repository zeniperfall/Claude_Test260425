"use client";
import type { SubchartPrefs } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

interface Props {
  value: SubchartPrefs;
  onChange: (next: SubchartPrefs) => void;
}

const ITEMS: { key: keyof SubchartPrefs; label: string; color: string }[] = [
  { key: "volume", label: "거래량", color: "#3a3f55" },
  { key: "rsi", label: "RSI", color: "#2962ff" },
  { key: "macd", label: "MACD", color: "#42a5f5" },
];

export function SubchartToggle({ value, onChange }: Props) {
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
            title={`${it.label} 보조지표 ${active ? "끄기" : "켜기"}`}
          >
            <span
              className="w-2 h-2 rounded-sm"
              style={{ background: active ? it.color : "transparent", border: `1px solid ${it.color}` }}
            />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
