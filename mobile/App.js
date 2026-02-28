import "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import DevicesScreen from "./src/screens/DevicesScreen";
import DeviceDashboardScreen from "./src/screens/DeviceDashboardScreen";
import DeviceEditScreen from "./src/screens/DeviceEditScreen";
import UsageHistoryScreen from "./src/screens/UsageHistoryScreen";
import UsageLimitsScreen from "./src/screens/UsageLimitsScreen";
import BLEScanScreen from "./src/screens/BLEScanScreen";

const Stack = createNativeStackNavigator();

function StartGate({ onStart }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;
  const hintFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
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

    const bgLoopA = Animated.loop(
      Animated.sequence([
        Animated.timing(blobA, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(blobA, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
      ])
    );

    const bgLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(blobB, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(blobB, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
      ])
    );

    bgLoopA.start();
    bgLoopB.start();

    const hintLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintFloat, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(hintFloat, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
      ])
    );

    hintLoop.start();

    return () => {
      loop.stop();
      bgLoopA.stop();
      bgLoopB.stop();
      hintLoop.stop();
    };
  }, [fade, rise, pulse, blobA, blobB, hintFloat]);

  const blobATransform = {
    transform: [
      {
        translateX: blobA.interpolate({
          inputRange: [0, 1],
          outputRange: [-14, 14],
        }),
      },
      {
        translateY: blobA.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -10],
        }),
      },
      {
        scale: blobA.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.04],
        }),
      },
    ],
  };

  const blobBTransform = {
    transform: [
      {
        translateX: blobB.interpolate({
          inputRange: [0, 1],
          outputRange: [16, -12],
        }),
      },
      {
        translateY: blobB.interpolate({
          inputRange: [0, 1],
          outputRange: [-12, 12],
        }),
      },
      {
        scale: blobB.interpolate({
          inputRange: [0, 1],
          outputRange: [1.03, 0.97],
        }),
      },
    ],
  };

  const hintTransform = {
    transform: [
      {
        translateY: hintFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 8],
        }),
      },
    ],
  };

  return (
    <Pressable style={styles.startPage} onPress={onStart}>
      <Animated.View style={[styles.bgBlobA, blobATransform]} />
      <Animated.View style={[styles.bgBlobB, blobBTransform]} />
      <Animated.View style={[styles.bgBlobC, blobATransform]} />
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ translateY: rise }, { scale: pulse }],
          alignItems: "center",
        }}
      >
        <Text style={styles.startTitle}>Water Monitor</Text>
        <Text style={styles.startSubtitle}>IoT Telemetry Dashboard</Text>
      </Animated.View>
      <Animated.View style={[styles.bottomHint, hintTransform]}>
        <Text style={styles.bottomHintText}>Tap anywhere to start</Text>
        <Text style={styles.bottomHintArrow}>↓</Text>
      </Animated.View>
      <StatusBar style="dark" />
    </Pressable>
  );
}

function RootNavigator() {
  const { isBooting, isAuthenticated } = useAuth();

  if (isBooting) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#0f62fe" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator>
          <Stack.Screen name="Devices" component={DevicesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="BLEScan" component={BLEScanScreen} options={{ title: "BLE Provisioning" }} />
          <Stack.Screen
            name="DeviceDashboard"
            component={DeviceDashboardScreen}
            options={{ title: "Device Dashboard" }}
          />
          <Stack.Screen name="DeviceEdit" component={DeviceEditScreen} options={{ title: "Edit Device" }} />
          <Stack.Screen name="UsageHistory" component={UsageHistoryScreen} options={{ title: "Usage History" }} />
          <Stack.Screen
            name="UsageLimits"
            component={UsageLimitsScreen}
            options={{ title: "Usage Limits" }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />
        </Stack.Navigator>
      )}
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <StartGate onStart={() => setStarted(true)} />;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f8ff",
  },
  startPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f8ff",
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  bgBlobA: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 140,
    backgroundColor: "rgba(66, 133, 244, 0.16)",
    top: -70,
    left: -70,
  },
  bgBlobB: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 150,
    backgroundColor: "rgba(15, 98, 254, 0.11)",
    bottom: -90,
    right: -60,
  },
  bgBlobC: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 80,
    backgroundColor: "rgba(41, 121, 255, 0.12)",
    top: 120,
    right: 40,
  },
  startTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#17324d",
    letterSpacing: 0.2,
  },
  startSubtitle: {
    marginTop: 10,
    marginBottom: 30,
    color: "#4f6982",
    fontSize: 15,
  },
  bottomHint: {
    position: "absolute",
    bottom: 34,
    alignItems: "center",
  },
  bottomHintText: {
    color: "#35506d",
    fontWeight: "700",
    fontSize: 13,
  },
  bottomHintArrow: {
    marginTop: 4,
    color: "#0f62fe",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
});
