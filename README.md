# Stock Vista — TradingView 스타일 주식 정보 웹

한국 / 미국 / 중국 주식의 캔들차트, 워치리스트, 재무·뉴스·기술지표를 한 화면에서 볼 수 있는 Next.js 기반 대시보드입니다. TradingView 공식 OSS 차트(lightweight-charts)를 사용했습니다.

## 주요 기능

- **다중 시장 지원**: 한국(KOSPI/KOSDAQ), 미국, 중국(상하이/선전) 종목 검색·조회
- **TradingView 스타일 캔들차트**: 1D / 1W / 1M / 3M / 6M / 1Y / 5Y 시간대 전환, 거래량 히스토그램
- **차트 오버레이**: SMA(20/50) 이동평균, 볼린저 밴드(20,2) 토글
- **URL 동기화**: `/stock/[symbol]` 라우팅으로 종목 즉시 공유 가능
- **종목 비교 차트**: 여러 종목을 시작일 대비 % 변동률로 정규화 비교 (`/compare`)
- **가격 알림**: 목표가 ± 조건 도달 시 브라우저 Notification 발송 (백그라운드 폴링)
- **워치리스트**: 시장별 필터링, 별표(★) 토글, localStorage 영속화 (선택적 Supabase 동기화)
- **종목 검색**: Yahoo Finance 기반 자동완성
- **재무 정보**: 시가총액, P/E, EPS, 배당수익률, 베타, 52주 최고/최저, 섹터/산업
- **분기 실적 / 컨센서스**: 최근 8분기 EPS 실제 vs 추정, 애널리스트 투자의견·목표주가
- **뉴스**: Finnhub(미국) / NewsAPI(글로벌) 통합
- **기술 지표**: RSI(14), MACD, SMA(20/50) — Alpha Vantage 우선, 미설정 시 캔들에서 로컬 계산
- **로그인 (선택)**: Supabase Auth로 워치리스트 클라우드 동기화

## 데이터 소스 (5개)

| API | 용도 | 시장 | 키 필요 | 무료 한도 |
|---|---|---|---|---|
| Yahoo Finance (`yahoo-finance2`) | 시세/캔들/재무/검색 | 한·미·중 | 불필요 | 무제한(비공식) |
| Finnhub | 미국 실시간 시세 + 뉴스 | US | 무료 가입 | 60 req/min |
| Alpha Vantage | 정밀 기술지표 | 글로벌 | 무료 가입 | 25 req/day |
| NewsAPI | 글로벌 뉴스 | 글로벌 | 무료 가입 | 100 req/day |
| 로컬 인디케이터 계산 | RSI/MACD/SMA fallback | 모두 | — | — |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정 (선택)

`.env.example`을 `.env.local`로 복사하고 키를 입력합니다. 키 없이도 Yahoo Finance만으로 모든 화면이 동작합니다.

```bash
cp .env.example .env.local
```

```env
FINNHUB_API_KEY=...        # https://finnhub.io/register
ALPHA_VANTAGE_API_KEY=...  # https://www.alphavantage.co/support/#api-key
NEWSAPI_KEY=...            # https://newsapi.org/register
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속.

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 종목 코드 형식

- **미국**: `AAPL`, `MSFT`, `NVDA` (접미사 없음)
- **한국**: `005930.KS` (KOSPI), `035420.KS`, KOSDAQ은 `.KQ`
- **중국**: `600519.SS` (상하이), `000001.SZ` (선전)

검색창에 "삼성전자"나 "Samsung"처럼 이름으로도 찾을 수 있습니다.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **TailwindCSS** — 다크 테마
- **lightweight-charts** v5 — TradingView 공식 OSS 차트
- **TanStack Query** — 서버 데이터 캐싱·자동 갱신
- **Zustand** + persist — 워치리스트·선택 종목 영속화
- **lucide-react** — 아이콘

## 디렉터리 구조

```
src/
├── app/
│   ├── api/                 # Route Handlers (서버 API)
│   │   ├── quote/route.ts
│   │   ├── candles/route.ts
│   │   ├── search/route.ts
│   │   ├── news/route.ts
│   │   ├── financials/route.ts
│   │   └── indicators/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx        # TanStack Query Provider
│   └── globals.css
├── components/
│   ├── Layout/AppShell.tsx
│   ├── Chart/
│   │   ├── CandlestickChart.tsx
│   │   └── TimeframeSelector.tsx
│   ├── Search/
│   │   ├── SearchBar.tsx
│   │   └── MarketFilter.tsx
│   ├── Watchlist/Watchlist.tsx
│   └── Detail/
│       ├── PriceHeader.tsx
│       ├── Financials.tsx
│       ├── News.tsx
│       ├── Indicators.tsx
│       └── RightPanel.tsx
├── lib/
│   ├── api/                 # 외부 데이터 소스 래퍼
│   │   ├── yahoo.ts
│   │   ├── finnhub.ts
│   │   ├── alphaVantage.ts
│   │   └── newsApi.ts
│   ├── indicators.ts        # RSI/MACD/SMA 로컬 계산
│   ├── markets.ts           # 시장 메타·심볼 정규화
│   ├── types.ts
│   └── utils.ts
└── store/
    └── useAppStore.ts       # Zustand 전역 상태
```

## API 엔드포인트

| 경로 | 파라미터 | 응답 |
|---|---|---|
| `GET /api/quote` | `symbol` | 현재가/등락/시고저/거래량 |
| `GET /api/candles` | `symbol`, `tf`(1D~5Y) | 캔들 배열 |
| `GET /api/search` | `q` | 종목 검색 결과 |
| `GET /api/financials` | `symbol` | 시총/PER/EPS/배당/섹터 등 |
| `GET /api/news` | `symbol`, `name` | 뉴스 항목 |
| `GET /api/indicators` | `symbol` | RSI/MACD/SMA |

## 주의사항

- Yahoo Finance는 비공식 API라 안정성/약관 변경 리스크가 있습니다. 상용 운영 시 공식 데이터(한국투자증권 KIS, Polygon.io 등) 검토를 권장합니다.
- Alpha Vantage 무료 등급은 일일 25회 제한이라, 키 미설정 시 로컬 계산으로 자동 대체됩니다.
- 한국·중국 종목 뉴스는 NewsAPI 영문 검색을 사용하므로 결과 품질이 제한적일 수 있습니다.

## 라이선스

MIT (개인 학습/실습용)
