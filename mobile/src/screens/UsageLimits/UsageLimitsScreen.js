import FailureNotice from "../../components/FailureNotice";
import { t, useLocale } from "../../services/i18n";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { upsertUsageLimitsApi, usageLimitsApi } from "../../services/api";
import styles from "./styles";

export default function UsageLimitsScreen({ route, navigation }) {
    useLocale();
    const { device } = route.params;
    const { token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [successMsg, setSuccessMsg] = useState("");

    const [dailyLimit, setDailyLimit] = useState("");
    const [monthlyLimit, setMonthlyLimit] = useState("");

    useEffect(() => {
        let mounted = true;
        setLoadError("");
        setLoading(true);
        async function load() {
            try {
                const data = await usageLimitsApi(token, device.device_code);
                if (mounted && data) {
                    setDailyLimit(data.daily_usage_limit_l ? String(data.daily_usage_limit_l) : "");
                    setMonthlyLimit(data.monthly_usage_limit_l ? String(data.monthly_usage_limit_l) : "");
                }
            } catch (err) {
                if (mounted) setLoadError(err.message || t("Failed to load limits"));
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [token, device.device_code, loadAttempt]);

    async function handleSave() {
        setError("");
        setSuccessMsg("");

        const normalizedDailyLimit = dailyLimit.trim();
        const normalizedMonthlyLimit = monthlyLimit.trim();
        const parsedDailyLimit = normalizedDailyLimit ? Number(normalizedDailyLimit) : null;
        const parsedMonthlyLimit = normalizedMonthlyLimit ? Number(normalizedMonthlyLimit) : null;
        const hasInvalidLimit = [parsedDailyLimit, parsedMonthlyLimit].some(
            (value) => value !== null && (!Number.isFinite(value) || value <= 0)
        );

        if (hasInvalidLimit) {
            setError(t("Limits must be positive numbers or left empty."));
            return;
        }

        setSaving(true);

        try {
            const body = {
                device_code: device.device_code,
                daily_usage_limit_l: parsedDailyLimit,
                monthly_usage_limit_l: parsedMonthlyLimit,
            };

            await upsertUsageLimitsApi(token, body);
            setSuccessMsg(t("Limits updated successfully"));
            setTimeout(() => navigation.goBack(), 1500);
        } catch (err) {
            setError(err.message || t("Failed to save limits"));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingPage}>
                <ActivityIndicator size="large" color="#0f62fe" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{t("Set Usage Limits")}</Text>
            <Text style={styles.subtitle}>{t("Configure automatic alerts when water usage exceeds these thresholds.")}</Text>

            <FailureNotice error={loadError} onRetry={() => setLoadAttempt((n) => n + 1)} />
            <FailureNotice error={error} popup={false} />
            {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

            <View style={styles.card}>
                <Text style={styles.subtitle}>{t("limitHint")}</Text>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("Daily Limit (Liters)")}</Text>
                    <TextInput
                        style={styles.input}
                        value={dailyLimit}
                        onChangeText={setDailyLimit}
                        placeholder={t("e.g. 500")}
                        keyboardType="numeric"
                        placeholderTextColor="#9db0c4"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("Monthly Limit (Liters)")}</Text>
                    <TextInput
                        style={styles.input}
                        value={monthlyLimit}
                        onChangeText={setMonthlyLimit}
                        placeholder={t("e.g. 15000")}
                        keyboardType="numeric"
                        placeholderTextColor="#9db0c4"
                    />
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed,
                        saving && styles.buttonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("Save Limits")}</Text>}
                </Pressable>
            </View>
        </ScrollView>
    );
}
