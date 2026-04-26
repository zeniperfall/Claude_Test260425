import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ClientError {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  url?: string;
  userAgent?: string;
  ts?: number;
}

/**
 * Sink for client-side runtime errors. In a production setup this would
 * forward to Sentry/Logtail/Datadog/etc. For the MVP we just log to the
 * server console so they appear alongside dev/CI output.
 */
export async function POST(req: NextRequest) {
  let body: ClientError | null = null;
  try {
    body = (await req.json()) as ClientError;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!body?.message) return NextResponse.json({ ok: false }, { status: 400 });
  console.error(
    "[client-error]",
    body.message,
    body.source ? `${body.source}:${body.line}:${body.column}` : "",
    body.url ?? "",
  );
  if (body.stack) console.error("[client-error stack]", body.stack);
  return NextResponse.json({ ok: true });
}
