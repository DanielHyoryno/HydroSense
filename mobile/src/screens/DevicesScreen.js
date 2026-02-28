import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { createDeviceApi, deleteDeviceApi, listDevicesApi } from "../services/api";

const AUTO_REFRESH_MS = 5000;

function DeviceCard({ item, onDelete }) {
  const online = item.status === "online";
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!online) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.72,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [online, pulse]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.deviceName}>{item.device_name}</Text>
        <View style={styles.statusWrap}>
          {online ? <Animated.View style={[styles.liveDot, { opacity: pulse }]} /> : null}
          <Text style={[styles.statusBadge, online ? styles.statusOnline : styles.statusOffline]}>
            {online ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>Code: {item.device_code}</Text>
      <Text style={styles.meta}>Location: {item.install_location || "-"}</Text>
      <Text style={styles.meta}>Firmware: {item.firmware_version || "-"}</Text>
      <Pressable
        style={styles.deleteButton}
        onPress={() =>
          Alert.alert(
            "Delete Device",
            "Are you sure you want to delete this device? All telemetry data will be lost.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
            ]
          )
        }
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </View>
  );
}

export default function DevicesScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [deviceCode, setDeviceCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(14)).current;

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

  const loadDevices = useCallback(async () => {
    setError("");
    const data = await listDevicesApi(token);
    setItems(data.items || []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function run() {
        setLoading(true);
        try {
          await loadDevices();
        } catch (err) {
          if (mounted) setError(err.message || "Failed to load devices");
        } finally {
          if (mounted) setLoading(false);
        }
      }
      run();

      const interval = setInterval(async () => {
        if (!mounted) return;
        try {
          await loadDevices();
        } catch (_) {
          // silent on background refresh failures
        }
      }, AUTO_REFRESH_MS);

      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }, [loadDevices])
  );

  async function onRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await loadDevices();
    } catch (err) {
      setError(err.message || "Failed to refresh devices");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateDevice() {
    setCreating(true);
    setError("");
    setNewToken("");
    try {
      const data = await createDeviceApi(token, {
        device_code: deviceCode.trim(),
        device_name: deviceName.trim(),
        install_location: location.trim() || undefined,
      });

      setDeviceCode("");
      setDeviceName("");
      setLocation("");
      setNewToken(data.api_token || "");
      setTokenDialogOpen(Boolean(data.api_token));
      await loadDevices();
    } catch (err) {
      setError(err.message || "Failed to create device");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteDevice(deviceId) {
    setError("");
    try {
      await deleteDeviceApi(token, deviceId);
      await loadDevices();
    } catch (err) {
      setError(err.message || "Failed to delete device");
    }
  }

  async function handleCopyToken() {
    if (!newToken) return;
    await Clipboard.setStringAsync(newToken);
    Alert.alert("Copied", "API token copied to clipboard");
  }

  return (
    <Animated.View
      style={[
        styles.page,
        {
          opacity: entryOpacity,
          transform: [{ translateY: entryTranslateY }],
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Devices</Text>
          <Text style={styles.subtitle}>{user?.full_name || "User"}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.scanButton} onPress={() => navigation.navigate("BLEScan")}>
            <Text style={styles.scanText}>Scan BLE</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.createBox}>
        <Text style={styles.createTitle}>Add device</Text>
        <TextInput
          style={styles.input}
          value={deviceCode}
          onChangeText={setDeviceCode}
          placeholder="Device code (e.g. BV-ESP32-01)"
          placeholderTextColor="#8aa0b8"
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="Device name"
          placeholderTextColor="#8aa0b8"
        />
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Location (optional)"
          placeholderTextColor="#8aa0b8"
        />
        <Pressable style={styles.primaryButton} onPress={handleCreateDevice} disabled={creating}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create Device</Text>}
        </Pressable>
        {newToken ? <Text style={styles.meta}>New token created. Open dialog to copy.</Text> : null}
        {newToken ? (
          <Pressable style={styles.showTokenButton} onPress={() => setTokenDialogOpen(true)}>
            <Text style={styles.showTokenButtonText}>Show API Token</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("DeviceDashboard", { device: item })}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}
            >
              <DeviceCard item={item} onDelete={handleDeleteDevice} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No devices yet</Text>}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Modal transparent visible={tokenDialogOpen} animationType="fade" onRequestClose={() => setTokenDialogOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New API Token</Text>
            <Text style={styles.modalSubtitle}>Save this token and use it in BLE provisioning.</Text>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenValue} selectable>
                {newToken}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.copyTokenButton} onPress={handleCopyToken}>
                <Text style={styles.copyTokenButtonText}>Copy Token</Text>
              </Pressable>
              <Pressable style={styles.closeDialogButton} onPress={() => setTokenDialogOpen(false)}>
                <Text style={styles.closeDialogButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f4f8ff",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a3047",
  },
  subtitle: {
    color: "#4f6982",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#eef4ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButton: {
    backgroundColor: "#0f62fe",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanText: {
    color: "#fff",
    fontWeight: "700",
  },
  logoutText: {
    color: "#0f62fe",
    fontWeight: "700",
  },
  createBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    padding: 14,
    marginBottom: 10,
  },
  createTitle: {
    fontWeight: "700",
    color: "#1d3551",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4dde7",
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#1a3047",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: "#0f62fe",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  tokenBox: {
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff6de",
    borderWidth: 1,
    borderColor: "#f1d17b",
  },
  tokenLabel: {
    color: "#5a4212",
    fontWeight: "600",
    marginBottom: 4,
  },
  tokenValue: {
    color: "#6f510a",
    fontFamily: "monospace",
    fontSize: 12,
  },
  copyTokenButton: {
    marginTop: 10,
    backgroundColor: "#f7e7b5",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9cb6b",
  },
  copyTokenButtonText: {
    color: "#5a4212",
    fontWeight: "700",
    fontSize: 13,
  },
  showTokenButton: {
    marginTop: 8,
    backgroundColor: "#edf4ff",
    borderWidth: 1,
    borderColor: "#c8daf9",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  showTokenButtonText: {
    color: "#0f62fe",
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13,23,36,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    padding: 14,
  },
  modalTitle: {
    color: "#1a3047",
    fontWeight: "700",
    fontSize: 18,
  },
  modalSubtitle: {
    color: "#4f6982",
    marginTop: 4,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  closeDialogButton: {
    backgroundColor: "#eef4ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeDialogButtonText: {
    color: "#0f62fe",
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17324d",
  },
  statusBadge: {
    fontWeight: "700",
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0a6f2f",
  },
  statusOnline: {
    color: "#0a6f2f",
    backgroundColor: "#dcfbe8",
  },
  statusOffline: {
    color: "#7a2323",
    backgroundColor: "#ffe3e3",
  },
  meta: {
    color: "#4d6480",
    marginTop: 1,
  },
  deleteButton: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffe3e3",
  },
  deleteButtonText: {
    color: "#a61d1d",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    color: "#a61d1d",
    marginBottom: 8,
  },
  empty: {
    marginTop: 18,
    textAlign: "center",
    color: "#4d6480",
  },
  loading: {
    marginTop: 24,
  },
});
