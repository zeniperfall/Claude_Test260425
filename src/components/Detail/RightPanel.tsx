"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Financials } from "./Financials";
import { News } from "./News";
import { Indicators } from "./Indicators";
import { Earnings } from "./Earnings";
import { AlertsPanel } from "@/components/Alerts/AlertsPanel";

type Tab = "financials" | "news" | "indicators" | "earnings" | "alerts";

const TABS: { key: Tab; label: string }[] = [
  { key: "financials", label: "재무" },
  { key: "indicators", label: "지표" },
  { key: "earnings", label: "실적" },
  { key: "news", label: "뉴스" },
  { key: "alerts", label: "알림" },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("financials");
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 text-xs whitespace-nowrap",
              tab === t.key
                ? "text-white border-b-2 border-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "financials" && <Financials />}
        {tab === "news" && <News />}
        {tab === "indicators" && <Indicators />}
        {tab === "earnings" && <Earnings />}
        {tab === "alerts" && <AlertsPanel />}
      </div>
    </div>
  );
}
