import cors from "cors";
import express, { type Request, type Response } from "express";
import { lineCalories } from "./calories";
import { pool, USER_ID } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = (typeof MEALS)[number];

function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && MEALS.includes(value as Meal);
}

function todayIso(value?: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/user", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, calorie_goal AS calorieGoal, weight_goal_kg AS weightGoalKg
     FROM users
     WHERE id = :id`,
    { id: USER_ID },
  );
  const user = (rows as Record<string, unknown>[])[0];
  if (!user) {
    res.status(404).json({ error: "User not found. Run npm run db:setup." });
    return;
  }
  res.json({
    ...user,
    calorieGoal: num(user.calorieGoal),
    weightGoalKg: user.weightGoalKg == null ? null : num(user.weightGoalKg),
  });
});

app.put("/api/user", async (req: Request, res: Response) => {
  const calorieGoal = Number(req.body.calorieGoal);
  const weightGoalKg =
    req.body.weightGoalKg === null || req.body.weightGoalKg === ""
      ? null
      : Number(req.body.weightGoalKg);

  if (!Number.isInteger(calorieGoal) || calorieGoal < 800 || calorieGoal > 6000) {
    res.status(400).json({ error: "calorieGoal must be a whole number between 800 and 6000." });
    return;
  }
  if (weightGoalKg != null && !(weightGoalKg > 30 && weightGoalKg < 300)) {
    res.status(400).json({ error: "weightGoalKg looks invalid." });
    return;
  }

  await pool.query(
    `UPDATE users
     SET calorie_goal = :calorieGoal, weight_goal_kg = :weightGoalKg
     WHERE id = :id`,
    { calorieGoal, weightGoalKg, id: USER_ID },
  );
  res.json({ ok: true });
});

app.get("/api/today", async (req, res) => {
  const date = todayIso(req.query.date);

  const [[userRows], [foodRows], [exerciseRows]] = await Promise.all([
    pool.query(
      `SELECT calorie_goal AS calorieGoal FROM users WHERE id = :id`,
      { id: USER_ID },
    ),
    pool.query(
      `SELECT id, name, calories, meal, eaten_on AS eatenOn, food_item_id AS foodItemId
       FROM food_entries
       WHERE user_id = :id AND eaten_on = :date
       ORDER BY id`,
      { id: USER_ID, date },
    ),
    pool.query(
      `SELECT id, name, calories_burned AS caloriesBurned, done_on AS doneOn
       FROM exercises
       WHERE user_id = :id AND done_on = :date
       ORDER BY id`,
      { id: USER_ID, date },
    ),
  ]);

  const user = (userRows as { calorieGoal: number }[])[0];
  if (!user) {
    res.status(404).json({ error: "User not found. Run npm run db:setup." });
    return;
  }

  const foods = (foodRows as Array<Record<string, unknown>>).map((row) => ({
    id: num(row.id),
    name: String(row.name),
    calories: num(row.calories),
    meal: String(row.meal),
    eatenOn: String(row.eatenOn).slice(0, 10),
    foodItemId: row.foodItemId == null ? null : num(row.foodItemId),
  }));
  const exercises = (exerciseRows as Array<Record<string, unknown>>).map((row) => ({
    id: num(row.id),
    name: String(row.name),
    caloriesBurned: num(row.caloriesBurned),
    doneOn: String(row.doneOn).slice(0, 10),
  }));

  const foodCalories = foods.reduce((sum, item) => sum + item.calories, 0);
  const exerciseCalories = exercises.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const calorieGoal = num(user.calorieGoal);

  const meals: Record<string, typeof foods> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const item of foods) {
    if (meals[item.meal]) {
      meals[item.meal].push(item);
    }
  }

  res.json({
    date,
    calorieGoal,
    foodCalories,
    exerciseCalories,
    remaining: calorieGoal + exerciseCalories - foodCalories,
    meals,
    exercises,
  });
});

app.get("/api/history", async (req, res) => {
  const days = Math.min(31, Math.max(1, Number(req.query.days) || 14));
  const [rows] = await pool.query(
    `SELECT
        d.day_date AS date,
        u.calorie_goal AS calorieGoal,
        COALESCE(f.food_calories, 0) AS foodCalories,
        COALESCE(e.exercise_calories, 0) AS exerciseCalories
     FROM (
       SELECT CURDATE() - INTERVAL seq DAY AS day_date
       FROM (
         SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
         UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
         UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
         UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
         UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
         UNION SELECT 30
       ) numbers
     ) d
     JOIN users u ON u.id = :id
     LEFT JOIN (
       SELECT eaten_on, SUM(calories) AS food_calories
       FROM food_entries
       WHERE user_id = :id
       GROUP BY eaten_on
     ) f ON f.eaten_on = d.day_date
     LEFT JOIN (
       SELECT done_on, SUM(calories_burned) AS exercise_calories
       FROM exercises
       WHERE user_id = :id
       GROUP BY done_on
     ) e ON e.done_on = d.day_date
     WHERE d.day_date >= DATE_SUB(CURDATE(), INTERVAL :offset DAY)
     ORDER BY d.day_date DESC`,
    { id: USER_ID, offset: days - 1 },
  );

  const history = (rows as Array<Record<string, unknown>>).map((row) => {
    const calorieGoal = num(row.calorieGoal);
    const foodCalories = num(row.foodCalories);
    const exerciseCalories = num(row.exerciseCalories);
    return {
      date: String(row.date).slice(0, 10),
      calorieGoal,
      foodCalories,
      exerciseCalories,
      remaining: calorieGoal + exerciseCalories - foodCalories,
    };
  });

  res.json({ history });
});

function isUnit(value: unknown): value is "g" | "piece" {
  return value === "g" || value === "piece";
}

function mapProduct(row: Record<string, unknown>) {
  const unit = row.unit === "g" ? "g" : "piece";
  return {
    id: num(row.id),
    name: String(row.name),
    calories: num(row.calories),
    unit,
  };
}

app.get("/api/food-items", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, calories, unit
     FROM food_items
     WHERE user_id = :id
     ORDER BY name`,
    { id: USER_ID },
  );
  res.json({
    items: (rows as Array<Record<string, unknown>>).map(mapProduct),
  });
});

