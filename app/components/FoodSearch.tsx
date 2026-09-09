import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { CatalogFood, FoodItem } from "@/lib/types";

type Props = {
  products: FoodItem[];
  disabled?: boolean;
  onImported: (item: FoodItem) => void;
};

function sourceLabel(source: CatalogFood["source"]): string {
  return source === "usda" ? "USDA" : "Barcode";
}

export default function FoodSearch({ products, disabled, onImported }: Props) {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<CatalogFood[]>([]);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Search", "Type at least 2 letters.");
      return;
    }
    setBusy(true);
    try {
      const data = await api.searchFoods(q);
      setResults(data.results);
      if (data.results.length === 0) {
        Alert.alert("No matches", "Try an English ingredient name, or scan a barcode.");
      }
    } catch (err) {
      Alert.alert("Search failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function importFood(food: CatalogFood) {
    const existing = products.find((item) => item.name.toLowerCase() === food.name.toLowerCase());
    if (existing) {
      onImported(existing);
      Alert.alert("Already in library", `${existing.name} is selected.`);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.addFoodItem(food.name, food.calories, "g");
      onImported({ id: saved.id, name: food.name, calories: food.calories, unit: "g" });
    } catch (err) {
      Alert.alert("Could not add", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupCode(raw: string) {
    const code = raw.replace(/\D/g, "");
    if (!/^\d{8,14}$/.test(code)) {
      Alert.alert("Barcode", "Need an 8–14 digit barcode.");
      return;
    }
    setBusy(true);
    try {
      const data = await api.lookupBarcode(code);
      setResults([data.item]);
      setBarcode(code);
    } catch (err) {
      Alert.alert("Barcode lookup failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function openScanner() {
    const current = permission?.granted ? permission : await requestPermission();
    if (!current?.granted) {
      Alert.alert("Camera", "Allow camera access to scan barcodes, or type the numbers.");
      return;
    }
    setScanned(false);
    setScannerOpen(true);
  }

  const locked = Boolean(disabled || busy);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Look up a food</Text>
      <Text style={styles.hint}>Search USDA ingredients, or scan a packaged barcode.</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Banana, chicken breast, rice"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={search}
        editable={!locked}
      />
      <Pressable style={[styles.secondary, locked && styles.dim]} onPress={search} disabled={locked}>
        <Text style={styles.secondaryText}>{busy ? "Searching…" : "Search USDA"}</Text>
      </Pressable>

      <Text style={styles.label}>Barcode</Text>
      <View style={styles.row}>
        <TextInput
          value={barcode}
          onChangeText={setBarcode}
          placeholder="4012345678901"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={[styles.input, styles.flex]}
          editable={!locked}
          onSubmitEditing={() => lookupCode(barcode)}
        />
        <Pressable style={[styles.smallBtn, locked && styles.dim]} onPress={() => lookupCode(barcode)} disabled={locked}>
          <Text style={styles.smallBtnText}>Look up</Text>
        </Pressable>
        {Platform.OS !== "web" ? (
          <Pressable style={[styles.smallBtn, locked && styles.dim]} onPress={openScanner} disabled={locked}>
            <Text style={styles.smallBtnText}>Scan</Text>
          </Pressable>
        ) : null}
      </View>

      {results.map((item) => (
        <View key={`${item.source}-${item.sourceId}`} style={styles.result}>
          <View style={styles.flex}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.calories} / 100 g · {sourceLabel(item.source)}
            </Text>
          </View>
          <Pressable style={[styles.addBtn, locked && styles.dim]} onPress={() => importFood(item)} disabled={locked}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      ))}

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={
              scanned
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    setScannerOpen(false);
                    lookupCode(data);
                  }
            }
          />
          <Text style={styles.scannerHint}>Point at the barcode</Text>
          <Pressable style={styles.closeScan} onPress={() => setScannerOpen(false)}>
            <Text style={styles.closeScanText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  label: { color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: colors.accent, fontWeight: "700" },
  smallBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  smallBtnText: { color: colors.accent, fontWeight: "700" },
  result: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowName: { color: colors.text, fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  addBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: colors.bg, fontWeight: "800" },
  dim: { opacity: 0.6 },
  scanner: { flex: 1, backgroundColor: "#000", justifyContent: "flex-end" },
  scannerHint: {
    color: colors.white,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "700",
  },
  closeScan: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  closeScanText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
});
