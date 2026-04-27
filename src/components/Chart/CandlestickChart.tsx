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
import { sma, bollinger } from "@/lib/indicators";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export interface OverlayConfig {
  sma20?: boolean;
  sma50?: boolean;
  bollinger?: boolean;
}

interface Props {
  candles: Candle[];
  overlays?: OverlayConfig;
  loading?: boolean;
  symbol?: string;
  /**
   * Called when the user scrolls past the leftmost loaded candle. Should
   * return older candles (strictly before `beforeTime`). The chart prepends
   * them and preserves the user's visible range.
   */
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

export function CandlestickChart({
  candles,
  overlays,
  loading,
  symbol,
  onLoadMore,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const candlesRef = useRef<Candle[]>([]);

  // Internal candle state — starts as the prop value but grows as the user
  // scrolls back in time and we lazy-load more.
  const [displayCandles, setDisplayCandles] = useState<Candle[]>(candles);
  // When true, the next render will fitContent() — used on initial load /
  // timeframe / symbol change but NOT on lazy-load prepends (which would
  // reset the user's scroll).
  const fitContentRef = useRef(true);
  // Concurrency guard for onLoadMore.
  const fetchingMoreRef = useRef(false);
  // Once Yahoo returns no older data we stop trying.
  const reachedOldestRef = useRef(false);
  // Pending visible-range adjustment: after we prepend N candles, restore
  // the previous logical range shifted by N so the user keeps seeing the
  // same bars.
  const pendingRangeShiftRef = useRef<{ range: LogicalRange; shift: number } | null>(null);

  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Initial chart construction — only ever runs once.
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

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#3a3f55",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

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
      overlaySeriesRef.current = [];
    };
  }, []);

  // When the prop candles change (timeframe / symbol switch), reset the
  // internal state and request a fitContent on the next render.
  useEffect(() => {
    setDisplayCandles(candles);
    fitContentRef.current = true;
    fetchingMoreRef.current = false;
    reachedOldestRef.current = false;
    pendingRangeShiftRef.current = null;
  }, [candles]);

  // Render displayCandles to the chart whenever they change.
  useEffect(() => {
    candlesRef.current = displayCandles;
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!displayCandles || displayCandles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }
    const data = displayCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const volData = displayCandles.map((c) => ({
      time: c.time as Time,
      value: c.volume ?? 0,
      color: c.close >= c.open ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)",
    }));
    candleSeriesRef.current.setData(data);
    volumeSeriesRef.current.setData(volData);

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

  // Overlay management — recreate on data or overlay changes.
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
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
      });
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

  // Lazy-load older candles when the user scrolls near the left edge.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onLoadMore) return;

    const handler = async (range: LogicalRange | null) => {
      if (!range) return;
      if (fetchingMoreRef.current || reachedOldestRef.current) return;
      // Trigger when within ~5 bars of the start of loaded data.
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
        // Drop any duplicate or future bars and keep ascending order.
        const cutoff = oldest.time;
        const cleaned = older
          .filter((c) => c.time < cutoff)
          .sort((a, b) => a.time - b.time);
        if (cleaned.length === 0) {
          reachedOldestRef.current = true;
          return;
        }
        // Capture the current visible range so the next render can shift
        // it forward by the number of prepended bars and preserve the view.
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
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
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

function Field({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <span className="flex gap-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={cn(cls)}>{value}</span>
    </span>
  );
}
