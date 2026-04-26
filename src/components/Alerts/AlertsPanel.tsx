"use client";
import { useState } from "react";
import { Bell, BellRing, Trash2, RotateCcw } from "lucide-react";
import { useAlertsStore } from "@/store/useAlertsStore";
import { useAppStore } from "@/store/useAppStore";
import { ensureNotificationPermission } from "./AlertsManager";
import { cn, formatNumber } from "@/lib/utils";

export function AlertsPanel() {
  const alerts = useAlertsStore((s) => s.alerts);
  const addAlert = useAlertsStore((s) => s.addAlert);
  const removeAlert = useAlertsStore((s) => s.removeAlert);
  const resetAlert = useAlertsStore((s) => s.resetAlert);
  const selected = useAppStore((s) => s.selected);

  const [target, setTarget] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  const symbolAlerts = alerts.filter((a) => a.symbol === selected?.symbol);

  async function handleAdd() {
    if (!selected) return;
    const num = parseFloat(target);
    if (Number.isNaN(num) || num <= 0) return;
    const granted = await ensureNotificationPermission();
    setPermGranted(granted);
    addAlert({
      symbol: selected.symbol,
      name: selected.name,
      target: num,
      condition,
    });
    setTarget("");
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] uppercase text-[var(--text-secondary)]">
        가격 알림 — {selected?.symbol ?? "-"}
      </div>

      {permGranted === false && (
        <div className="text-[11px] text-down border border-down/30 bg-down/10 rounded p-2">
          브라우저 알림 권한이 차단되어 있습니다. 알림은 기록만 됩니다.
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as "above" | "below")}
          className="bg-[var(--bg-2)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none"
        >
          <option value="above">▲ 이상</option>
          <option value="below">▼ 이하</option>
        </select>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="목표가"
          className="flex-1 bg-[var(--bg-2)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none placeholder:text-[var(--text-secondary)]"
        />
        <button
          onClick={handleAdd}
          disabled={!selected || !target}
          className="px-2.5 py-1 text-xs rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:bg-[var(--bg-3)] disabled:text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:hover:opacity-100"
        >
          추가
        </button>
      </div>

      <div className="space-y-1">
        {symbolAlerts.length === 0 && (
          <div className="text-[11px] text-[var(--text-secondary)]">
            설정된 알림이 없습니다.
          </div>
        )}
        {symbolAlerts.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex items-center justify-between text-xs p-2 rounded border",
              a.triggered
                ? "border-up/30 bg-up/10"
                : "border-[var(--border)] bg-[var(--bg-2)]",
            )}
          >
            <div className="flex items-center gap-2">
              {a.triggered ? <BellRing size={12} className="text-up" /> : <Bell size={12} />}
              <span>
                {a.condition === "above" ? "▲" : "▼"} {formatNumber(a.target)}
              </span>
              {a.triggered && <span className="text-up text-[10px]">트리거됨</span>}
            </div>
            <div className="flex items-center gap-1">
              {a.triggered && (
                <button
                  onClick={() => resetAlert(a.id)}
                  className="text-[var(--text-secondary)] hover:text-white p-0.5"
                  title="다시 활성화"
                  aria-label="알림 다시 활성화"
                >
                  <RotateCcw size={11} />
                </button>
              )}
              <button
                onClick={() => removeAlert(a.id)}
                className="text-[var(--text-secondary)] hover:text-down p-0.5"
                aria-label="알림 삭제"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > symbolAlerts.length && (
        <div className="text-[10px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
          다른 종목 알림 {alerts.length - symbolAlerts.length}개 진행 중
        </div>
      )}
    </div>
  );
}
