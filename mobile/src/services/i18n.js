import { useSyncExternalStore } from "react";
import copy from "../constants/messages/ui";

let language = "en";
const listeners = new Set();
export function setLanguage(locale) {
    language = locale === "id" ? "id" : "en";
    listeners.forEach((listener) => listener());
}
export function getLanguage() { return language; }
export function getLanguageTag() { return language === "id" ? "id-ID" : "en-US"; }
function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function useLocale() {
    return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
export function t(key, values = {}, locale = language) {
    const phrase = copy[key]?.[locale === "id" ? 1 : 0] ?? key;
    return phrase.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}
export function formatValue(value, decimals = 2) {
    return Number(value || 0).toLocaleString(language === "id" ? "id-ID" : "en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
