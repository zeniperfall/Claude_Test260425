import { NextRequest, NextResponse } from "next/server";
import { yahooQuote } from "@/lib/api/yahoo";
import { finnhubQuote } from "@/lib/api/finnhub";
import { extractKrxCode, isKisConfigured, kisQuote } from "@/lib/api/kis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  // Korean ticker (.KS / .KQ) — try KIS first when configured for tighter realtime data,
  // falling back to Yahoo afterwards.
  if (isKisConfigured()) {
    const krx = extractKrxCode(symbol);
    if (krx) {
      const k = await kisQuote(krx);
      if (k) {
        // Preserve the original Yahoo-style symbol for downstream callers.
        return NextResponse.json({ ...k, symbol });
      }
    }
  }

  const y = await yahooQuote(symbol);
  if (y) return NextResponse.json(y);
  const f = await finnhubQuote(symbol);
  if (f) return NextResponse.json(f);
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
