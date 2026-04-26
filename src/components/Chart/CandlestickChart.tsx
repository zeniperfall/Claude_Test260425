"use client";
import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";
import { sma, bollinger } from "@/lib/indicators";

export interface OverlayConfig {
  sma20?: boolean;
  sma50?: boolean;
  bollinger?: boolean;
}

interface Props {
  candles: Candle[];
  overlays?: OverlayConfig;
  loading?: boolean;
}

export function CandlestickChart({ candles, overlays, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#131722" },
        textColor: "#d1d4dc",
      },
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

    const onResize = () => chart.timeScale().fitContent();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!candles || candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }
    const data = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const volData = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume ?? 0,
      color: c.close >= c.open ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)",
    }));
    candleSeriesRef.current.setData(data);
    volumeSeriesRef.current.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Overlay management — recreate on candles or overlay flag changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    overlaySeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // series may already be detached
      }
    });
    overlaySeriesRef.current = [];

    if (!candles || candles.length === 0) return;

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

    if (overlays?.sma20) addLine(sma(candles, 20), "#42a5f5", 2);
    if (overlays?.sma50) addLine(sma(candles, 50), "#ffa726", 2);
    if (overlays?.bollinger) {
      const bb = bollinger(candles, 20, 2);
      addLine(bb.upper, "#ab47bc", 1, 2);
      addLine(bb.middle, "#ab47bc", 1, 0);
      addLine(bb.lower, "#ab47bc", 1, 2);
    }
  }, [candles, overlays?.sma20, overlays?.sma50, overlays?.bollinger]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-[var(--text-secondary)] pointer-events-none">
          로딩 중...
        </div>
      )}
      {!loading && candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-secondary)] pointer-events-none">
          데이터가 없습니다
        </div>
      )}
    </div>
  );
}
