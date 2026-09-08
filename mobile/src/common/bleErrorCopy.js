import { t } from "../services/i18n";

export function bleErrorCopy(error, fallback) {
    const key = {
        3: "bleTimeout",
        100: "bleUnsupported",
        101: "Bluetooth permissions denied. Enable them in system settings.",
        102: "bleOff",
        201: "bleDisconnected",
    }[error?.errorCode];
    return t(key || fallback);
}
