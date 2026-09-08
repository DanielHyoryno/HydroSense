import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { t, useLocale } from "../services/i18n";

// A persistent inline notice plus one popup per error per minute.
export default function FailureNotice({ error, onRetry, stale = false, popup = true, title }) {
    useLocale();
    const { height } = useWindowDimensions();
    const offset = useRef(new Animated.Value(height)).current;
    const shown = useRef({ error: null, time: 0 });
    const [visible, setVisible] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState("");
    const reason = retryError || error;

    useEffect(() => {
        if (!error) { setVisible(false); setRetryError(""); return; }
        if (!popup || (shown.current.error === error && Date.now() - shown.current.time < 60000)) return;
        shown.current = { error, time: Date.now() };
        offset.setValue(height);
        setVisible(true);
        Animated.timing(offset, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, [error, popup, height, offset]);

    async function retry() {
        if (retrying || !onRetry) return;
        setVisible(false);
        setRetryError("");
        setRetrying(true);
        try { await onRetry(); }
        catch (err) { setRetryError(err.message || t("requestError")); }
        finally { setRetrying(false); }
    }

    if (!reason && !retrying) return null;
    const actions = (
        <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={() => setVisible(false)} accessibilityRole="button">
                <Text style={styles.actionText}>{t("close")}</Text>
            </Pressable>
            {onRetry ? <Pressable style={styles.primary} onPress={retry} disabled={retrying} accessibilityRole="button">
                <Text style={styles.primaryText}>{t("retry")}</Text>
            </Pressable> : null}
        </View>
    );
    return (
        <View style={styles.banner}>
            {!visible ? <Text style={styles.reason} accessibilityLiveRegion="polite">{reason}</Text> : null}
            {stale && !visible ? <Text style={styles.hint}>{t("staleData")}</Text> : null}
            {retrying ? <ActivityIndicator color="#0f62fe" accessibilityLabel={t("loading")} /> :
                onRetry && !visible ? <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
                    <Text style={styles.actionText}>{t("retry")}</Text>
                </Pressable> : null}
            <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
                <View style={styles.backdrop}>
                    <Animated.View style={[styles.dialog, { maxHeight: height * 0.75, transform: [{ translateY: offset }] }]} accessibilityViewIsModal>
                        <ScrollView contentContainerStyle={styles.dialogContent}>
                            <Text style={styles.title}>{title || t("failureTitle")}</Text>
                            <Text style={styles.reason}>{reason}</Text>
                            {stale ? <Text style={styles.hint}>{t("staleData")}</Text> : null}
                            {actions}
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}
const styles = StyleSheet.create({
    banner: { padding: 12, borderRadius: 12, backgroundColor: "#fff1f0", marginVertical: 10 },
    reason: { fontSize: 14, lineHeight: 21, color: "#8f2720" },
    hint: { fontSize: 13, lineHeight: 19, marginTop: 8, color: "#526779" },
    retry: { alignSelf: "flex-start", paddingVertical: 12, paddingRight: 18 },
    backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(13,23,36,0.4)" },
    dialog: { width: "100%", maxWidth: 420, borderRadius: 20, backgroundColor: "#fff", overflow: "hidden" },
    dialogContent: { padding: 24 },
    title: { fontSize: 19, fontWeight: "700", color: "#17324d", marginBottom: 12 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
    secondary: { padding: 14, borderRadius: 10, backgroundColor: "#eef4ff" },
    primary: { padding: 14, borderRadius: 10, backgroundColor: "#0f62fe" },
    actionText: { fontSize: 14, color: "#0f62fe", fontWeight: "600" },
    primaryText: { fontSize: 14, color: "#fff", fontWeight: "600" },
});
