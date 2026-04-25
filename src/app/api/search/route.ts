import { NextRequest, NextResponse } from "next/server";
import { yahooSearch } from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  const results = await yahooSearch(q);
  return NextResponse.json({ results });
}
