import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { useAuth } from "../context/AuthContext";
import SectionAccordion from "../components/SectionAccordion";
import {
  dailyTelemetryApi,
  latestTelemetryApi,
  usageAlertsApi,
  usageLimitsApi,
  dismissAlertApi,
} from "../services/api";

function formatDateLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatNumber(value, decimals = 2) {
  const num = Number(value || 0);
  return num.toFixed(decimals);
}

function formatRelativeAge(diffSec) {
  if (!Number.isFinite(diffSec) || diffSec < 0) return "0 seconds";

  const units = [
    { label: "month", sec: 30 * 24 * 60 * 60 },
    { label: "week", sec: 7 * 24 * 60 * 60 },
    { label: "day", sec: 24 * 60 * 60 },
    { label: "hour", sec: 60 * 60 },
    { label: "minute", sec: 60 },
    { label: "second", sec: 1 },
  ];

  for (const unit of units) {
    const value = Math.floor(diffSec / unit.sec);
    if (value >= 1) {
      return `${value} ${unit.label}${value > 1 ? "s" : ""}`;
    }
  }

  return "0 seconds";
}

function toLocalDateISO(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}

const AUTO_REFRESH_MS = 4000; // near-real-time refresh every 4 seconds
const OFFLINE_THRESHOLD_SEC = 120;

