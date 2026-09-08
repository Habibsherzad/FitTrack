-- Practice SQL in Workbench after you add food in the app.
USE fittrack;

-- What did I eat today?
SELECT meal, name, calories
FROM food_entries
WHERE eaten_on = CURDATE()
ORDER BY meal, id;

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

-- Saved foods
SELECT name, calories FROM food_items WHERE user_id = 1 ORDER BY name;
