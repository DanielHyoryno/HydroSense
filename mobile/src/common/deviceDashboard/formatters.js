export function formatDateLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatNumber(value, decimals = 2) {
  const num = Number(value || 0);
  return num.toFixed(decimals);
}

export function formatRelativeAge(diffSec) {
  if (!Number.isFinite(diffSec) || diffSec < 0) return "0 seconds";

  const units = [
    { label: "month", sec: 30 * 24 * 60 * 60 },
    { label: "week", sec: 7 * 24 * 60 * 60 },
    { label: "day", sec: 24 * 60 * 60 },
    { label: "hour", sec: 60 * 60 },
    { label: "minute", sec: 60 },
    { label: "second", sec: 1 },
  ];
  
  for (const unit of units) {
    const value = Math.floor(diffSec / unit.sec);
    if (value >= 1) {
      return `${value} ${unit.label}${value > 1 ? "s" : ""}`;
    }
  }

  return "0 seconds";
}

export function toLocalDateISO(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}
