-- FitTrack MySQL schema
-- Run this in MySQL Workbench: File → Open SQL Script → Execute (lightning icon).

CREATE DATABASE IF NOT EXISTS fittrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fittrack;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  calorie_goal INT NOT NULL DEFAULT 2200,
  weight_goal_kg DECIMAL(5, 2) NULL
);

CREATE TABLE IF NOT EXISTS food_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  calories INT NOT NULL,
  unit ENUM('g', 'piece') NOT NULL DEFAULT 'piece',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS food_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  food_item_id INT NULL,
  name VARCHAR(120) NOT NULL,
  calories INT NOT NULL,
  meal ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  eaten_on DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  calories_burned INT NOT NULL,
  done_on DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  weight_kg DECIMAL(5, 2) NOT NULL,
  logged_on DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meal_sets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meal_set_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meal_set_id INT NOT NULL,
  food_item_id INT NOT NULL,
  amount DECIMAL(8, 2) NOT NULL,
  FOREIGN KEY (meal_set_id) REFERENCES meal_sets(id) ON DELETE CASCADE,
  FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workout_set_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workout_set_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  calories_burned INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_set_id) REFERENCES workout_sets(id) ON DELETE CASCADE
);

-- Existing databases created before the MVP: add unit if missing.
SET @unit_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'fittrack' AND TABLE_NAME = 'food_items' AND COLUMN_NAME = 'unit'
);
SET @unit_sql := IF(
  @unit_exists = 0,
  'ALTER TABLE food_items ADD COLUMN unit ENUM(''g'', ''piece'') NOT NULL DEFAULT ''piece''',
  'SELECT 1'
);
PREPARE unit_stmt FROM @unit_sql;
EXECUTE unit_stmt;
DEALLOCATE PREPARE unit_stmt;

INSERT INTO users (id, name, calorie_goal, weight_goal_kg)
SELECT 1, 'Habib', 2200, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);

INSERT INTO food_items (user_id, name, calories, unit)
SELECT 1, 'Banana', 89, 'piece' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Banana');

INSERT INTO food_items (user_id, name, calories, unit)
SELECT 1, 'Oatmeal', 370, 'g' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Oatmeal');

INSERT INTO food_items (user_id, name, calories, unit)
SELECT 1, 'Chicken breast', 165, 'g' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name IN ('Chicken breast', 'Chicken breast 100g'));

INSERT INTO food_items (user_id, name, calories, unit)
SELECT 1, 'Apple', 95, 'piece' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Apple');

INSERT INTO food_items (user_id, name, calories, unit)
SELECT 1, 'Egg', 78, 'piece' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Egg');

UPDATE food_items SET unit = 'g', name = 'Chicken breast' WHERE name = 'Chicken breast 100g' AND user_id = 1;
UPDATE food_items SET unit = 'g' WHERE name = 'Oatmeal' AND user_id = 1 AND unit = 'piece';

INSERT INTO meal_sets (user_id, name)
SELECT 1, 'Morning bowl' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM meal_sets WHERE user_id = 1 AND name = 'Morning bowl');

INSERT INTO meal_set_lines (meal_set_id, food_item_id, amount)
SELECT ms.id, fi.id, 50
FROM meal_sets ms
JOIN food_items fi ON fi.user_id = 1 AND fi.name = 'Oatmeal'
WHERE ms.user_id = 1 AND ms.name = 'Morning bowl'
  AND NOT EXISTS (
    SELECT 1 FROM meal_set_lines l
    WHERE l.meal_set_id = ms.id AND l.food_item_id = fi.id
  );

INSERT INTO meal_set_lines (meal_set_id, food_item_id, amount)
SELECT ms.id, fi.id, 1
FROM meal_sets ms
JOIN food_items fi ON fi.user_id = 1 AND fi.name = 'Banana'
WHERE ms.user_id = 1 AND ms.name = 'Morning bowl'
  AND NOT EXISTS (
    SELECT 1 FROM meal_set_lines l
    WHERE l.meal_set_id = ms.id AND l.food_item_id = fi.id
  );

INSERT INTO workout_sets (user_id, name)
SELECT 1, 'Push A' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM workout_sets WHERE user_id = 1 AND name = 'Push A');

INSERT INTO workout_set_lines (workout_set_id, name, calories_burned, sort_order)
SELECT ws.id, 'Bench press', 0, 1
FROM workout_sets ws
WHERE ws.user_id = 1 AND ws.name = 'Push A'
  AND NOT EXISTS (
    SELECT 1 FROM workout_set_lines l
    WHERE l.workout_set_id = ws.id AND l.name = 'Bench press'
  );

INSERT INTO workout_set_lines (workout_set_id, name, calories_burned, sort_order)
SELECT ws.id, 'Overhead press', 0, 2
FROM workout_sets ws
WHERE ws.user_id = 1 AND ws.name = 'Push A'
  AND NOT EXISTS (
    SELECT 1 FROM workout_set_lines l
    WHERE l.workout_set_id = ws.id AND l.name = 'Overhead press'
  );

INSERT INTO workout_set_lines (workout_set_id, name, calories_burned, sort_order)
SELECT ws.id, 'Walk 20 min', 80, 3
FROM workout_sets ws
WHERE ws.user_id = 1 AND ws.name = 'Push A'
  AND NOT EXISTS (
    SELECT 1 FROM workout_set_lines l
    WHERE l.workout_set_id = ws.id AND l.name = 'Walk 20 min'
  );
