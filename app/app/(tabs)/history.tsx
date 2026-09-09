import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { HistoryDay } from "@/lib/types";

function prettyDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryScreen() {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await api.history();
      setDays(result.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>Last 14 days. Remaining = goal + exercise − food.</Text>
      {days.map((day) => {
        const used = Math.max(0, day.calorieGoal + day.exerciseCalories - day.remaining);
        const progress = Math.min(1, used / Math.max(day.calorieGoal, 1));
        const over = day.remaining < 0;
        return (
          <Pressable key={day.date} style={styles.card} onPress={() => router.push("/")}>
            <View style={styles.cardTop}>
              <Text style={styles.date}>{prettyDate(day.date)}</Text>
              <Text style={[styles.remaining, over && { color: colors.warn }]}>
                {day.remaining} left
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: over ? colors.warn : colors.accent },
                ]}
              />
            </View>
            <Text style={styles.meta}>
              {day.foodCalories} eaten · {day.exerciseCalories} burned · goal {day.calorieGoal}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  lead: { color: colors.muted, marginBottom: 16, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.text, fontWeight: "700", fontSize: 16 },
  remaining: { color: colors.accent, fontWeight: "700" },
  barTrack: { height: 8, backgroundColor: colors.line, borderRadius: 99, overflow: "hidden", marginTop: 12 },
  barFill: { height: 8, borderRadius: 99 },
  meta: { color: colors.muted, marginTop: 10, fontSize: 12 },
  error: { color: colors.muted, textAlign: "center" },
  retry: { marginTop: 16, backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: colors.bg, fontWeight: "700" },
});
