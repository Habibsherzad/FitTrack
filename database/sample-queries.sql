-- Practice SQL in Workbench after you log meals or sessions in the app.
USE fittrack;

-- Products (kcal is per 100 g, or per piece)
SELECT name, calories, unit FROM food_items WHERE user_id = 1 ORDER BY name;

-- Meal sets with ingredients and line calories
SELECT
  ms.name AS meal_set,
  fi.name AS product,
  l.amount,
  fi.unit,
  CASE
    WHEN fi.unit = 'g' THEN ROUND(fi.calories * l.amount / 100)
    ELSE ROUND(fi.calories * l.amount)
  END AS line_kcal
FROM meal_sets ms
JOIN meal_set_lines l ON l.meal_set_id = ms.id
JOIN food_items fi ON fi.id = l.food_item_id
WHERE ms.user_id = 1
ORDER BY ms.name, l.id;

-- What did I eat today? (snapshots — stay the same if you edit a recipe later)
SELECT meal, name, calories
FROM food_entries
WHERE eaten_on = CURDATE()
ORDER BY meal, id;

-- Training sets
SELECT ws.name AS workout, l.name AS exercise, l.calories_burned
FROM workout_sets ws
JOIN workout_set_lines l ON l.workout_set_id = ws.id
WHERE ws.user_id = 1
ORDER BY ws.name, l.sort_order;

-- Calories left today
SELECT
  u.calorie_goal
    - COALESCE((
        SELECT SUM(calories) FROM food_entries
        WHERE user_id = u.id AND eaten_on = CURDATE()
      ), 0)
    + COALESCE((
        SELECT SUM(calories_burned) FROM exercises
        WHERE user_id = u.id AND done_on = CURDATE()
      ), 0) AS remaining
FROM users u
WHERE u.id = 1;
