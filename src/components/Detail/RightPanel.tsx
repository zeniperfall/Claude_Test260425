"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Financials } from "./Financials";
import { News } from "./News";
import { Indicators } from "./Indicators";
import { Earnings } from "./Earnings";
import { Dividends } from "./Dividends";
import { Notes } from "./Notes";
import { AlertsPanel } from "@/components/Alerts/AlertsPanel";
import { PortfolioPanel } from "@/components/Portfolio/PortfolioPanel";

type Tab =
  | "financials"
  | "news"
  | "indicators"
  | "earnings"
  | "dividends"
  | "alerts"
  | "portfolio"
  | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "financials", label: "재무" },
  { key: "indicators", label: "지표" },
  { key: "earnings", label: "실적" },
  { key: "dividends", label: "배당" },
  { key: "news", label: "뉴스" },
  { key: "alerts", label: "알림" },
  { key: "portfolio", label: "포트폴리오" },
  { key: "notes", label: "메모" },
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
        {tab === "dividends" && <Dividends />}
        {tab === "alerts" && <AlertsPanel />}
        {tab === "portfolio" && <PortfolioPanel />}
        {tab === "notes" && <Notes />}
      </div>
    </div>
  );
}
