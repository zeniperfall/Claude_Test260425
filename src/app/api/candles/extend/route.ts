import { NextRequest, NextResponse } from "next/server";
import { yahooCandlesBefore } from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

/**
 * Returns historical candles strictly before the given epoch second.
 * Used by the chart's lazy-load-back behaviour: when the user scrolls past
 * the leftmost loaded bar, the client requests another window from here
 * and prepends the result.
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const before = Number(req.nextUrl.searchParams.get("before") ?? "0");
  const interval = req.nextUrl.searchParams.get("interval") ?? "1d";
  if (!symbol || !before) {
    return NextResponse.json({ error: "symbol and before required" }, { status: 400 });
  }
  const candles = await yahooCandlesBefore(symbol, before, interval);
  return NextResponse.json({ candles });
}
