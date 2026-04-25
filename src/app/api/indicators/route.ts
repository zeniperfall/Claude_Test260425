import { NextRequest, NextResponse } from "next/server";
import { yahooCandles } from "@/lib/api/yahoo";
import { alphaVantageIndicators } from "@/lib/api/alphaVantage";
import { computeIndicators } from "@/lib/indicators";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  // Prefer Alpha Vantage when API key is set AND it's a US ticker (no suffix).
  const isUs = !symbol.includes(".");
  if (isUs && process.env.ALPHA_VANTAGE_API_KEY) {
    const av = await alphaVantageIndicators(symbol);
    if (av.rsi && av.rsi.length > 0) {
      return NextResponse.json({ source: "alphaVantage", ...av });
    }
  }
  // Fallback: compute locally from Yahoo daily candles (1Y).
  const candles = await yahooCandles(symbol, "1y", "1d");
  const ind = computeIndicators(candles);
  return NextResponse.json({ source: "local", ...ind });
}
