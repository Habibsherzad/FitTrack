import type { FoodItem, HistoryDay, Meal, TodayResponse, User, WeightLog } from "./types";

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
  addFoodItem: (name: string, calories: number) =>
    request<{ id: number }>("/api/food-items", {
      method: "POST",
      body: JSON.stringify({ name, calories }),
    }),
  deleteFoodItem: (id: number) =>
    request<{ ok: boolean }>(`/api/food-items/${id}`, { method: "DELETE" }),
  addFood: (payload: { name: string; calories: number; meal: Meal; eatenOn?: string; foodItemId?: number }) =>
    request<{ id: number }>("/api/food-entries", {
      method: "POST",
      body: JSON.stringify({ ...payload, eatenOn: payload.eatenOn || localDate() }),
    }),
  deleteFood: (id: number) =>
    request<{ ok: boolean }>(`/api/food-entries/${id}`, { method: "DELETE" }),
  addExercise: (payload: { name: string; caloriesBurned: number; doneOn?: string }) =>
    request<{ id: number }>("/api/exercises", {
      method: "POST",
      body: JSON.stringify({ ...payload, doneOn: payload.doneOn || localDate() }),
    }),
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
