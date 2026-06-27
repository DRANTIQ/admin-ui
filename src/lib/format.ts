export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "completed" || s === "pass") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (s === "failed" || s === "suspended" || s === "fail") {
    return "bg-red-50 text-red-800";
  }
  if (s.includes("error") || s === "completed_with_errors") {
    return "bg-amber-50 text-amber-800";
  }
  if (s === "queued" || s === "collecting" || s === "ingesting" || s === "evaluating") {
    return "bg-blue-50 text-blue-800";
  }
  return "bg-slate-100 text-slate-700";
}
