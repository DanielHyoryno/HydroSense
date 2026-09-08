import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

export default function SectionAccordion({ title, defaultExpanded = false, children }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const spin = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

    function toggle() {
        const next = !expanded;
        setExpanded(next);
        Animated.timing(spin, {
            toValue: next ? 1 : 0,
            duration: 220,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start();
    }

    const rotate = spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "90deg"],
    });

    return (
        <View style={styles.wrap}>
            <Pressable style={({ pressed }) => [styles.header, pressed && styles.headerPressed]} onPress={toggle}
                accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded }}>
                <Text style={styles.title}>{title}</Text>
                <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>›</Animated.Text>
            </Pressable>
            {expanded ? <View style={styles.body}>{children}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#dbe6f5",
        marginBottom: 14,
        overflow: "hidden",
    },
    header: {
        minHeight: 48,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#f7faff",
    },
    headerPressed: {
        opacity: 0.88,
    },
    title: {
        flex: 1,
        marginRight: 10,
        color: "#1d3551",
        fontWeight: "700",
        fontSize: 15,
    },
    chevron: {
        color: "#35506d",
        fontWeight: "700",
        fontSize: 16,
        lineHeight: 16,
    },
    body: {
        padding: 10,
        backgroundColor: "#fff",
    },
});
