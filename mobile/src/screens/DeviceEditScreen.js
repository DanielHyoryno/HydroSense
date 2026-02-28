import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { updateDeviceApi } from "../services/api";

export default function DeviceEditScreen({ route, navigation }) {
  const { device } = route.params;
  const { token } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [deviceName, setDeviceName] = useState(device.device_name || "");
  const [installLocation, setInstallLocation] = useState(device.install_location || "");

  async function handleSave() {
    setError("");
    setSuccessMsg("");

    const trimmedName = deviceName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Device name must be at least 2 characters");
      return;
    }

    setSaving(true);

    try {
      const body = {
        device_name: trimmedName,
        install_location: installLocation.trim() || null,
      };

      await updateDeviceApi(token, device.id, body);
      setSuccessMsg("Device updated successfully");
      setTimeout(() => navigation.goBack(), 1200);
    } catch (err) {
      setError(err.message || "Failed to update device");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Device</Text>
      <Text style={styles.subtitle}>
        Update the name or installation location of your device.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Device Code</Text>
          <Text style={styles.infoValue}>{device.device_code}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="e.g. Kitchen Faucet"
            placeholderTextColor="#9db0c4"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Install Location</Text>
          <TextInput
            style={styles.input}
            value={installLocation}
            onChangeText={setInstallLocation}
            placeholder="e.g. Building A, 2nd Floor"
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
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f4f8ff",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#183654",
    marginBottom: 6,
  },
  subtitle: {
    color: "#55708a",
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe6f5",
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2fa",
  },
  infoLabel: {
    color: "#4d6480",
    fontWeight: "600",
  },
  infoValue: {
    color: "#1d3551",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    color: "#1d3551",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe6f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#183654",
    backgroundColor: "#fcfdff",
  },
  button: {
    backgroundColor: "#0f62fe",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: "#8daee6",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: "#a61d1d",
    marginBottom: 16,
    backgroundColor: "#ffe6e6",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  success: {
    color: "#1d803e",
    marginBottom: 16,
    backgroundColor: "#e6ffed",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
});
