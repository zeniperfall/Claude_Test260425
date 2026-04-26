"use client";
import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

const COLORS = ["#42a5f5", "#ef5350", "#26a69a", "#ffa726", "#ab47bc"];

interface SeriesInput {
  symbol: string;
  candles: Candle[];
}

interface Props {
  series: SeriesInput[];
  loading?: boolean;
}

/**
 * Normalizes each symbol's close price to the first available close
 * (becoming a "% change from start" line). Useful to compare relative
 * performance across instruments with different absolute prices.
 */
export function ComparisonChart({ series, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

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
    chartRef.current = chart;
    const onResize = () => chart.timeScale().fitContent();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      lineSeriesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    lineSeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // already detached
      }
    });
    lineSeriesRef.current = [];

    series.forEach((s, i) => {
      if (!s.candles || s.candles.length === 0) return;
      const base = s.candles[0].close;
      if (!base) return;
      const data = s.candles.map((c) => ({
        time: c.time as Time,
        value: ((c.close - base) / base) * 100,
      }));
      const line = chart.addSeries(LineSeries, {
        color: COLORS[i % COLORS.length],
        lineWidth: 2,
        priceLineVisible: false,
        title: s.symbol,
        priceFormat: { type: "custom", formatter: (v: number) => `${v.toFixed(2)}%` },
      });
      line.setData(data);
      lineSeriesRef.current.push(line);
    });
    chart.timeScale().fitContent();
  }, [series]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-[var(--text-secondary)] pointer-events-none">
          로딩 중...
        </div>
      )}
      {!loading && series.every((s) => s.candles.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-secondary)] pointer-events-none">
          비교할 종목을 추가하세요
        </div>
      )}
    </div>
  );
}
