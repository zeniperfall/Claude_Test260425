import { NextRequest, NextResponse } from "next/server";
import { yahooEarnings } from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const data = await yahooEarnings(symbol);
  return NextResponse.json(data);
}
