import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api, API_URL } from "@/lib/api";
import { colors, mealLabels } from "@/lib/theme";
import type { Meal, TodayResponse } from "@/lib/types";

const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.today());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load today.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function removeFood(id: number) {
    await api.deleteFood(id);
    load();
  }

  async function removeExercise(id: number) {
    await api.deleteExercise(id);
    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Server not reached</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>API: {API_URL}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const used = Math.max(0, data.calorieGoal + data.exerciseCalories - data.remaining);
  const progress = Math.min(1, used / Math.max(data.calorieGoal, 1));
  const over = data.remaining < 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
      }
    >
      <Text style={styles.kicker}>{data.date}</Text>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{over ? "Over goal" : "Calories left"}</Text>
        <Text style={[styles.heroValue, over && styles.over]}>{data.remaining}</Text>
        <Text style={styles.heroUnit}>kcal</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: over ? colors.warn : colors.accent },
            ]}
          />
        </View>
        <View style={styles.stats}>
          <Stat label="Eaten" value={data.foodCalories} />
          <Stat label="Burned" value={data.exerciseCalories} />
          <Stat label="Goal" value={data.calorieGoal} />
        </View>
      </View>

      {MEAL_ORDER.map((meal) => (
        <View key={meal} style={styles.section}>
          <Text style={styles.sectionTitle}>{mealLabels[meal]}</Text>
          {data.meals[meal].length === 0 ? (
            <Text style={styles.empty}>Nothing logged yet</Text>
          ) : (
            data.meals[meal].map((item) => (
              <Pressable
                key={item.id}
                style={styles.row}
                onLongPress={() =>
                  Alert.alert("Delete this meal?", item.name, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => removeFood(item.id) },
                  ])
                }
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowKcal}>{item.calories} kcal</Text>
              </Pressable>
            ))
          )}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercise</Text>
        {data.exercises.length === 0 ? (
          <Text style={styles.empty}>No workouts today</Text>
        ) : (
          data.exercises.map((item) => (
            <Pressable
              key={item.id}
              style={styles.row}
              onLongPress={() =>
                Alert.alert("Delete this exercise?", item.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => removeExercise(item.id) },
                ])
              }
            >
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={[styles.rowKcal, { color: colors.accent }]}>-{item.caloriesBurned} kcal</Text>
            </Pressable>
          ))
        )}
      </View>
      <Text style={styles.hint}>Long-press a row to delete it.</Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  kicker: { color: colors.muted, fontSize: 13, marginBottom: 12, letterSpacing: 0.4 },
  hero: { backgroundColor: colors.card, borderRadius: 24, padding: 22, marginBottom: 20 },
  heroLabel: { color: colors.muted, fontSize: 14 },
  heroValue: { color: colors.text, fontSize: 56, fontWeight: "800", marginTop: 4 },
  heroUnit: { color: colors.muted, marginTop: -6, marginBottom: 16 },
  over: { color: colors.warn },
  barTrack: { height: 10, backgroundColor: colors.line, borderRadius: 99, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 99 },
  stats: { flexDirection: "row", marginTop: 18, justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  statLabel: { color: colors.muted, marginTop: 2, fontSize: 12 },
  section: { marginBottom: 18 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  empty: { color: colors.muted, backgroundColor: colors.cardSoft, padding: 14, borderRadius: 14 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowName: { color: colors.text, fontSize: 16, flex: 1, marginRight: 12 },
  rowKcal: { color: colors.muted, fontWeight: "600" },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 8 },
  errorText: { color: colors.muted, textAlign: "center", lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8 },
  retry: { marginTop: 16, backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: colors.bg, fontWeight: "700" },
});
