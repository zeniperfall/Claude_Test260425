import { NextRequest, NextResponse } from "next/server";
import { yahooCandles } from "@/lib/api/yahoo";
import { timeframeToRange } from "@/lib/markets";
import type { Timeframe } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const tf = (req.nextUrl.searchParams.get("tf") ?? "3M") as Timeframe;
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const { range, interval } = timeframeToRange(tf);
  const candles = await yahooCandles(symbol, range, interval);
  return NextResponse.json({ candles });
}
