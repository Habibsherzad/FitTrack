import type {
  FoodItem,
  HistoryDay,
  Meal,
  MealSet,
  TodayResponse,
  Unit,
  User,
  WeightLog,
  WorkoutSet,
} from "./types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.178.75:3000";

export function localDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error(
      `Cannot reach the server at ${API_URL}. Is the server running, and is the phone on the same Wi-Fi?`,
    );
  }

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  today: (date = localDate()) => request<TodayResponse>(`/api/today?date=${date}`),
  history: () => request<{ history: HistoryDay[] }>("/api/history?days=14"),
  foodItems: () => request<{ items: FoodItem[] }>("/api/food-items"),
  addFoodItem: (name: string, calories: number, unit: Unit) =>
    request<{ id: number }>("/api/food-items", {
      method: "POST",
      body: JSON.stringify({ name, calories, unit }),
    }),
  updateFoodItem: (id: number, name: string, calories: number, unit: Unit) =>
    request<{ ok: boolean }>(`/api/food-items/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, calories, unit }),
    }),
  deleteFoodItem: (id: number) =>
    request<{ ok: boolean }>(`/api/food-items/${id}`, { method: "DELETE" }),
  logProduct: (id: number, meal: Meal, amount: number) =>
    request<{ id: number; calories: number }>(`/api/food-items/${id}/log`, {
      method: "POST",
      body: JSON.stringify({ meal, amount, eatenOn: localDate() }),
    }),
  mealSets: () => request<{ sets: MealSet[] }>("/api/meal-sets"),
  saveMealSet: (
    payload: { name: string; lines: Array<{ foodItemId: number; amount: number }> },
    id?: number,
  ) =>
    request<MealSet>(id ? `/api/meal-sets/${id}` : "/api/meal-sets", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteMealSet: (id: number) =>
    request<{ ok: boolean }>(`/api/meal-sets/${id}`, { method: "DELETE" }),
  logMealSet: (id: number, meal: Meal) =>
    request<{ id: number; calories: number }>(`/api/meal-sets/${id}/log`, {
      method: "POST",
      body: JSON.stringify({ meal, eatenOn: localDate() }),
    }),
  workoutSets: () => request<{ sets: WorkoutSet[] }>("/api/workout-sets"),
  saveWorkoutSet: (
    payload: { name: string; lines: Array<{ name: string; caloriesBurned: number }> },
    id?: number,
  ) =>
    request<WorkoutSet>(id ? `/api/workout-sets/${id}` : "/api/workout-sets", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteWorkoutSet: (id: number) =>
    request<{ ok: boolean }>(`/api/workout-sets/${id}`, { method: "DELETE" }),
  logWorkoutSet: (id: number) =>
    request<{ id: number; caloriesBurned: number }>(`/api/workout-sets/${id}/log`, {
      method: "POST",
      body: JSON.stringify({ doneOn: localDate() }),
    }),
  deleteFood: (id: number) =>
    request<{ ok: boolean }>(`/api/food-entries/${id}`, { method: "DELETE" }),
  deleteExercise: (id: number) =>
    request<{ ok: boolean }>(`/api/exercises/${id}`, { method: "DELETE" }),
  user: () => request<User>("/api/user"),
  saveUser: (payload: { calorieGoal: number; weightGoalKg: number | null }) =>
    request<{ ok: boolean }>("/api/user", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  weightLogs: () => request<{ logs: WeightLog[] }>("/api/weight-logs"),
  addWeight: (weightKg: number, loggedOn = localDate()) =>
    request<{ id: number }>("/api/weight-logs", {
      method: "POST",
      body: JSON.stringify({ weightKg, loggedOn }),
    }),
};
