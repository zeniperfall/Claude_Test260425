import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Reports which optional API integrations are configured. Values are never
 * returned — only booleans. Used by client UIs (e.g. News empty state) to
 * give actionable guidance instead of generic "no data" messages.
 */
export async function GET() {
  return NextResponse.json({
    finnhub: !!process.env.FINNHUB_API_KEY?.trim(),
    alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY?.trim(),
    newsApi: !!process.env.NEWSAPI_KEY?.trim(),
    kis: !!process.env.KIS_APP_KEY?.trim() && !!process.env.KIS_APP_SECRET?.trim(),
    supabase:
      !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  });
}
