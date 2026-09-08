export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

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
