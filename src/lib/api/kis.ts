import "server-only";
import type { Quote } from "@/lib/types";

/**
 * Korea Investment Securities (한국투자증권) Open API wrapper.
 *
 * Setup (실전 / 모의투자 둘 다 가능):
 *   1. https://apiportal.koreainvestment.com 가입
 *   2. 앱 등록 후 발급받은 APP KEY, APP SECRET을 .env.local에 입력
 *   3. KIS_BASE_URL을 실전(https://openapi.koreainvestment.com:9443) 또는
 *      모의(https://openapivts.koreainvestment.com:29443)로 설정
 *
 * Token caching:
 *   KIS는 OAuth 토큰을 6시간 단위로 발급. 메모리에 캐시해서 재사용한다.
 *   Vercel 같은 stateless 환경에서는 매 요청 새 토큰을 발급받는데,
 *   하루 발급 횟수 제한(24회 가량)에 걸릴 수 있어 주의.
 */

const APP_KEY = process.env.KIS_APP_KEY?.trim() || "";
const APP_SECRET = process.env.KIS_APP_SECRET?.trim() || "";
const BASE_URL =
  process.env.KIS_BASE_URL?.trim() || "https://openapi.koreainvestment.com:9443";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isKisConfigured(): boolean {
  return Boolean(APP_KEY && APP_SECRET);
}

async function getToken(): Promise<string | null> {
  if (!isKisConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  try {
    const r = await fetch(`${BASE_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: APP_KEY,
        appsecret: APP_SECRET,
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      console.error("[kis] token failed", r.status, await r.text());
      return null;
    }
    const j = (await r.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: j.access_token,
      expiresAt: Date.now() + j.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (err) {
    console.error("[kis]", err);
    return null;
  }
}

interface KisQuoteResponse {
  output?: {
    stck_prpr?: string; // current price
    prdy_vrss?: string; // change vs prev day
    prdy_ctrt?: string; // change percent
    stck_oprc?: string; // open
    stck_hgpr?: string; // high
    stck_lwpr?: string; // low
    stck_sdpr?: string; // prev close (기준가)
    acml_vol?: string; // accumulated volume
    hts_kor_isnm?: string; // korean name
  };
  rt_cd?: string;
  msg1?: string;
}

/**
 * Returns a quote for a Korean stock by raw KRX code (6 digits, no suffix).
 * e.g. "005930" for Samsung Electronics.
 */
export async function kisQuote(krxCode: string): Promise<Quote | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const url = new URL(`${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`);
    url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
    url.searchParams.set("FID_INPUT_ISCD", krxCode);

    const r = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        authorization: `Bearer ${token}`,
        appkey: APP_KEY,
        appsecret: APP_SECRET,
        tr_id: "FHKST01010100",
      },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as KisQuoteResponse;
    if (j.rt_cd !== "0" || !j.output) return null;
    const o = j.output;
    const num = (s?: string) => (s ? Number(s) : undefined);
    const price = num(o.stck_prpr);
    if (price === undefined) return null;
    return {
      symbol: krxCode,
      name: o.hts_kor_isnm ?? krxCode,
      price,
      change: num(o.prdy_vrss) ?? 0,
      changePercent: num(o.prdy_ctrt) ?? 0,
      open: num(o.stck_oprc),
      high: num(o.stck_hgpr),
      low: num(o.stck_lwpr),
      prevClose: num(o.stck_sdpr),
      volume: num(o.acml_vol),
      currency: "KRW",
    };
  } catch (err) {
    console.error("[kis]", err);
    return null;
  }
}

/**
 * Extracts the KRX 6-digit code from a Yahoo-style symbol like "005930.KS".
 */
export function extractKrxCode(symbol: string): string | null {
  const m = symbol.match(/^(\d{6})(\.(?:KS|KQ))?$/i);
  return m ? m[1] : null;
}
