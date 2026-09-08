export type Unit = "g" | "piece";

export function lineCalories(calories: number, unit: Unit, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  if (unit === "g") {
    return Math.round((calories * amount) / 100);
  }
  return Math.round(calories * amount);
}

export function unitLabel(unit: Unit): string {
  return unit === "g" ? "kcal / 100 g" : "kcal / piece";
}
