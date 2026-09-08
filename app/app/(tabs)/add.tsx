import { useCallback, useMemo, useState } from "react";
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
import { lineCalories, unitLabel } from "@/lib/calories";
import { colors, mealLabels } from "@/lib/theme";
import type { FoodItem, Meal, MealSet, Unit, WorkoutSet } from "@/lib/types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
type LibraryMode = "products" | "meals" | "training";

export default function AddScreen() {
  const [mode, setMode] = useState<LibraryMode>("products");
  const [products, setProducts] = useState<FoodItem[]>([]);
  const [mealSets, setMealSets] = useState<MealSet[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [busy, setBusy] = useState(false);

  const [productId, setProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productKcal, setProductKcal] = useState("");
  const [productUnit, setProductUnit] = useState<Unit>("piece");
  const [logMeal, setLogMeal] = useState<Meal>("breakfast");
  const [logAmount, setLogAmount] = useState("1");

  const [mealId, setMealId] = useState<number | null>(null);
  const [mealName, setMealName] = useState("");
  const [mealLines, setMealLines] = useState<Array<{ foodItemId: number; amount: string }>>([]);
  const [pickProductId, setPickProductId] = useState<number | null>(null);

  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutLines, setWorkoutLines] = useState<Array<{ name: string; caloriesBurned: string }>>([
    { name: "", caloriesBurned: "0" },
  ]);

  const load = useCallback(async () => {
    try {
      const [food, meals, workouts] = await Promise.all([api.foodItems(), api.mealSets(), api.workoutSets()]);
      setProducts(food.items);
      setMealSets(meals.sets);
      setWorkoutSets(workouts.sets);
      setPickProductId((current) => current ?? food.items[0]?.id ?? null);
    } catch (err) {
      Alert.alert("Could not load library", err instanceof Error ? err.message : "Try again.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const mealPreview = useMemo(() => {
    return mealLines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.foodItemId);
      if (!product) {
        return sum;
      }
      return sum + lineCalories(product.calories, product.unit, Number(line.amount));
    }, 0);
  }, [mealLines, products]);

  function resetProductForm() {
    setProductId(null);
    setProductName("");
    setProductKcal("");
    setProductUnit("piece");
    setLogAmount("1");
  }

  function resetMealForm() {
    setMealId(null);
    setMealName("");
    setMealLines([]);
  }

  function resetWorkoutForm() {
    setWorkoutId(null);
    setWorkoutName("");
    setWorkoutLines([{ name: "", caloriesBurned: "0" }]);
  }

  async function saveProduct() {
    const kcal = Number(productKcal);
    if (!productName.trim() || !Number.isInteger(kcal) || kcal < 0) {
      Alert.alert("Check the product", "Need a name and whole-number calories.");
      return;
    }
    setBusy(true);
    try {
      if (productId) {
        await api.updateFoodItem(productId, productName.trim(), kcal, productUnit);
      } else {
        await api.addFoodItem(productName.trim(), kcal, productUnit);
      }
      resetProductForm();
      await load();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logSelectedProduct() {
    if (!productId) {
      Alert.alert("Pick a product", "Tap a product in the list first.");
      return;
    }
    const amount = Number(logAmount);
    if (!(amount > 0)) {
      Alert.alert("Check amount", "Use grams or pieces, greater than 0.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.logProduct(productId, logMeal, amount);
      Alert.alert("Logged", `${result.calories} kcal added to ${mealLabels[logMeal]}.`);
    } catch (err) {
      Alert.alert("Could not log", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMeal() {
    if (!mealName.trim() || mealLines.length === 0) {
      Alert.alert("Check the meal", "Need a name and at least one ingredient.");
      return;
    }
    setBusy(true);
    try {
      await api.saveMealSet(
        {
          name: mealName.trim(),
          lines: mealLines
            .map((line) => ({ foodItemId: line.foodItemId, amount: Number(line.amount) }))
            .filter((line) => line.foodItemId && line.amount > 0),
        },
        mealId ?? undefined,
      );
      resetMealForm();
      await load();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logSelectedMeal() {
    if (!mealId) {
      Alert.alert("Pick a meal", "Tap a saved meal first, or save this one.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.logMealSet(mealId, logMeal);
      Alert.alert("Logged", `${result.calories} kcal added to ${mealLabels[logMeal]}.`);
    } catch (err) {
      Alert.alert("Could not log", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveWorkout() {
    const lines = workoutLines
      .map((line) => ({ name: line.name.trim(), caloriesBurned: Number(line.caloriesBurned) || 0 }))
      .filter((line) => line.name);
    if (!workoutName.trim() || lines.length === 0) {
      Alert.alert("Check the set", "Need a name and at least one exercise.");
      return;
    }
    setBusy(true);
    try {
      await api.saveWorkoutSet({ name: workoutName.trim(), lines }, workoutId ?? undefined);
      resetWorkoutForm();
      await load();
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logSelectedWorkout() {
    if (!workoutId) {
      Alert.alert("Pick a set", "Tap a saved training set first, or save this one.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.logWorkoutSet(workoutId);
      Alert.alert("Logged", `${result.caloriesBurned} kcal burned added to today.`);
    } catch (err) {
      Alert.alert("Could not log", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.switchRow}>
          {([
            ["products", "Products"],
            ["meals", "Meals"],
            ["training", "Training"],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.switchBtn, mode === key && styles.switchOn]}
              onPress={() => setMode(key)}
            >
              <Text style={[styles.switchText, mode === key && styles.switchTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.mealRow}>
          {MEALS.map((item) => (
            <Pressable key={item} style={[styles.chip, logMeal === item && styles.chipOn]} onPress={() => setLogMeal(item)}>
              <Text style={[styles.chipText, logMeal === item && styles.chipTextOn]}>{mealLabels[item]}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "products" ? (
          <>
            <Text style={styles.label}>Product name</Text>
            <TextInput value={productName} onChangeText={setProductName} placeholder="Egg" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.label}>{unitLabel(productUnit)}</Text>
            <TextInput value={productKcal} onChangeText={setProductKcal} placeholder="78" placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.input} />
            <View style={styles.mealRow}>
              <Pressable style={[styles.chip, productUnit === "piece" && styles.chipOn]} onPress={() => setProductUnit("piece")}>
                <Text style={[styles.chipText, productUnit === "piece" && styles.chipTextOn]}>Per piece</Text>
              </Pressable>
              <Pressable style={[styles.chip, productUnit === "g" && styles.chipOn]} onPress={() => setProductUnit("g")}>
                <Text style={[styles.chipText, productUnit === "g" && styles.chipTextOn]}>Per 100 g</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.save, busy && styles.dim]} onPress={saveProduct} disabled={busy}>
              <Text style={styles.saveText}>{productId ? "Update product" : "Save product"}</Text>
            </Pressable>
            {productId ? (
              <Pressable style={styles.secondary} onPress={resetProductForm}>
                <Text style={styles.secondaryText}>New product</Text>
              </Pressable>
            ) : null}

            <Text style={styles.label}>Amount to log ({productUnit === "g" ? "grams" : "pieces"})</Text>
            <TextInput value={logAmount} onChangeText={setLogAmount} keyboardType="decimal-pad" style={styles.input} />
            <Pressable style={[styles.secondary, busy && styles.dim]} onPress={logSelectedProduct} disabled={busy}>
              <Text style={styles.secondaryText}>Log to {mealLabels[logMeal]}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Your products</Text>
            {products.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.saved, productId === item.id && styles.savedOn]}
                onPress={() => {
                  setProductId(item.id);
                  setProductName(item.name);
                  setProductKcal(String(item.calories));
                  setProductUnit(item.unit);
                  setLogAmount(item.unit === "g" ? "100" : "1");
                }}
                onLongPress={() =>
                  Alert.alert("Delete product?", item.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        await api.deleteFoodItem(item.id);
                        if (productId === item.id) {
                          resetProductForm();
                        }
                        load();
                      },
                    },
                  ])
                }
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowKcal}>
                  {item.calories} {item.unit === "g" ? "/ 100 g" : "/ pc"}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.hint}>Tap to edit or log. Long-press to delete.</Text>
          </>
        ) : null}

        {mode === "meals" ? (
          <>
            <Text style={styles.label}>Meal set name</Text>
            <TextInput value={mealName} onChangeText={setMealName} placeholder="Morning bowl" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.preview}>{mealPreview} kcal with current ingredients</Text>

            {mealLines.map((line, index) => {
              const product = products.find((item) => item.id === line.foodItemId);
              return (
                <View key={`${line.foodItemId}-${index}`} style={styles.lineCard}>
                  <Text style={styles.rowName}>{product?.name ?? "Product"}</Text>
                  <TextInput
                    value={line.amount}
                    onChangeText={(value) => {
                      const next = [...mealLines];
                      next[index] = { ...next[index], amount: value };
                      setMealLines(next);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.smallInput}
                  />
                  <Text style={styles.rowKcal}>{product?.unit === "g" ? "g" : "pc"}</Text>
                  <Pressable onPress={() => setMealLines(mealLines.filter((_, i) => i !== index))}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              );
            })}

            <View style={styles.lineCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {products.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.chip, pickProductId === item.id && styles.chipOn]}
                    onPress={() => setPickProductId(item.id)}
                  >
                    <Text style={[styles.chipText, pickProductId === item.id && styles.chipTextOn]}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                if (!pickProductId) {
                  Alert.alert("Add a product first", "Create a product, then add it here.");
                  return;
                }
                const product = products.find((item) => item.id === pickProductId);
                setMealLines([
                  ...mealLines,
                  { foodItemId: pickProductId, amount: product?.unit === "g" ? "50" : "1" },
                ]);
              }}
            >
              <Text style={styles.secondaryText}>Add ingredient</Text>
            </Pressable>

            <Pressable style={[styles.save, busy && styles.dim]} onPress={saveMeal} disabled={busy}>
              <Text style={styles.saveText}>{mealId ? "Update meal set" : "Save meal set"}</Text>
            </Pressable>
            <Pressable style={[styles.secondary, busy && styles.dim]} onPress={logSelectedMeal} disabled={busy}>
              <Text style={styles.secondaryText}>Log set to {mealLabels[logMeal]}</Text>
            </Pressable>
            {mealId ? (
              <Pressable style={styles.secondary} onPress={resetMealForm}>
                <Text style={styles.secondaryText}>New meal set</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Saved meals</Text>
            {mealSets.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.saved, mealId === item.id && styles.savedOn]}
                onPress={() => {
                  setMealId(item.id);
                  setMealName(item.name);
                  setMealLines(item.lines.map((line) => ({ foodItemId: line.foodItemId, amount: String(line.amount) })));
                }}
                onLongPress={() =>
                  Alert.alert("Delete meal set?", item.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        await api.deleteMealSet(item.id);
                        if (mealId === item.id) {
                          resetMealForm();
                        }
                        load();
                      },
                    },
                  ])
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.meta}>{item.lines.map((line) => line.name).join(", ") || "No ingredients"}</Text>
                </View>
                <Text style={styles.rowKcal}>{item.calories} kcal</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {mode === "training" ? (
          <>
            <Text style={styles.label}>Training set name</Text>
            <TextInput value={workoutName} onChangeText={setWorkoutName} placeholder="Push A" placeholderTextColor={colors.muted} style={styles.input} />
            {workoutLines.map((line, index) => (
              <View key={index} style={styles.lineCard}>
                <TextInput
                  value={line.name}
                  onChangeText={(value) => {
                    const next = [...workoutLines];
                    next[index] = { ...next[index], name: value };
                    setWorkoutLines(next);
                  }}
                  placeholder="Bench press"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                />
                <TextInput
                  value={line.caloriesBurned}
                  onChangeText={(value) => {
                    const next = [...workoutLines];
                    next[index] = { ...next[index], caloriesBurned: value };
                    setWorkoutLines(next);
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  style={styles.smallInput}
                />
                <Text style={styles.rowKcal}>kcal</Text>
              </View>
            ))}
            <Pressable
              style={styles.secondary}
              onPress={() => setWorkoutLines([...workoutLines, { name: "", caloriesBurned: "0" }])}
            >
              <Text style={styles.secondaryText}>Add exercise</Text>
            </Pressable>
            <Pressable style={[styles.save, busy && styles.dim]} onPress={saveWorkout} disabled={busy}>
              <Text style={styles.saveText}>{workoutId ? "Update training set" : "Save training set"}</Text>
            </Pressable>
            <Pressable style={[styles.secondary, busy && styles.dim]} onPress={logSelectedWorkout} disabled={busy}>
              <Text style={styles.secondaryText}>Log set to today</Text>
            </Pressable>
            {workoutId ? (
              <Pressable style={styles.secondary} onPress={resetWorkoutForm}>
                <Text style={styles.secondaryText}>New training set</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Saved training sets</Text>
            {workoutSets.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.saved, workoutId === item.id && styles.savedOn]}
                onPress={() => {
                  setWorkoutId(item.id);
                  setWorkoutName(item.name);
                  setWorkoutLines(
                    item.lines.map((line) => ({ name: line.name, caloriesBurned: String(line.caloriesBurned) })),
                  );
                }}
                onLongPress={() =>
                  Alert.alert("Delete training set?", item.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        await api.deleteWorkoutSet(item.id);
                        if (workoutId === item.id) {
                          resetWorkoutForm();
                        }
                        load();
                      },
                    },
                  ])
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.meta}>{item.lines.map((line) => line.name).join(", ")}</Text>
                </View>
                <Text style={styles.rowKcal}>-{item.caloriesBurned} kcal</Text>
              </Pressable>
            ))}
            <Text style={styles.hint}>Burn kcal can be 0. Editing a set does not change days you already logged.</Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  switchRow: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 16, padding: 4, marginBottom: 16 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  switchOn: { backgroundColor: colors.accent },
  switchText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  switchTextOn: { color: colors.bg },
  mealRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
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
    marginBottom: 8,
  },
  smallInput: {
    backgroundColor: colors.cardSoft,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 64,
    textAlign: "center",
  },
  save: { marginTop: 8, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
  secondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: colors.accent, fontWeight: "700" },
  dim: { opacity: 0.6 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  saved: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  savedOn: { borderWidth: 1, borderColor: colors.accent },
  rowName: { color: colors.text, fontSize: 16, flex: 1 },
  rowKcal: { color: colors.muted, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  preview: { color: colors.accent, fontWeight: "700", marginBottom: 12 },
  lineCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  remove: { color: colors.warn, fontWeight: "700", fontSize: 12 },
});
