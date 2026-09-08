import { t, formatValue, getLanguageTag } from "../../services/i18n";
export function formatDateLabel(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString(getLanguageTag(), { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function formatWibDateTime(isoString) {
    const date = new Date(isoString);
    return `${date.toLocaleString(getLanguageTag(), { timeZone: "Asia/Jakarta" })} WIB`;
}

export function formatNumber(value, decimals = 2) {
    const num = Number(value || 0);
    return formatValue(num, decimals);
}

export function formatRelativeAge(diffSec) {
    const seconds = Math.max(0, Number.isFinite(diffSec) ? diffSec : 0);
    const unit = seconds >= 86400 ? [86400, "daysAgo"] : seconds >= 3600 ? [3600, "hoursAgo"]
        : seconds >= 60 ? [60, "minutesAgo"] : [1, "secondsAgo"];
    return t(unit[1], { count: Math.floor(seconds / unit[0]) });
}

export function toLocalDateISO(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(
        parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
}
