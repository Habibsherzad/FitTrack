import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { colors, mealLabels } from "@/lib/theme";
import type { FoodItem, Meal } from "@/lib/types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default function AddScreen() {
  const [mode, setMode] = useState<"food" | "exercise">("food");
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const result = await api.foodItems();
      setItems(result.items);
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  async function submit() {
    const kcal = Number(calories);
    if (!name.trim() || !Number.isInteger(kcal) || kcal < 0) {
      Alert.alert("Check the form", "Enter a name and whole-number calories.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "food") {
        let foodItemId: number | undefined;
        if (saveForLater) {
          const saved = await api.addFoodItem(name.trim(), kcal);
          foodItemId = saved.id;
        }
        await api.addFood({ name: name.trim(), calories: kcal, meal, foodItemId });
      } else {
        await api.addExercise({ name: name.trim(), caloriesBurned: kcal });
      }
      setName("");
      setCalories("");
      setSaveForLater(false);
      await loadItems();
      Alert.alert("Saved", mode === "food" ? "Meal added to today." : "Exercise added to today.");
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.switchRow}>
          <Pressable style={[styles.switchBtn, mode === "food" && styles.switchOn]} onPress={() => setMode("food")}>
            <Text style={[styles.switchText, mode === "food" && styles.switchTextOn]}>Food</Text>
          </Pressable>
          <Pressable
            style={[styles.switchBtn, mode === "exercise" && styles.switchOn]}
            onPress={() => setMode("exercise")}
          >
            <Text style={[styles.switchText, mode === "exercise" && styles.switchTextOn]}>Exercise</Text>
          </Pressable>
        </View>

        {mode === "food" ? (
          <View style={styles.mealRow}>
            {MEALS.map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, meal === item && styles.chipOn]}
                onPress={() => setMeal(item)}
              >
                <Text style={[styles.chipText, meal === item && styles.chipTextOn]}>{mealLabels[item]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>{mode === "food" ? "Food name" : "Workout name"}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={mode === "food" ? "Oatmeal" : "Walk 40 min"}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{mode === "food" ? "Calories" : "Calories burned"}</Text>
        <TextInput
          value={calories}
          onChangeText={setCalories}
          placeholder="320"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={styles.input}
        />

        {mode === "food" ? (
          <Pressable style={styles.checkRow} onPress={() => setSaveForLater((value) => !value)}>
            <View style={[styles.checkbox, saveForLater && styles.checkboxOn]} />
            <Text style={styles.checkText}>Also save this food for next time</Text>
          </Pressable>
        ) : null}

        <Pressable style={[styles.save, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </Pressable>

        {mode === "food" ? (
          <View style={{ marginTop: 28 }}>
            <Text style={styles.sectionTitle}>Saved foods</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>No saved foods yet</Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.saved}
                  onPress={() => {
                    setName(item.name);
                    setCalories(String(item.calories));
                  }}
                  onLongPress={() =>
                    Alert.alert("Remove saved food?", item.name, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          await api.deleteFoodItem(item.id);
                          loadItems();
                        },
                      },
                    ])
                  }
                >
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowKcal}>{item.calories} kcal</Text>
                </Pressable>
              ))
            )}
            <Text style={styles.hint}>Tap to fill the form. Long-press to delete a saved food.</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  switchRow: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 16, padding: 4, marginBottom: 16 },
  switchBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  switchOn: { backgroundColor: colors.accent },
  switchText: { color: colors.muted, fontWeight: "700" },
  switchTextOn: { color: colors.bg },
  mealRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  chipOn: { backgroundColor: colors.accentDim },
  chipText: { color: colors.muted, fontWeight: "600" },
  chipTextOn: { color: colors.accent },
  label: { color: colors.muted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkText: { color: colors.text, flex: 1 },
  save: { marginTop: 20, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  empty: { color: colors.muted },
  saved: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowName: { color: colors.text, fontSize: 16 },
  rowKcal: { color: colors.muted, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
