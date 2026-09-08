import { Calendar, LocaleConfig } from "react-native-calendars";
import { useLocale } from "../services/i18n";

if (LocaleConfig) {
    LocaleConfig.locales.en = LocaleConfig.locales[""];
    LocaleConfig.locales.id = {
        monthNames: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
        monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
        dayNames: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
        dayNamesShort: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
        today: "Hari ini",
    };
}

export default function LocalizedCalendar(props) {
    const locale = useLocale();
    // The calendar library reads its locale from this shared configuration.
    if (LocaleConfig) LocaleConfig.defaultLocale = locale;
    return <Calendar key={locale} {...props} />;
}
