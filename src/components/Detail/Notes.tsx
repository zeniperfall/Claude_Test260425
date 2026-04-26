"use client";
import { useEffect, useState } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useAppStore } from "@/store/useAppStore";

export function Notes() {
  const selected = useAppStore((s) => s.selected);
  const notes = useNotesStore((s) => s.notes);
  const setNote = useNotesStore((s) => s.setNote);

  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(selected ? notes[selected.symbol] ?? "" : "");
  }, [selected?.symbol, notes, selected]);

  // Debounced autosave
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => {
      if ((notes[selected.symbol] ?? "") !== draft) {
        setNote(selected.symbol, draft);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [draft, selected, notes, setNote]);

  if (!selected) {
    return (
      <div className="p-3 text-xs text-[var(--text-secondary)]">
        종목을 선택해주세요.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 h-full flex flex-col">
      <div className="text-[10px] uppercase text-[var(--text-secondary)]">
        {selected.symbol} 메모
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="투자 노트, 매수/매도 사유, 관찰 사항 등..."
        className="flex-1 min-h-[200px] resize-none bg-[var(--bg-2)] border border-[var(--border)] rounded p-2 text-xs outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-secondary)]"
      />
      <div className="text-[10px] text-[var(--text-secondary)]">
        자동 저장됨 · 브라우저에 영속
      </div>
    </div>
  );
}
