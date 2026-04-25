import { NextRequest, NextResponse } from "next/server";
import { finnhubCompanyNews } from "@/lib/api/finnhub";
import { newsApiSearch } from "@/lib/api/newsApi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const name = req.nextUrl.searchParams.get("name") ?? symbol ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  // Finnhub for US tickers (no suffix), NewsAPI for the rest.
  const isUs = !symbol.includes(".");
  if (isUs) {
    const items = await finnhubCompanyNews(symbol);
    if (items.length) return NextResponse.json({ items });
  }
  const items = await newsApiSearch(name);
  return NextResponse.json({ items });
}
