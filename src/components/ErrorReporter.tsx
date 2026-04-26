"use client";
import { useEffect } from "react";

/**
 * Captures runtime errors and unhandled promise rejections in the browser
 * and forwards them to /api/errors. Mounted once at the app root so every
 * page benefits.
 */
export function ErrorReporter() {
  useEffect(() => {
    function send(payload: Record<string, unknown>) {
      try {
        const body = JSON.stringify({
          ...payload,
          url: typeof window !== "undefined" ? window.location.href : "",
          userAgent: navigator.userAgent,
          ts: Date.now(),
        });
        // sendBeacon is fire-and-forget and survives page unload
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/errors", body);
        } else {
          fetch("/api/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // last-resort guard so the reporter never throws
      }
    }

    function onError(e: ErrorEvent) {
      send({
        message: e.message,
        source: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack,
      });
    }

    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason;
      send({
        message: typeof r === "string" ? r : r?.message ?? "Unhandled rejection",
        stack: r?.stack,
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
