# FitTrack

Personal calorie tracker. Phone app (Expo) talks to a small server, which talks to MySQL with plain SQL.

```
Phone (Expo)  →  Server (Express)  →  MySQL
```

Remaining calories = daily goal + exercise burned − food eaten.

## First-time setup

### 1. MySQL password

Open `server/.env` and replace `replace-with-your-password` with your MySQL root password.

Do not commit this file.

### 2. Create the database

**Option A — MySQL Workbench (good for learning SQL)**

1. Open MySQL Workbench and connect locally.
2. File → Open SQL Script → `database/schema.sql`
3. Click the lightning bolt to run it.
4. Refresh the schemas list. You should see `users`, `food_items`, `food_entries`, `exercises`, `weight_logs`, `meal_sets`, `meal_set_lines`, `workout_sets`, `workout_set_lines`.

**Option B — command line**

```powershell
cd server
npm install
npm run db:setup
```

### 3. Phone API address

The phone cannot use `localhost`. It needs your PC’s Wi-Fi address.

Open `app/.env` and set:

```
EXPO_PUBLIC_API_URL=http://YOUR-PC-IP:3000
```

This PC currently has several IPs. Home Wi-Fi is often `192.168.178.75`. If the app cannot connect, try `192.168.20.203` instead.

Phone and PC must be on the same Wi-Fi.

## Run

Terminal 1 — server:

```powershell
cd server
npm install
npm run dev
```

You should see: `FitTrack server: http://localhost:3000`

Terminal 2 — phone app:

```powershell
cd app
npm start
```

Open **Expo Go** and scan the QR code.

## Check that SQL is real

1. In **Library**, open **Meals**, tap **Morning bowl**, log it to breakfast.
2. In Workbench, run `database/sample-queries.sql`.
3. The same meal should appear in `food_entries`. Editing the recipe later does not change that row.

## Project layout

- `app/` — Expo screens: Today, Library, History, Goals
- `server/` — Express + TypeScript, plain SQL in `src/index.ts`
- `database/` — MySQL schema and practice queries
