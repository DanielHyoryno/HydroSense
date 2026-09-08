import { act, render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AlertNotificationWatcher from "../src/components/AlertNotificationWatcher";
import { useAuth } from "../src/context/AuthContext";
import { usageAlertsAllApi } from "../src/services/api";
import { getNotifiedAlertIds, saveNotifiedAlertIds } from "../src/services/storage";

jest.mock("expo-notifications", () => ({
    AndroidImportance: { HIGH: 4 },
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
}));

jest.mock("../src/context/AuthContext", () => ({
    useAuth: jest.fn(),
}));

jest.mock("../src/services/api", () => ({
    usageAlertsAllApi: jest.fn(),
}));

jest.mock("../src/services/storage", () => ({
    getNotifiedAlertIds: jest.fn(),
    saveNotifiedAlertIds: jest.fn(),
}));

describe("AlertNotificationWatcher", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
        useAuth.mockReturnValue({ token: "user-token", isAuthenticated: true });
        getNotifiedAlertIds.mockResolvedValue([]);
        saveNotifiedAlertIds.mockResolvedValue(undefined);
        Notifications.setNotificationChannelAsync.mockResolvedValue(undefined);
        Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
        Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
        Notifications.scheduleNotificationAsync.mockResolvedValue("notification-id");
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("shows a local notification for an alert found on the next 15-second poll", async () => {
        usageAlertsAllApi
            .mockResolvedValueOnce({ items: [] })
            .mockResolvedValueOnce({
                items: [
                    {
                        id: 91,
                        title: "Daily usage limit exceeded",
                        message: "Kitchen Meter exceeded its daily limit",
                        device_code: "TEST-ESP32-01",
                        alert_type: "USAGE_LIMIT_DAILY",
                    },
                ],
            });

        const view = render(<AlertNotificationWatcher />);
        await waitFor(() => expect(usageAlertsAllApi).toHaveBeenCalledTimes(1));

        await act(async () => {
            jest.advanceTimersByTime(15000);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({
                    title: "Daily limit exceeded",
                    data: expect.objectContaining({ alertId: 91 }),
                }),
                trigger: null,
            })
        );
        view.unmount();
    });

    test("does not schedule a notification when permission is denied", async () => {
        Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
        Notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });
        usageAlertsAllApi.mockResolvedValue({ items: [{ id: 92 }] });

        const view = render(<AlertNotificationWatcher />);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
        view.unmount();
    });
});
