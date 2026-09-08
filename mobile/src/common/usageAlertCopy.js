import { t, formatValue } from "../services/i18n";

export function usageAlertTitle(alert) {
    if (alert.alert_type === "USAGE_LIMIT_DAILY") return t("dailyAlert");
    if (alert.alert_type === "USAGE_LIMIT_MONTHLY") return t("monthlyAlert");
    return t("Usage alert");
}
export function usageAlertBody(alert) {
    const name = alert.device_name || alert.device_code || t("Device Name");
    if (alert.meta?.consumed_l != null && alert.meta?.limit_l != null) {
        return t("alertBody", { name, usage: formatValue(alert.meta.consumed_l, 2), limit: formatValue(alert.meta.limit_l, 2) });
    }
    return t("newUsageAlert", { name });
}
