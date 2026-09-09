export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Unit = "g" | "piece";

export type FoodEntry = {
  id: number;
  name: string;
  calories: number;
  meal: Meal;
  eatenOn: string;
  foodItemId: number | null;
};

export type Exercise = {
  id: number;
  name: string;
  caloriesBurned: number;
  doneOn: string;
};

export type TodayResponse = {
  date: string;
  calorieGoal: number;
  foodCalories: number;
  exerciseCalories: number;
  remaining: number;
  meals: Record<Meal, FoodEntry[]>;
  exercises: Exercise[];
};

export type HistoryDay = {
  date: string;
  calorieGoal: number;
  foodCalories: number;
  exerciseCalories: number;
  remaining: number;
};

export type FoodItem = {
  id: number;
  name: string;
  calories: number;
  unit: Unit;
};

export type CatalogFood = {
  name: string;
  calories: number;
  unit: "g";
  source: "usda" | "openfoodfacts";
  sourceId: string;
};

export type MealSetLine = {
  id: number;
  foodItemId: number;
  name: string;
  amount: number;
  unit: Unit;
  calories: number;
  lineKcal: number;
};

export type MealSet = {
  id: number;
  name: string;
  calories: number;
  lines: MealSetLine[];
};

export type WorkoutSetLine = {
  id: number;
  name: string;
  caloriesBurned: number;
  sortOrder: number;
};

export type WorkoutSet = {
  id: number;
  name: string;
  caloriesBurned: number;
  lines: WorkoutSetLine[];
};

export type User = {
  id: number;
  name: string;
  calorieGoal: number;
  weightGoalKg: number | null;
};

export type WeightLog = {
  id: number;
  weightKg: number;
  loggedOn: string;
};