app.post("/api/food-items", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const calories = Number(req.body.calories);
  const unit = isUnit(req.body.unit) ? req.body.unit : "piece";
  if (!name || !Number.isInteger(calories) || calories < 0 || calories > 5000) {
    res.status(400).json({ error: "Need a food name and calories 0–5000." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO food_items (user_id, name, calories, unit)
     VALUES (:userId, :name, :calories, :unit)`,
    { userId: USER_ID, name, calories, unit },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId) });
});

app.put("/api/food-items/:id", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const calories = Number(req.body.calories);
  const unit = isUnit(req.body.unit) ? req.body.unit : "piece";
  if (!name || !Number.isInteger(calories) || calories < 0 || calories > 5000) {
    res.status(400).json({ error: "Need a food name and calories 0–5000." });
    return;
  }
  const [result] = await pool.query(
    `UPDATE food_items
     SET name = :name, calories = :calories, unit = :unit
     WHERE id = :id AND user_id = :userId`,
    { name, calories, unit, id: Number(req.params.id), userId: USER_ID },
  );
  if (Number((result as { affectedRows: number }).affectedRows) === 0) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ ok: true });
});

app.delete("/api/food-items/:id", async (req, res) => {
  await pool.query(
    `DELETE FROM food_items WHERE id = :id AND user_id = :userId`,
    { id: Number(req.params.id), userId: USER_ID },
  );
  res.json({ ok: true });
});

app.post("/api/food-items/:id/log", async (req, res) => {
  const meal = req.body.meal;
  const amount = Number(req.body.amount);
  const eatenOn = todayIso(req.body.eatenOn);
  if (!isMeal(meal) || !(amount > 0)) {
    res.status(400).json({ error: "Need a meal and an amount greater than 0." });
    return;
  }
  const [rows] = await pool.query(
    `SELECT id, name, calories, unit FROM food_items WHERE id = :id AND user_id = :userId`,
    { id: Number(req.params.id), userId: USER_ID },
  );
  const product = (rows as Array<Record<string, unknown>>)[0];
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const unit = product.unit === "g" ? "g" : "piece";
  const calories = lineCalories(num(product.calories), unit, amount);
  const label = unit === "g" ? `${product.name} (${amount} g)` : `${product.name} × ${amount}`;
  const [result] = await pool.query(
    `INSERT INTO food_entries (user_id, food_item_id, name, calories, meal, eaten_on)
     VALUES (:userId, :foodItemId, :name, :calories, :meal, :eatenOn)`,
    {
      userId: USER_ID,
      foodItemId: num(product.id),
      name: label,
      calories,
      meal,
      eatenOn,
    },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId), calories });
});

type MealLineInput = { foodItemId: number; amount: number };

async function loadMealSet(id: number) {
  const [setRows] = await pool.query(
    `SELECT id, name FROM meal_sets WHERE id = :id AND user_id = :userId`,
    { id, userId: USER_ID },
  );
  const mealSet = (setRows as Array<Record<string, unknown>>)[0];
  if (!mealSet) {
    return null;
  }
  const [lineRows] = await pool.query(
    `SELECT l.id, l.food_item_id AS foodItemId, l.amount, fi.name, fi.calories, fi.unit
     FROM meal_set_lines l
     JOIN food_items fi ON fi.id = l.food_item_id
     WHERE l.meal_set_id = :id
     ORDER BY l.id`,
    { id },
  );
  const lines = (lineRows as Array<Record<string, unknown>>).map((row) => {
    const unit = row.unit === "g" ? "g" : "piece";
    const amount = num(row.amount);
    return {
      id: num(row.id),
      foodItemId: num(row.foodItemId),
      name: String(row.name),
      amount,
      unit,
      calories: num(row.calories),
      lineKcal: lineCalories(num(row.calories), unit, amount),
    };
  });
  return {
    id: num(mealSet.id),
    name: String(mealSet.name),
    calories: lines.reduce((sum, line) => sum + line.lineKcal, 0),
    lines,
  };
}

async function replaceMealLines(mealSetId: number, lines: MealLineInput[]) {
  await pool.query(`DELETE FROM meal_set_lines WHERE meal_set_id = :id`, { id: mealSetId });
  for (const line of lines) {
    const amount = Number(line.amount);
    const foodItemId = Number(line.foodItemId);
    if (!foodItemId || !(amount > 0)) {
      continue;
    }
    const [owned] = await pool.query(
      `SELECT id FROM food_items WHERE id = :id AND user_id = :userId`,
      { id: foodItemId, userId: USER_ID },
    );
    if (!(owned as unknown[]).length) {
      continue;
    }
    await pool.query(
      `INSERT INTO meal_set_lines (meal_set_id, food_item_id, amount)
       VALUES (:mealSetId, :foodItemId, :amount)`,
      { mealSetId, foodItemId, amount },
    );
  }
}

app.get("/api/meal-sets", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id FROM meal_sets WHERE user_id = :userId ORDER BY name`,
    { userId: USER_ID },
  );
  const sets = [];
  for (const row of rows as Array<{ id: number }>) {
    const loaded = await loadMealSet(num(row.id));
    if (loaded) {
      sets.push(loaded);
    }
  }
  res.json({ sets });
});

app.post("/api/meal-sets", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const lines = Array.isArray(req.body.lines) ? (req.body.lines as MealLineInput[]) : [];
  if (!name) {
    res.status(400).json({ error: "Need a meal set name." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO meal_sets (user_id, name) VALUES (:userId, :name)`,
    { userId: USER_ID, name },
  );
  const id = Number((result as { insertId: number }).insertId);
  await replaceMealLines(id, lines);
  res.status(201).json(await loadMealSet(id));
});

app.put("/api/meal-sets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await loadMealSet(id);
  if (!existing) {
    res.status(404).json({ error: "Meal set not found." });
    return;
  }
  const name = String(req.body.name || "").trim();
  const lines = Array.isArray(req.body.lines) ? (req.body.lines as MealLineInput[]) : [];
  if (!name) {
    res.status(400).json({ error: "Need a meal set name." });
    return;
  }
  await pool.query(`UPDATE meal_sets SET name = :name WHERE id = :id AND user_id = :userId`, {
    name,
    id,
    userId: USER_ID,
  });
  await replaceMealLines(id, lines);
  res.json(await loadMealSet(id));
});

app.delete("/api/meal-sets/:id", async (req, res) => {
  await pool.query(`DELETE FROM meal_sets WHERE id = :id AND user_id = :userId`, {
    id: Number(req.params.id),
    userId: USER_ID,
  });
  res.json({ ok: true });
});

app.post("/api/meal-sets/:id/log", async (req, res) => {
  const meal = req.body.meal;
  const eatenOn = todayIso(req.body.eatenOn);
  if (!isMeal(meal)) {
    res.status(400).json({ error: "Need breakfast, lunch, dinner, or snack." });
    return;
  }
  const loaded = await loadMealSet(Number(req.params.id));
  if (!loaded) {
    res.status(404).json({ error: "Meal set not found." });
    return;
  }
  if (loaded.lines.length === 0) {
    res.status(400).json({ error: "Add at least one ingredient first." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO food_entries (user_id, food_item_id, name, calories, meal, eaten_on)
     VALUES (:userId, NULL, :name, :calories, :meal, :eatenOn)`,
    { userId: USER_ID, name: loaded.name, calories: loaded.calories, meal, eatenOn },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId), calories: loaded.calories });
});

