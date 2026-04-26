/**
 * Yahoo Finance returns latin/short names for many KR tickers (e.g. "Samsung
 * Electronics Co Ltd"). For Korean-language UX we prefer the official KRX
 * Korean names. This map covers the most-traded KOSPI/KOSDAQ tickers; for
 * anything not listed, the Yahoo name is used as a fallback.
 *
 * Maintenance: extend this list when adding new tickers to DEFAULT_SYMBOLS
 * or as user feedback comes in.
 */
export const KOREAN_NAMES: Record<string, string> = {
  "005930.KS": "삼성전자",
  "000660.KS": "SK하이닉스",
  "035420.KS": "NAVER",
  "035720.KS": "카카오",
  "005380.KS": "현대차",
  "000270.KS": "기아",
  "207940.KS": "삼성바이오로직스",
  "005490.KS": "POSCO홀딩스",
  "012330.KS": "현대모비스",
  "068270.KS": "셀트리온",
  "051910.KS": "LG화학",
  "006400.KS": "삼성SDI",
  "066570.KS": "LG전자",
  "003670.KS": "포스코퓨처엠",
  "017670.KS": "SK텔레콤",
  "030200.KS": "KT",
  "055550.KS": "신한지주",
  "105560.KS": "KB금융",
  "086790.KS": "하나금융지주",
  "316140.KS": "우리금융지주",
  "323410.KS": "카카오뱅크",
  "377300.KS": "카카오페이",
  "259960.KS": "크래프톤",
  "036570.KS": "엔씨소프트",
  "251270.KS": "넷마블",
  // KOSDAQ
  "247540.KQ": "에코프로비엠",
  "086520.KQ": "에코프로",
  "091990.KQ": "셀트리온헬스케어",
  "196170.KQ": "알테오젠",
  "041510.KQ": "에스엠",
  "035900.KQ": "JYP Ent.",
  "352820.KQ": "하이브",
};

export function localizedName(symbol: string, fallback: string): string {
  const upper = symbol.trim().toUpperCase();
  return KOREAN_NAMES[upper] ?? fallback;
}
