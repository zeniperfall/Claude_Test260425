import { NextRequest, NextResponse } from "next/server";
import { yahooFinancials } from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const f = await yahooFinancials(symbol);
  return NextResponse.json(f ?? {});
}