async function loadWorkoutSet(id: number) {
  const [setRows] = await pool.query(
    `SELECT id, name FROM workout_sets WHERE id = :id AND user_id = :userId`,
    { id, userId: USER_ID },
  );
  const workout = (setRows as Array<Record<string, unknown>>)[0];
  if (!workout) {
    return null;
  }
  const [lineRows] = await pool.query(
    `SELECT id, name, calories_burned AS caloriesBurned, sort_order AS sortOrder
     FROM workout_set_lines
     WHERE workout_set_id = :id
     ORDER BY sort_order, id`,
    { id },
  );
  const lines = (lineRows as Array<Record<string, unknown>>).map((row) => ({
    id: num(row.id),
    name: String(row.name),
    caloriesBurned: num(row.caloriesBurned),
    sortOrder: num(row.sortOrder),
  }));
  return {
    id: num(workout.id),
    name: String(workout.name),
    caloriesBurned: lines.reduce((sum, line) => sum + line.caloriesBurned, 0),
    lines,
  };
}

async function replaceWorkoutLines(
  workoutSetId: number,
  lines: Array<{ name: string; caloriesBurned: number }>,
) {
  await pool.query(`DELETE FROM workout_set_lines WHERE workout_set_id = :id`, { id: workoutSetId });
  let order = 1;
  for (const line of lines) {
    const name = String(line.name || "").trim();
    const caloriesBurned = Number(line.caloriesBurned) || 0;
    if (!name) {
      continue;
    }
    await pool.query(
      `INSERT INTO workout_set_lines (workout_set_id, name, calories_burned, sort_order)
       VALUES (:workoutSetId, :name, :caloriesBurned, :sortOrder)`,
      { workoutSetId, name, caloriesBurned, sortOrder: order },
    );
    order += 1;
  }
}

