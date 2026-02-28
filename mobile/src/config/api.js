import { Platform } from "react-native";

const MOBILE_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL_MOBILE ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://192.168.1.9:8080/api/v1";

const WEB_API_BASE_URL_FROM_ENV =
  process.env.EXPO_PUBLIC_API_BASE_URL_WEB || process.env.EXPO_PUBLIC_API_BASE_URL || "";

const WEB_HOST =
  typeof window !== "undefined" && window.location && window.location.hostname
    ? window.location.hostname
    : "localhost";

const WEB_API_BASE_URL = WEB_API_BASE_URL_FROM_ENV || `http://${WEB_HOST}:8080/api/v1`;

export const API_BASE_URL = Platform.OS === "web" ? WEB_API_BASE_URL : MOBILE_API_BASE_URL;
