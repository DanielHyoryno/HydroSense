import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { t } from "./i18n";

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function sanitizeXlsxFilename(filename) {
    const safeName = String(filename || "water-usage.xlsx")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
        .trim();

    return safeName.toLowerCase().endsWith(".xlsx") ? safeName : `${safeName}.xlsx`;
}

export async function saveAndShareXlsx({ arrayBuffer, filename, contentType }) {
    const safeFilename = sanitizeXlsxFilename(filename);
    const file = new File(Paths.cache, safeFilename);

    try {
        file.create({ overwrite: true, intermediates: true });
        file.write(new Uint8Array(arrayBuffer));
    } catch {
        throw new Error(t("saveFileError"));
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        try {
            await Sharing.shareAsync(file.uri, {
                mimeType: contentType || XLSX_MIME_TYPE,
                dialogTitle: t("Export XLSX"),
                UTI: "org.openxmlformats.spreadsheetml.sheet",
            });
        } catch {
            throw new Error(t("shareFileError"));
        }
    }

    return {
        fileUri: file.uri,
        shared: canShare,
    };
}