app.get("/api/workout-sets", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id FROM workout_sets WHERE user_id = :userId ORDER BY name`,
    { userId: USER_ID },
  );
  const sets = [];
  for (const row of rows as Array<{ id: number }>) {
    const loaded = await loadWorkoutSet(num(row.id));
    if (loaded) {
      sets.push(loaded);
    }
  }
  res.json({ sets });
});

app.post("/api/workout-sets", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
  if (!name) {
    res.status(400).json({ error: "Need a training set name." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO workout_sets (user_id, name) VALUES (:userId, :name)`,
    { userId: USER_ID, name },
  );
  const id = Number((result as { insertId: number }).insertId);
  await replaceWorkoutLines(id, lines);
  res.status(201).json(await loadWorkoutSet(id));
});

app.put("/api/workout-sets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await loadWorkoutSet(id);
  if (!existing) {
    res.status(404).json({ error: "Training set not found." });
    return;
  }
  const name = String(req.body.name || "").trim();
  const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
  if (!name) {
    res.status(400).json({ error: "Need a training set name." });
    return;
  }
  await pool.query(`UPDATE workout_sets SET name = :name WHERE id = :id AND user_id = :userId`, {
    name,
    id,
    userId: USER_ID,
  });
  await replaceWorkoutLines(id, lines);
  res.json(await loadWorkoutSet(id));
});

app.delete("/api/workout-sets/:id", async (req, res) => {
  await pool.query(`DELETE FROM workout_sets WHERE id = :id AND user_id = :userId`, {
    id: Number(req.params.id),
    userId: USER_ID,
  });
  res.json({ ok: true });
});

