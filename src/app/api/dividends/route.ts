import { NextRequest, NextResponse } from "next/server";
import { yahooDividends } from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  const data = await yahooDividends(symbol);
  return NextResponse.json(data);
}
