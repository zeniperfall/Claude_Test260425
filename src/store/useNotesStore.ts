"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotesState {
  notes: Record<string, string>; // symbol → markdown text
  setNote: (symbol: string, text: string) => void;
  clearNote: (symbol: string) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      setNote: (symbol, text) =>
        set({ notes: { ...get().notes, [symbol]: text } }),
      clearNote: (symbol) => {
        const next = { ...get().notes };
        delete next[symbol];
        set({ notes: next });
      },
    }),
    { name: "tv-stocks-notes" },
  ),
);
