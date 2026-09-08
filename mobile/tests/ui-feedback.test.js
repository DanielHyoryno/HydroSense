import { Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import FailureNotice from "../src/components/FailureNotice";
import SectionAccordion from "../src/components/SectionAccordion";
import { setLanguage, t, useLocale, formatValue } from "../src/services/i18n";
import copy from "../src/constants/messages/ui";
import en from "../src/constants/messages/en";
import id from "../src/constants/messages/id";
import { usageAlertBody, usageAlertTitle } from "../src/common/usageAlertCopy";
import { bleErrorCopy } from "../src/common/bleErrorCopy";

afterEach(() => { act(() => setLanguage("en")); });

test("all UI phrases have English and Indonesian text with matching placeholders", () => {
    for (const phrases of Object.values(copy)) {
        expect(phrases).toHaveLength(2);
        expect(phrases.every((text) => typeof text === "string" && text.trim().length > 0)).toBe(true);
        expect((phrases[0].match(/\{\w+\}/g) || []).sort()).toEqual((phrases[1].match(/\{\w+\}/g) || []).sort());
    }
    function keys(value, prefix = "") {
        return Object.entries(value).flatMap(([key, item]) => typeof item === "object" ? keys(item, `${prefix}${key}.`) : [`${prefix}${key}`]).sort();
    }
    expect(keys(en)).toEqual(keys(id));
});

test("changing language updates a mounted screen and preserves user-provided names", () => {
    function Label() { useLocale(); return <Text>{t("connectedDevice", { name: "Kitchen 01" })}</Text>; }
    render(<Label />);
    expect(screen.getByText("Connected: Kitchen 01")).toBeTruthy();
    act(() => setLanguage("id"));
    expect(screen.getByText("Terhubung: Kitchen 01")).toBeTruthy();
    expect(formatValue(1234.5, 2)).toBe("1.234,50");
});

test("extra details are unmounted until opened and removed on collapse", () => {
    render(<SectionAccordion title="Details"><Text>Long details</Text></SectionAccordion>);
    expect(screen.queryByText("Long details")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByText("Long details")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Details" }).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByRole("button", { name: "Details" }));
    expect(screen.queryByText("Long details")).toBeNull();
});

test("summary can remain open by default", () => {
    render(<SectionAccordion title="Summary" defaultExpanded><Text>Total usage</Text></SectionAccordion>);
    expect(screen.getByText("Total usage")).toBeTruthy();
});

test("failure popup explains the reason, closes, and retains an inline retry", async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    render(<FailureNotice error="Connection lost" onRetry={retry} />);
    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Connection lost")).toBeTruthy();
    fireEvent.press(screen.getByText("Close"));
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.getByText("Connection lost")).toBeTruthy();
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
});

test("background polling does not repeatedly open the same failure popup", () => {
    const view = render(<FailureNotice error="Connection lost" />);
    fireEvent.press(screen.getByText("Close"));
    view.rerender(<FailureNotice error="" />);
    view.rerender(<FailureNotice error="Connection lost" />);
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.getByText("Connection lost")).toBeTruthy();
});

test("validation stays inline without a popup or destructive form reload", () => {
    render(<FailureNotice error="Check your input" popup={false} />);
    expect(screen.getByText("Check your input")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByText("Try again")).toBeNull();
});

test("usage alerts and Bluetooth causes use the selected language", () => {
    setLanguage("id");
    const alert = { alert_type: "USAGE_LIMIT_DAILY", device_name: "Kitchen", meta: { consumed_l: 12.5, limit_l: 10 } };
    expect(usageAlertTitle(alert)).toBe("Batas harian terlewati");
    expect(usageAlertBody(alert)).toBe("Kitchen: terpakai 12,50 L (batas 10,00 L).");
    expect(bleErrorCopy({ errorCode: 102 }, "Scan failed")).toBe("Aktifkan Bluetooth, lalu pindai lagi.");
});