// Simple bar chart built with plain Views (no external chart library needed)
function FlowBarChart({ data }) {
  if (!data || data.length === 0) return null;

  // Take the last 20 readings, show newest on the right
  const items = data.slice(-20);
  const maxFlow = items.reduce((max, d) => Math.max(max, Number(d.flow_rate_lpm || 0)), 0);
  const chartMax = maxFlow > 0 ? maxFlow * 1.15 : 1; // 15 % headroom
  const tickIndexes = [0, Math.floor((items.length - 1) / 2), items.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {items.map((item, idx) => {
          const val = Number(item.flow_rate_lpm || 0);
          const pct = (val / chartMax) * 100;
          return (
            <View key={`${item.measured_at}-${idx}`} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBar, { height: `${Math.max(pct, 2)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        {tickIndexes.map((idx) => (
          <Text key={`tick-${idx}`} style={styles.chartLabel}>
            {formatDateLabel(items[idx].measured_at)}
          </Text>
        ))}
      </View>
      <Text style={styles.chartCaption}>
        Flow rate (peak {formatNumber(maxFlow, 2)} L/min)
      </Text>
    </View>
  );
}

function FlowLineChart({ data, chartWidth }) {
  if (!data || data.length === 0) return null;

  const items = data.slice(-20);
  const maxFlow = items.reduce((max, d) => Math.max(max, Number(d.flow_rate_lpm || 0)), 0);
  const chartMax = maxFlow > 0 ? maxFlow * 1.15 : 1;
  const chartHeight = 100;
  const width = Math.max(220, chartWidth || 300);
  const tickIndexes = [0, Math.floor((items.length - 1) / 2), items.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  const points = items
    .map((item, idx) => {
      const val = Number(item.flow_rate_lpm || 0);
      const x = items.length <= 1 ? width / 2 : (idx / (items.length - 1)) * width;
      const y = chartHeight - (val / chartMax) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={styles.chartContainer}>
      <View style={styles.lineChartBox}>
        <Svg width={width} height={chartHeight}>
          <Line x1="0" y1={chartHeight} x2={width} y2={chartHeight} stroke="#dbe6f5" strokeWidth="1" />
          <Line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#dbe6f5" strokeWidth="1" />
          <Polyline fill="none" stroke="#0f62fe" strokeWidth="2.5" points={points} />
          {items.map((item, idx) => {
            const val = Number(item.flow_rate_lpm || 0);
            const x = items.length <= 1 ? width / 2 : (idx / (items.length - 1)) * width;
            const y = chartHeight - (val / chartMax) * chartHeight;
            return <Circle key={`linept-${item.measured_at}-${idx}`} cx={x} cy={y} r="3" fill="#0f62fe" />;
          })}
        </Svg>
      </View>
      <View style={styles.chartLabels}>
        {tickIndexes.map((idx) => (
          <Text key={`dot-tick-${idx}`} style={styles.chartLabel}>
            {formatDateLabel(items[idx].measured_at)}
          </Text>
        ))}
      </View>
      <Text style={styles.chartCaption}>Line trend (peak {formatNumber(maxFlow, 2)} L/min)</Text>
    </View>
  );
}

function StaggerCard({ index = 0, style, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: Math.min(index * 70, 420),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 340,
        delay: Math.min(index * 70, 420),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function StaggerRow({ index = 0, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: Math.min(index * 40, 320),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 260,
        delay: Math.min(index * 40, 320),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateX]);

  return <Animated.View style={{ opacity, transform: [{ translateX }] }}>{children}</Animated.View>;
}

export default function DeviceDashboardScreen({ route, navigation }) {
  const { device } = route.params;
  const { token } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [latest, setLatest] = useState(null);
  const [dailyItems, setDailyItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [limits, setLimits] = useState(null);
  const [flowChartType, setFlowChartType] = useState("bar");
  const [clockTick, setClockTick] = useState(0);
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(14)).current;
  const livePulse = useRef(new Animated.Value(1)).current;

  const today = toLocalDateISO();
  const chartWidth = useMemo(() => Math.max(220, Math.floor(screenWidth - 80)), [screenWidth]);
  const isWideLayout = screenWidth >= 980;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entryTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [entryOpacity, entryTranslateY]);

  useEffect(() => {
    const timer = setInterval(() => setClockTick((v) => (v + 1) % 100000), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestAgeSec = useMemo(() => {
    if (!latest?.measured_at) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(latest.measured_at).getTime()) / 1000));
  }, [latest?.measured_at, clockTick]);

  const isDeviceOnline = latestAgeSec !== null && latestAgeSec <= OFFLINE_THRESHOLD_SEC;
  const displayFlowRate = isDeviceOnline ? Number(latest?.flow_rate_lpm || 0) : 0;

  useEffect(() => {
    if (!isDeviceOnline) {
      livePulse.stopAnimation();
      livePulse.setValue(0.45);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 0.6,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isDeviceOnline, livePulse]);

  const lastSeenText = useMemo(() => {
    if (!latest?.measured_at) return "No telemetry yet";
    const diffSec = latestAgeSec ?? 0;
    const relative = formatRelativeAge(diffSec);
    return `${isDeviceOnline ? "Updated" : "Last seen"} ${relative} ago`;
  }, [latest?.measured_at, latestAgeSec, isDeviceOnline]);

  const totalTodayLiters = useMemo(() => {
    return dailyItems.reduce((sum, item) => sum + Number(item.volume_delta_l || 0), 0);
  }, [dailyItems]);

  const avgFlowToday = useMemo(() => {
    if (dailyItems.length === 0) return 0;
    const sum = dailyItems.reduce((acc, item) => acc + Number(item.flow_rate_lpm || 0), 0);
    return sum / dailyItems.length;
  }, [dailyItems]);

  const highestFlow = useMemo(() => {
    if (dailyItems.length === 0) return 0;
    return dailyItems.reduce((max, item) => Math.max(max, Number(item.flow_rate_lpm || 0)), 0);
  }, [dailyItems]);

  const loadAll = useCallback(async () => {
    setError("");
    const [latestData, dailyData, alertData, limitData] = await Promise.all([
      latestTelemetryApi(token, device.device_code).catch(() => null),
      dailyTelemetryApi(token, device.device_code, today),
      usageAlertsApi(token, device.device_code, "active", 20).catch(() => ({ items: [] })),
      usageLimitsApi(token, device.device_code).catch(() => null),
    ]);

    setLatest(latestData);
    setDailyItems(dailyData?.items || []);
    setAlerts(alertData?.items || []);
    setLimits(limitData);
  }, [device.device_code, token, today]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function run() {
        setLoading(true);
        try {
          await loadAll();
        } catch (err) {
          if (mounted) setError(err.message || "Failed to load dashboard");
        } finally {
          if (mounted) setLoading(false);
        }
      }

      run();

      // Auto-refresh every 15 seconds while screen is focused
      const interval = setInterval(async () => {
        if (!mounted) return;
        try {
          await loadAll();
        } catch (_) {
          // silent on auto-refresh failures
        }
      }, AUTO_REFRESH_MS);

      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }, [loadAll])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } catch (err) {
      setError(err.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDismissAlert(alertId) {
    try {
      await dismissAlertApi(token, alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      setError(err.message || "Failed to dismiss alert");
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
    <Animated.ScrollView
      style={[
        styles.page,
        {
          opacity: entryOpacity,
          transform: [{ translateY: entryTranslateY }],
        },
      ]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.deviceHeaderLeft}>
          <Text style={styles.deviceName}>{device.device_name}</Text>
          <Text style={styles.deviceMeta}>Code: {device.device_code}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.editDeviceButton, pressed && styles.editDeviceButtonPressed]}
          onPress={() => navigation.navigate("DeviceEdit", { device })}
        >
          <Text style={styles.editDeviceButtonText}>Edit</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.topSectionWrap, isWideLayout && styles.topSectionWrapWide]}>
        <View style={[styles.topSectionItem, isWideLayout && styles.topSectionItemWide]}>
          <SectionAccordion title="Overview" defaultExpanded>
            <StaggerCard index={0} style={styles.card}>
          <View style={styles.liveHeader}>
            <Text style={styles.cardTitle}>Current Status</Text>
            <View style={[styles.liveChip, !isDeviceOnline && styles.liveChipOffline]}>
              <Animated.View
                style={[styles.liveDot, !isDeviceOnline && styles.liveDotOffline, { opacity: livePulse }]}
              />
              <Text style={[styles.liveText, !isDeviceOnline && styles.liveTextOffline]}>
                {isDeviceOnline ? "ONLINE" : "OFFLINE"}
              </Text>
            </View>
          </View>
          <Text style={styles.mainMetric}>{formatNumber(displayFlowRate, 2)} L/min</Text>
          <Text style={styles.meta}>Latest at: {latest?.measured_at ? new Date(latest.measured_at).toLocaleString() : "-"}</Text>
          <Text style={styles.metaStrong}>{lastSeenText}</Text>
            </StaggerCard>

            <StaggerCard index={1} style={styles.row}>
              <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardTitle}>Today Total</Text>
            <Text style={styles.metric}>{formatNumber(totalTodayLiters, 3)} L</Text>
              </View>
              <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardTitle}>Average Flow</Text>
            <Text style={styles.metric}>{formatNumber(avgFlowToday, 2)} L/min</Text>
              </View>
            </StaggerCard>

            <StaggerCard index={2} style={styles.card}>
              <Text style={styles.cardTitle}>Peak Flow Today</Text>
              <Text style={styles.metric}>{formatNumber(highestFlow, 2)} L/min</Text>
            </StaggerCard>
          </SectionAccordion>
        </View>

        <View style={[styles.topSectionItem, isWideLayout && styles.topSectionItemWide]}>
          <SectionAccordion title="Alerts & Limits" defaultExpanded>
            <StaggerCard index={3} style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={styles.cardTitle}>Usage Limits</Text>
            <Text style={styles.meta}>Daily: {limits?.daily_usage_limit_l ? `${limits.daily_usage_limit_l} L` : "Not set"}</Text>
            <Text style={styles.meta}>Monthly: {limits?.monthly_usage_limit_l ? `${limits.monthly_usage_limit_l} L` : "Not set"}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.limitButton, pressed && styles.limitButtonPressed]}
            onPress={() => navigation.navigate("UsageLimits", { device })}
          >
            <Text style={styles.limitButtonText}>Edit</Text>
          </Pressable>
        </View>
            </StaggerCard>

            <StaggerCard index={4} style={styles.card}>
        <Text style={styles.cardTitle}>Active Usage Alerts</Text>
        {alerts.length === 0 ? (
          <Text style={styles.meta}>No active alerts</Text>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <StaggerRow index={index}>
                <View style={styles.alertItem}>
                  <View style={styles.alertRow}>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{item.title}</Text>
                      <Text style={styles.alertMsg}>{item.message}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.dismissButton, pressed && styles.dismissButtonPressed]}
                      onPress={() => handleDismissAlert(item.id)}
                    >
                      <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              </StaggerRow>
            )}
          />
        )}
            </StaggerCard>
          </SectionAccordion>
        </View>
      </View>

      <SectionAccordion title="Telemetry Details" defaultExpanded>
        <StaggerCard index={5} style={styles.card}>
        <Text style={styles.cardTitle}>Flow Rate Chart</Text>
        <View style={styles.chartTypeRow}>
          <Pressable
            style={[styles.chartTypeButton, flowChartType === "bar" && styles.chartTypeButtonActive]}
            onPress={() => setFlowChartType("bar")}
          >
            <Text style={[styles.chartTypeText, flowChartType === "bar" && styles.chartTypeTextActive]}>Bars</Text>
          </Pressable>
          <Pressable
            style={[styles.chartTypeButton, flowChartType === "line" && styles.chartTypeButtonActive]}
            onPress={() => setFlowChartType("line")}
          >
            <Text style={[styles.chartTypeText, flowChartType === "line" && styles.chartTypeTextActive]}>
              Line
            </Text>
          </Pressable>
        </View>
        {dailyItems.length === 0 ? (
          <Text style={styles.meta}>No data to chart</Text>
        ) : (
          <>
            {flowChartType === "bar" ? (
              <FlowBarChart data={dailyItems} />
            ) : (
              <FlowLineChart data={dailyItems} chartWidth={chartWidth} />
            )}
          </>
        )}
        </StaggerCard>

        <StaggerCard index={6} style={styles.card}>
        <Text style={styles.cardTitle}>Today History</Text>
        {dailyItems.length === 0 ? (
          <Text style={styles.meta}>No telemetry for today</Text>
        ) : (
          <FlatList
            data={dailyItems.slice(-20).reverse()}
            keyExtractor={(item, idx) => `${item.measured_at}-${idx}`}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <StaggerRow index={index}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyTime}>{formatDateLabel(item.measured_at)}</Text>
                  <Text style={styles.historyValue}>{formatNumber(item.flow_rate_lpm, 2)} L/min</Text>
                  <Text style={styles.historyValue}>{formatNumber(item.volume_delta_l, 4)} L</Text>
                </View>
              </StaggerRow>
            )}
          />
        )}
        </StaggerCard>

        <StaggerCard index={7}>
        <Pressable
          style={({ pressed }) => [styles.historyButton, pressed && styles.historyButtonPressed]}
          onPress={() => navigation.navigate("UsageHistory", { device })}
        >
          <Text style={styles.historyButtonText}>View History</Text>
        </Pressable>
        </StaggerCard>
      </SectionAccordion>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f8ff",
  },
  page: {
    flex: 1,
    backgroundColor: "#f4f8ff",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  topSectionWrap: {
    gap: 10,
  },
  topSectionWrapWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  topSectionItem: {
    width: "100%",
  },
  topSectionItemWide: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deviceHeaderLeft: {
    flex: 1,
  },
  deviceName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#183654",
  },
  deviceMeta: {
    color: "#55708a",
    marginTop: 4,
  },
  editDeviceButton: {
    backgroundColor: "#edf2fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  editDeviceButtonPressed: {
    backgroundColor: "#dbe6f5",
  },
  editDeviceButtonText: {
    color: "#0f62fe",
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  cardHalf: {
    flex: 1,
  },
  cardTitle: {
    color: "#1d3551",
    fontWeight: "700",
    marginBottom: 6,
  },
  liveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef4ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveChipOffline: {
    backgroundColor: "#f5f7fa",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0f62fe",
  },
  liveDotOffline: {
    backgroundColor: "#8fa0b4",
  },
  liveText: {
    color: "#0f62fe",
    fontSize: 11,
    fontWeight: "700",
  },
  liveTextOffline: {
    color: "#5f738b",
  },
  mainMetric: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f62fe",
  },
  metric: {
    fontSize: 21,
    fontWeight: "700",
    color: "#16426d",
  },
  meta: {
    color: "#4d6480",
    marginTop: 2,
  },
  metaStrong: {
    color: "#2b4b6a",
    marginTop: 4,
    fontWeight: "700",
    fontSize: 12,
  },
  alertItem: {
    borderTopWidth: 1,
    borderTopColor: "#edf2fa",
    paddingTop: 8,
    marginTop: 8,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  alertContent: {
    flex: 1,
    marginRight: 10,
  },
  alertTitle: {
    fontWeight: "700",
    color: "#7a2323",
  },
  alertMsg: {
    color: "#8f3a3a",
    marginTop: 2,
  },
  dismissButton: {
    backgroundColor: "#fef0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f5c6c6",
  },
  dismissButtonPressed: {
    backgroundColor: "#fddcdc",
  },
  dismissButtonText: {
    color: "#a61d1d",
    fontWeight: "600",
    fontSize: 12,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#edf2fa",
    paddingTop: 8,
    marginTop: 8,
  },
  historyTime: {
    color: "#27435e",
    width: 70,
  },
  historyValue: {
    color: "#27435e",
    fontWeight: "600",
  },
  error: {
    color: "#a61d1d",
    marginBottom: 8,
  },
  limitButton: {
    backgroundColor: "#edf2fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  limitButtonPressed: {
    backgroundColor: "#dbe6f5",
  },
  limitButtonText: {
    color: "#0f62fe",
    fontWeight: "600",
    fontSize: 14,
  },
  historyButton: {
    backgroundColor: "#0f62fe",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f62fe",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  historyButtonPressed: {
    opacity: 0.85,
  },
  historyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  chartContainer: {
    marginTop: 4,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 2,
  },
  chartBarCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBarTrack: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#edf2fa",
    borderRadius: 3,
    overflow: "hidden",
  },
  chartBar: {
    backgroundColor: "#0f62fe",
    borderRadius: 3,
    minHeight: 2,
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  chartLabel: {
    color: "#55708a",
    fontSize: 11,
  },
  chartCaption: {
    color: "#55708a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  lineChartBox: {
    backgroundColor: "#f9fbff",
    borderWidth: 1,
    borderColor: "#e1eaf8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  chartTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  chartTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    backgroundColor: "#fff",
  },
  chartTypeButtonActive: {
    borderColor: "#0f62fe",
    backgroundColor: "#edf4ff",
  },
  chartTypeText: {
    color: "#35506d",
    fontWeight: "600",
    fontSize: 12,
  },
  chartTypeTextActive: {
    color: "#0f62fe",
  },
});