app.post("/api/workout-sets/:id/log", async (req, res) => {
  const doneOn = todayIso(req.body.doneOn);
  const loaded = await loadWorkoutSet(Number(req.params.id));
  if (!loaded) {
    res.status(404).json({ error: "Training set not found." });
    return;
  }
  if (loaded.lines.length === 0) {
    res.status(400).json({ error: "Add at least one exercise first." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO exercises (user_id, name, calories_burned, done_on)
     VALUES (:userId, :name, :caloriesBurned, :doneOn)`,
    { userId: USER_ID, name: loaded.name, caloriesBurned: loaded.caloriesBurned, doneOn },
  );
  res.status(201).json({
    id: Number((result as { insertId: number }).insertId),
    caloriesBurned: loaded.caloriesBurned,
  });
});

app.post("/api/food-entries", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const calories = Number(req.body.calories);
  const meal = req.body.meal;
  const eatenOn = todayIso(req.body.eatenOn);
  const foodItemId = req.body.foodItemId ? Number(req.body.foodItemId) : null;

  if (!name || !Number.isInteger(calories) || calories < 0 || calories > 5000 || !isMeal(meal)) {
    res.status(400).json({ error: "Need name, calories, and a meal (breakfast/lunch/dinner/snack)." });
    return;
  }

  const [result] = await pool.query(
    `INSERT INTO food_entries (user_id, food_item_id, name, calories, meal, eaten_on)
     VALUES (:userId, :foodItemId, :name, :calories, :meal, :eatenOn)`,
    { userId: USER_ID, foodItemId, name, calories, meal, eatenOn },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId) });
});

app.delete("/api/food-entries/:id", async (req, res) => {
  await pool.query(
    `DELETE FROM food_entries WHERE id = :id AND user_id = :userId`,
    { id: Number(req.params.id), userId: USER_ID },
  );
  res.json({ ok: true });
});

app.post("/api/exercises", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const caloriesBurned = Number(req.body.caloriesBurned);
  const doneOn = todayIso(req.body.doneOn);

  if (!name || !Number.isInteger(caloriesBurned) || caloriesBurned < 0 || caloriesBurned > 5000) {
    res.status(400).json({ error: "Need an exercise name and calories burned 0–5000." });
    return;
  }

  const [result] = await pool.query(
    `INSERT INTO exercises (user_id, name, calories_burned, done_on)
     VALUES (:userId, :name, :caloriesBurned, :doneOn)`,
    { userId: USER_ID, name, caloriesBurned, doneOn },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId) });
});

app.delete("/api/exercises/:id", async (req, res) => {
  await pool.query(
    `DELETE FROM exercises WHERE id = :id AND user_id = :userId`,
    { id: Number(req.params.id), userId: USER_ID },
  );
  res.json({ ok: true });
});

app.get("/api/weight-logs", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, weight_kg AS weightKg, logged_on AS loggedOn
     FROM weight_logs
     WHERE user_id = :id
     ORDER BY logged_on DESC, id DESC
     LIMIT 30`,
    { id: USER_ID },
  );
  res.json({
    logs: (rows as Array<Record<string, unknown>>).map((row) => ({
      id: num(row.id),
      weightKg: num(row.weightKg),
      loggedOn: String(row.loggedOn).slice(0, 10),
    })),
  });
});

app.post("/api/weight-logs", async (req, res) => {
  const weightKg = Number(req.body.weightKg);
  const loggedOn = todayIso(req.body.loggedOn);
  if (!(weightKg > 30 && weightKg < 300)) {
    res.status(400).json({ error: "weightKg looks invalid." });
    return;
  }
  const [result] = await pool.query(
    `INSERT INTO weight_logs (user_id, weight_kg, logged_on)
     VALUES (:userId, :weightKg, :loggedOn)`,
    { userId: USER_ID, weightKg, loggedOn },
  );
  res.status(201).json({ id: Number((result as { insertId: number }).insertId) });
});

app.use((error: unknown, _req: Request, res: Response, _next: (err?: unknown) => void) => {
  console.error(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "ECONNREFUSED" || code === "ER_BAD_DB_ERROR" || code === "ER_ACCESS_DENIED_ERROR") {
    res.status(500).json({
      error: "MySQL is not ready. Put your password in server/.env and run npm run db:setup.",
    });
    return;
  }
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`FitTrack server: http://localhost:${port}`);
  console.log("Phone on the same Wi-Fi: http://YOUR-PC-IP:3000");
});
