import type { Candle, IndicatorPoint, Indicators } from "@/lib/types";

/**
 * Pure JS fallback indicators computed from candle data.
 * Used when Alpha Vantage API key is not configured.
 */

export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];
  const out: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function rsi(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period) return [];
  const out: IndicatorPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out.push({
    time: candles[period].time,
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
  });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push({
      time: candles[i].time,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
    });
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function macd(candles: Candle[]): { time: number; macd: number; signal: number; hist: number }[] {
  if (candles.length < 35) return [];
  const closes = candles.map((c) => c.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine: number[] = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = ema(macdLine, 9);
  return candles.map((c, i) => ({
    time: c.time,
    macd: macdLine[i],
    signal: signalLine[i],
    hist: macdLine[i] - signalLine[i],
  }));
}

export function computeIndicators(candles: Candle[]): Indicators {
  return {
    rsi: rsi(candles, 14),
    sma20: sma(candles, 20),
    sma50: sma(candles, 50),
    macd: macd(candles),
  };
}
