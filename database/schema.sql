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

INSERT INTO users (id, name, calorie_goal, weight_goal_kg)
SELECT 1, 'Habib', 2200, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);

INSERT INTO food_items (user_id, name, calories)
SELECT 1, 'Banana', 89 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Banana');

INSERT INTO food_items (user_id, name, calories)
SELECT 1, 'Oatmeal', 320 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Oatmeal');

INSERT INTO food_items (user_id, name, calories)
SELECT 1, 'Chicken breast 100g', 165 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Chicken breast 100g');

INSERT INTO food_items (user_id, name, calories)
SELECT 1, 'Apple', 95 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Apple');

INSERT INTO food_items (user_id, name, calories)
SELECT 1, 'Egg', 78 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE user_id = 1 AND name = 'Egg');
