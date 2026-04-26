"use client";
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setLoading: (b: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u, loading: false }),
  setLoading: (b) => set({ loading: b }),
}));
