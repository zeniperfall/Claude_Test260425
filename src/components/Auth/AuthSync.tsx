"use client";
import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore, type WatchlistItem } from "@/store/useAppStore";

/**
 * Wires up Supabase auth and bidirectional watchlist sync:
 * - On sign in: pull rows from `watchlist` table → merge into local store.
 * - On local watchlist change while signed in: push the diff up.
 *
 * Required SQL (run once in Supabase SQL editor):
 *
 *   create table watchlist (
 *     user_id uuid references auth.users not null,
 *     symbol text not null,
 *     name text not null,
 *     market text not null,
 *     created_at timestamptz default now(),
 *     primary key (user_id, symbol)
 *   );
 *   alter table watchlist enable row level security;
 *   create policy "watchlist owner" on watchlist
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */
export function AuthSync() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const user = useAuthStore((s) => s.user);
  const watchlist = useAppStore((s) => s.watchlist);

  // Last seen watchlist signature so we don't re-push unchanged data.
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [setUser, setLoading]);

  // Pull on login
  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const { data, error } = await sb
        .from("watchlist")
        .select("symbol, name, market")
        .eq("user_id", user.id);
      if (error) {
        console.error("[supabase] pull watchlist", error.message);
        return;
      }
      if (!data || data.length === 0) return;
      const remote = data as WatchlistItem[];
      const local = useAppStore.getState().watchlist;
      const merged = [...local];
      remote.forEach((r) => {
        if (!merged.some((m) => m.symbol === r.symbol)) merged.push(r);
      });
      useAppStore.setState({ watchlist: merged });
    })();
  }, [user]);

  // Push local changes
  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    const sig = JSON.stringify(watchlist.map((w) => w.symbol).sort());
    if (sig === lastSyncedRef.current) return;
    lastSyncedRef.current = sig;
    (async () => {
      // Replace strategy: delete user rows + upsert all current
      const { error: delErr } = await sb.from("watchlist").delete().eq("user_id", user.id);
      if (delErr) {
        console.error("[supabase] delete watchlist", delErr.message);
        return;
      }
      if (watchlist.length === 0) return;
      const rows = watchlist.map((w) => ({
        user_id: user.id,
        symbol: w.symbol,
        name: w.name,
        market: w.market,
      }));
      const { error: upErr } = await sb.from("watchlist").upsert(rows);
      if (upErr) console.error("[supabase] upsert watchlist", upErr.message);
    })();
  }, [user, watchlist]);

  return null;
}
