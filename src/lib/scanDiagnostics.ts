import type { AdminScan, AdminScanDetail, AdminScanTimelineEvent } from "../types/admin";

export function formatEngineeringError(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      const type = typeof record.type === "string" ? record.type : null;
      return type ? `${type}: ${record.message}` : record.message;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function scanErrorSummary(scan: Pick<AdminScan, "error" | "status">): string | null {
  if (scan.status !== "failed" && scan.status !== "completed_with_errors") return null;
  return formatEngineeringError(scan.error);
}

export function primaryFailureMessage(detail: AdminScanDetail): string | null {
  return (
    formatEngineeringError(detail.error) ??
    formatEngineeringError(detail.collection_error) ??
    extractTimelineFailure(detail.timeline)
  );
}

export function extractTimelineFailure(events: AdminScanTimelineEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.event_type === "collection.failed") {
      const payload = event.payload;
      const err = payload && typeof payload === "object" ? (payload as Record<string, unknown>).error : null;
      const msg = formatEngineeringError(err);
      if (msg) return msg;
    }
    if (event.event_type === "scan.completed" && event.payload) {
      const payload = event.payload as Record<string, unknown>;
      if (payload.status === "failed") {
        const msg = formatEngineeringError(payload.error);
        if (msg) return msg;
      }
    }
  }
  return null;
}
