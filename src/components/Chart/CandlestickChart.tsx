"use client";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
  type LogicalRange,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";
import { sma, bollinger, rsi as rsiFn, macd as macdFn } from "@/lib/indicators";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export interface OverlayConfig {
  sma20?: boolean;
  sma50?: boolean;
  bollinger?: boolean;
}

export interface SubchartConfig {
  volume?: boolean;
  rsi?: boolean;
  macd?: boolean;
}

interface Props {
  candles: Candle[];
  overlays?: OverlayConfig;
  subcharts?: SubchartConfig;
  loading?: boolean;
  symbol?: string;
  onLoadMore?: (beforeTime: number) => Promise<Candle[]>;
}

interface HoverInfo {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time: number;
  changePercent: number;
}

// Per-pane minimum heights (px). When the sum exceeds the available
// viewport, the outer wrapper scrolls vertically.
const MIN_HEIGHT_MAIN = 280;
const MIN_HEIGHT_SUB = 130;
const MIN_HEIGHT_MACD = 150;

export function CandlestickChart({
  candles,
  overlays,
  subcharts,
  loading,
  symbol,
  onLoadMore,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiOverboughtRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiOversoldRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const candlesRef = useRef<Candle[]>([]);

  const [displayCandles, setDisplayCandles] = useState<Candle[]>(candles);
  const fitContentRef = useRef(true);
  const fetchingMoreRef = useRef(false);
  const reachedOldestRef = useRef(false);
  const pendingRangeShiftRef = useRef<{ range: LogicalRange; shift: number } | null>(null);

  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Compute the inner container height — when subcharts exceed available
  // space, the outer wrapper scrolls.
  const totalMinHeight =
    MIN_HEIGHT_MAIN +
    (subcharts?.volume ? MIN_HEIGHT_SUB : 0) +
    (subcharts?.rsi ? MIN_HEIGHT_SUB : 0) +
    (subcharts?.macd ? MIN_HEIGHT_MACD : 0);

  // Initial chart construction.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#131722" }, textColor: "#d1d4dc" },
      grid: {
        vertLines: { color: "#1c2030" },
        horzLines: { color: "#1c2030" },
      },
      timeScale: {
        borderColor: "#2a2e3e",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: "#2a2e3e" },
      crosshair: { mode: 1 },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleCrosshair = (param: MouseEventParams) => {
      if (!param.time || !candlesRef.current.length) {
        setHover(null);
        return;
      }
      const t = param.time as number;
      const idx = candlesRef.current.findIndex((c) => c.time === t);
      if (idx < 0) {
        setHover(null);
        return;
      }
      const c = candlesRef.current[idx];
      const prev = idx > 0 ? candlesRef.current[idx - 1].close : c.open;
      setHover({
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        time: c.time,
        changePercent: prev ? ((c.close - prev) / prev) * 100 : 0,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      rsiOverboughtRef.current = null;
      rsiOversoldRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, []);

  // Reset when prop candles change (timeframe / symbol switch).
  useEffect(() => {
    setDisplayCandles(candles);
    fitContentRef.current = true;
    fetchingMoreRef.current = false;
    reachedOldestRef.current = false;
    pendingRangeShiftRef.current = null;
  }, [candles]);

  // Render candles + volume.
  useEffect(() => {
    candlesRef.current = displayCandles;
    if (!candleSeriesRef.current) return;
    if (!displayCandles || displayCandles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current?.setData([]);
      return;
    }
    const data = displayCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(data);

    const chart = chartRef.current;
    if (!chart) return;
    if (fitContentRef.current) {
      chart.timeScale().fitContent();
      fitContentRef.current = false;
    } else if (pendingRangeShiftRef.current) {
      const { range, shift } = pendingRangeShiftRef.current;
      pendingRangeShiftRef.current = null;
      chart.timeScale().setVisibleLogicalRange({
        from: range.from + shift,
        to: range.to + shift,
      });
    }
  }, [displayCandles]);

  // Volume pane management.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const want = !!subcharts?.volume;
    const existing = volumeSeriesRef.current;

    if (want && !existing) {
      // Add to its own pane (paneIndex grows with order of activation)
      const paneIndex = 1; // volume always pane 1 when active
      const series = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: "volume" },
          color: "#3a3f55",
          priceLineVisible: false,
          lastValueVisible: false,
        },
        paneIndex,
      );
      volumeSeriesRef.current = series;
    } else if (!want && existing) {
      try {
        chart.removeSeries(existing);
      } catch {
        // already detached
      }
      volumeSeriesRef.current = null;
    }

    // Repopulate data if active
    if (volumeSeriesRef.current && displayCandles.length > 0) {
      const volData = displayCandles.map((c) => ({
        time: c.time as Time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)",
      }));
      volumeSeriesRef.current.setData(volData);
    }

    setPaneHeights();
  }, [subcharts?.volume, displayCandles]);

  // RSI pane management.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const want = !!subcharts?.rsi;
    const existing = rsiSeriesRef.current;

    if (want && !existing) {
      const paneIndex = paneIndexFor("rsi", subcharts);
      const series = chart.addSeries(
        LineSeries,
        {
          color: "#2962ff",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: { type: "price", precision: 2, minMove: 0.01 },
        },
        paneIndex,
      );
      const overbought = chart.addSeries(
        LineSeries,
        {
          color: "rgba(239, 83, 80, 0.4)",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        },
        paneIndex,
      );
      const oversold = chart.addSeries(
        LineSeries,
        {
          color: "rgba(38, 166, 154, 0.4)",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        },
        paneIndex,
      );
      rsiSeriesRef.current = series;
      rsiOverboughtRef.current = overbought;
      rsiOversoldRef.current = oversold;
    } else if (!want && existing) {
      [rsiSeriesRef, rsiOverboughtRef, rsiOversoldRef].forEach((r) => {
        if (r.current) {
          try {
            chart.removeSeries(r.current);
          } catch {
            // ignore
          }
          r.current = null;
        }
      });
    }

    if (rsiSeriesRef.current && displayCandles.length > 0) {
      const points = rsiFn(displayCandles, 14);
      rsiSeriesRef.current.setData(
        points.map((p) => ({ time: p.time as Time, value: p.value })),
      );
      // Constant reference lines at 30/70 spanning the candle range
      if (points.length > 0) {
        const first = points[0].time;
        const last = points[points.length - 1].time;
        rsiOverboughtRef.current?.setData([
          { time: first as Time, value: 70 },
          { time: last as Time, value: 70 },
        ]);
        rsiOversoldRef.current?.setData([
          { time: first as Time, value: 30 },
          { time: last as Time, value: 30 },
        ]);
      }
    }

    setPaneHeights();
  }, [subcharts?.rsi, subcharts?.volume, displayCandles]);

  // MACD pane management.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const want = !!subcharts?.macd;
    const existing = macdLineRef.current;

    if (want && !existing) {
      const paneIndex = paneIndexFor("macd", subcharts);
      const lineSeries = chart.addSeries(
        LineSeries,
        {
          color: "#42a5f5",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "MACD",
        },
        paneIndex,
      );
      const signalSeries = chart.addSeries(
        LineSeries,
        {
          color: "#ffa726",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "Signal",
        },
        paneIndex,
      );
      const histSeries = chart.addSeries(
        HistogramSeries,
        {
          color: "#26a69a",
          priceLineVisible: false,
          lastValueVisible: false,
        },
        paneIndex,
      );
      macdLineRef.current = lineSeries;
      macdSignalRef.current = signalSeries;
      macdHistRef.current = histSeries;
    } else if (!want && existing) {
      [macdLineRef, macdSignalRef, macdHistRef].forEach((r) => {
        if (r.current) {
          try {
            chart.removeSeries(r.current);
          } catch {
            // ignore
          }
          r.current = null;
        }
      });
    }

    if (macdLineRef.current && displayCandles.length > 0) {
      const data = macdFn(displayCandles);
      macdLineRef.current.setData(
        data.map((d) => ({ time: d.time as Time, value: d.macd })),
      );
      macdSignalRef.current?.setData(
        data.map((d) => ({ time: d.time as Time, value: d.signal })),
      );
      macdHistRef.current?.setData(
        data.map((d) => ({
          time: d.time as Time,
          value: d.hist,
          color: d.hist >= 0 ? "rgba(38, 166, 154, 0.6)" : "rgba(239, 83, 80, 0.6)",
        })),
      );
    }

    setPaneHeights();
  }, [subcharts?.macd, subcharts?.volume, subcharts?.rsi, displayCandles]);

  // Distribute pane heights so the main pane keeps room while subcharts
  // get useful minimums; the outer wrapper handles overflow.
  function setPaneHeights() {
    const chart = chartRef.current;
    if (!chart) return;
    const panes = chart.panes();
    const wantedSubs = [
      subcharts?.volume ? "volume" : null,
      subcharts?.rsi ? "rsi" : null,
      subcharts?.macd ? "macd" : null,
    ].filter(Boolean) as string[];

    if (panes.length === 0) return;

    if (wantedSubs.length === 0) {
      // Only main pane — let the chart fill. Nothing to do explicitly.
      return;
    }

    const wrapperHeight = wrapperRef.current?.clientHeight ?? 600;
    const topbarMargin = 0; // toolbar sits outside chart area
    const totalAvailable = Math.max(wrapperHeight - topbarMargin, totalMinHeight);

    // Sub-pane sizes
    const subSizes: number[] = [];
    wantedSubs.forEach((kind) => {
      subSizes.push(kind === "macd" ? MIN_HEIGHT_MACD : MIN_HEIGHT_SUB);
    });
    const subTotal = subSizes.reduce((a, b) => a + b, 0);
    const mainSize = Math.max(MIN_HEIGHT_MAIN, totalAvailable - subTotal);

    try {
      panes[0]?.setHeight(mainSize);
      subSizes.forEach((sz, i) => {
        panes[i + 1]?.setHeight(sz);
      });
    } catch {
      // setHeight may throw if pane index is invalid mid-mount; ignore
    }
  }

  // Overlay management — main pane only.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    overlaySeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // already detached
      }
    });
    overlaySeriesRef.current = [];

    if (!displayCandles || displayCandles.length === 0) return;

    const addLine = (
      data: { time: number; value: number }[],
      color: string,
      lineWidth: 1 | 2 | 3 | 4 = 1,
      lineStyle: 0 | 1 | 2 | 3 = 0,
    ) => {
      const series = chart.addSeries(
        LineSeries,
        {
          color,
          lineWidth,
          lineStyle,
          priceLineVisible: false,
          lastValueVisible: false,
        },
        0, // main pane
      );
      series.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
      overlaySeriesRef.current.push(series);
    };

    if (overlays?.sma20) addLine(sma(displayCandles, 20), "#42a5f5", 2);
    if (overlays?.sma50) addLine(sma(displayCandles, 50), "#ffa726", 2);
    if (overlays?.bollinger) {
      const bb = bollinger(displayCandles, 20, 2);
      addLine(bb.upper, "#ab47bc", 1, 2);
      addLine(bb.middle, "#ab47bc", 1, 0);
      addLine(bb.lower, "#ab47bc", 1, 2);
    }
  }, [displayCandles, overlays?.sma20, overlays?.sma50, overlays?.bollinger]);

  // Lazy-load older candles when scrolled near the left.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onLoadMore) return;

    const handler = async (range: LogicalRange | null) => {
      if (!range) return;
      if (fetchingMoreRef.current || reachedOldestRef.current) return;
      if (range.from > 5) return;
      const oldest = candlesRef.current[0];
      if (!oldest) return;

      fetchingMoreRef.current = true;
      try {
        const older = await onLoadMore(oldest.time);
        if (!older || older.length === 0) {
          reachedOldestRef.current = true;
          return;
        }
        const cutoff = oldest.time;
        const cleaned = older
          .filter((c) => c.time < cutoff)
          .sort((a, b) => a.time - b.time);
        if (cleaned.length === 0) {
          reachedOldestRef.current = true;
          return;
        }
        const visible = chart.timeScale().getVisibleLogicalRange();
        if (visible) {
          pendingRangeShiftRef.current = {
            range: visible,
            shift: cleaned.length,
          };
        }
        setDisplayCandles((prev) => [...cleaned, ...prev]);
      } finally {
        fetchingMoreRef.current = false;
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    };
  }, [onLoadMore]);

  // Recalc pane heights on wrapper resize.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => setPaneHeights());
    ro.observe(wrapper);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadScreenshot() {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const name = symbol ? `${symbol}_chart.png` : "chart.png";
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full overflow-y-auto">
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: "100%", height: `${totalMinHeight}px` }}
      />
      <button
        onClick={downloadScreenshot}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-[var(--bg-2)]/80 backdrop-blur border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--bg-3)]"
        title="차트 스크린샷 다운로드"
        aria-label="차트 스크린샷 다운로드"
      >
        <Camera size={13} />
      </button>
      {hover && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-0.5 text-[10px] tabular-nums bg-[var(--bg-2)]/90 backdrop-blur px-2 py-1 rounded border border-[var(--border)]">
          <div className="flex gap-2 text-[9px] text-[var(--text-secondary)] uppercase">
            <span>{new Date(hover.time * 1000).toLocaleString("ko-KR")}</span>
          </div>
          <div className="flex gap-3">
            <Field label="O" value={formatNumber(hover.open)} />
            <Field label="H" value={formatNumber(hover.high)} cls="text-up" />
            <Field label="L" value={formatNumber(hover.low)} cls="text-down" />
            <Field
              label="C"
              value={formatNumber(hover.close)}
              cls={hover.close >= hover.open ? "text-up" : "text-down"}
            />
            <Field
              label="%"
              value={formatPercent(hover.changePercent)}
              cls={hover.changePercent >= 0 ? "text-up" : "text-down"}
            />
            {hover.volume !== undefined && (
              <Field label="V" value={hover.volume.toLocaleString()} />
            )}
          </div>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-[var(--text-secondary)] pointer-events-none">
          로딩 중...
        </div>
      )}
      {!loading && displayCandles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-secondary)] pointer-events-none">
          데이터가 없습니다
        </div>
      )}
    </div>
  );
}

function paneIndexFor(
  kind: "rsi" | "macd",
  subs: SubchartConfig | undefined,
): number {
  // pane 0 = main, then volume, rsi, macd in order of activation.
  let idx = 1;
  if (subs?.volume) {
    if (kind === "rsi") return idx + (subs.volume ? 1 : 0) - 1; // simpler below
  }
  // Compute by counting earlier active panes
  idx = 1; // start after main
  if (subs?.volume) idx += 1;
  if (kind === "rsi") return idx;
  if (subs?.rsi) idx += 1;
  return idx; // macd
}

function Field({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <span className="flex gap-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={cn(cls)}>{value}</span>
    </span>
  );
}
