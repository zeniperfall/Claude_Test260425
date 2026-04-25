import { NextRequest, NextResponse } from "next/server";
import { yahooQuote } from "@/lib/api/yahoo";
import { finnhubQuote } from "@/lib/api/finnhub";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  // Try Yahoo first (works for KR/US/CN), fall back to Finnhub for US tickers.
  const y = await yahooQuote(symbol);
  if (y) return NextResponse.json(y);
  const f = await finnhubQuote(symbol);
  if (f) return NextResponse.json(f);
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
