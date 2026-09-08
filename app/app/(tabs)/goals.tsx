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
import { colors } from "@/lib/theme";
import type { WeightLog } from "@/lib/types";

export default function GoalsScreen() {
  const [calorieGoal, setCalorieGoal] = useState("2200");
  const [weightGoal, setWeightGoal] = useState("");
  const [weightNow, setWeightNow] = useState("");
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [user, weight] = await Promise.all([api.user(), api.weightLogs()]);
      setCalorieGoal(String(user.calorieGoal));
      setWeightGoal(user.weightGoalKg == null ? "" : String(user.weightGoalKg));
      setLogs(weight.logs);
    } catch (err) {
      Alert.alert("Could not load goals", err instanceof Error ? err.message : "Try again.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function saveGoals() {
    const kcal = Number(calorieGoal);
    const kg = weightGoal.trim() === "" ? null : Number(weightGoal);
    if (!Number.isInteger(kcal) || kcal < 800 || kcal > 6000) {
      Alert.alert("Check calorie goal", "Use a whole number between 800 and 6000.");
      return;
    }
    if (kg != null && !(kg > 30 && kg < 300)) {
      Alert.alert("Check weight goal", "Use kg, for example 78.5.");
      return;
    }
    setBusy(true);
    try {
      await api.saveUser({ calorieGoal: kcal, weightGoalKg: kg });
      Alert.alert("Saved", "Your goals are updated.");
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logWeight() {
    const kg = Number(weightNow);
    if (!(kg > 30 && kg < 300)) {
      Alert.alert("Check weight", "Use kg, for example 78.4.");
      return;
    }
    setBusy(true);
    try {
      await api.addWeight(kg);
      setWeightNow("");
      await load();
    } catch (err) {
      Alert.alert("Could not save weight", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Daily calorie goal</Text>
        <TextInput
          value={calorieGoal}
          onChangeText={setCalorieGoal}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Weight goal (kg)</Text>
        <TextInput
          value={weightGoal}
          onChangeText={setWeightGoal}
          placeholder="optional"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Pressable style={[styles.save, busy && { opacity: 0.6 }]} onPress={saveGoals} disabled={busy}>
          <Text style={styles.saveText}>Save goals</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Log weight</Text>
        <TextInput
          value={weightNow}
          onChangeText={setWeightNow}
          placeholder="78.4"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Pressable style={[styles.secondary, busy && { opacity: 0.6 }]} onPress={logWeight} disabled={busy}>
          <Text style={styles.secondaryText}>Add weigh-in</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Recent weigh-ins</Text>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No weight logs yet</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.row}>
              <Text style={styles.rowName}>{log.loggedOn}</Text>
              <Text style={styles.rowKcal}>{log.weightKg} kg</Text>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  label: { color: colors.muted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  save: { marginTop: 20, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: colors.accent, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  empty: { color: colors.muted },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowName: { color: colors.text },
  rowKcal: { color: colors.muted, fontWeight: "600" },
});
