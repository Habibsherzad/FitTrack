export type CatalogFood = {
  name: string;
  calories: number;
  unit: "g";
  source: "usda" | "openfoodfacts";
  sourceId: string;
};

const USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const OFF_USER_AGENT = "FitTrack/1.0 (personal calorie tracker)";
const NAME_MAX = 120;

type UsdaNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
  foodNutrients?: UsdaNutrient[];
};

function usdaApiKey(): string {
  const key = process.env.USDA_API_KEY?.trim();
  return key || "DEMO_KEY";
}

function clipName(value: string): string {
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length <= NAME_MAX) {
    return name;
  }
  return name.slice(0, NAME_MAX - 1).trimEnd();
}

function asKcal(value: unknown): number | null {
  const calories = Math.round(Number(value));
  if (!Number.isInteger(calories) || calories < 1 || calories > 5000) {
    return null;
  }
  return calories;
}

function kcalFromUsda(nutrients: UsdaNutrient[] | undefined): number | null {
  if (!nutrients?.length) {
    return null;
  }
  for (const nutrient of nutrients) {
    const unit = String(nutrient.unitName || "").toUpperCase();
    const isKcal =
      nutrient.nutrientId === 1008 ||
      nutrient.nutrientNumber === "208" ||
      (String(nutrient.nutrientName).toLowerCase() === "energy" && unit === "KCAL");
    if (isKcal && unit !== "KJ") {
      const kcal = asKcal(nutrient.value);
      if (kcal) {
        return kcal;
      }
    }
  }
  const kj = nutrients.find((nutrient) => nutrient.nutrientId === 1062 || String(nutrient.unitName).toUpperCase() === "KJ");
  if (kj) {
    return asKcal(Number(kj.value) / 4.184);
  }
  return null;
}

function kcalFromOff(nutriments: Record<string, unknown> | undefined): number | null {
  if (!nutriments) {
    return null;
  }
  const direct = asKcal(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"]);
  if (direct) {
    return direct;
  }
  const kj = Number(nutriments["energy-kj_100g"] ?? nutriments.energy_100g);
  if (Number.isFinite(kj) && kj > 0) {
    return asKcal(kj / 4.184);
  }
  return null;
}

const PROCESSED =
  /\b(babyfood|snacks?|dehydrated|powder|overripe|breaded|tenders?|deli|roll|sliced|fat-free|honey|glazed|mesquite|prepackaged|oven-roasted|flavor)\b/;

function usdaRank(food: UsdaFood, query: string): number {
  const description = String(food.description || "").toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  if (food.dataType === "Foundation") {
    score += 120;
  } else if (food.dataType === "SR Legacy") {
    score += 40;
  }
  const words = q.split(/\s+/).filter(Boolean);
  score += words.filter((word) => description.includes(word)).length * 25;
  if (description === q || description === `${q}, raw`) {
    score += 80;
  }
  if (description.startsWith(q)) {
    score += 30;
  }
  if (/^[a-z ,]+, raw$/.test(description)) {
    score += 35;
  }
  if (/\braw\b/.test(description)) {
    score += 20;
  }
  if (/\bmeat only\b/.test(description)) {
    score += 25;
  }
  if (PROCESSED.test(description) && !PROCESSED.test(q)) {
    score -= 60;
  }
  score -= Math.min(description.length, 100) * 0.15;
  return score;
}

async function fetchJson(url: string, headers: Record<string, string> = {}, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Lookup failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function searchUsda(query: string): Promise<CatalogFood[]> {
  const params = new URLSearchParams({
    api_key: usdaApiKey(),
    query,
    pageSize: "25",
    dataType: "Foundation,SR Legacy",
  });
  const payload = (await fetchJson(`${USDA_URL}?${params.toString()}`)) as { foods?: UsdaFood[] };
  const foods = [...(payload.foods ?? [])].sort((a, b) => usdaRank(b, query) - usdaRank(a, query));
  const results: CatalogFood[] = [];
  const seen = new Set<string>();
  for (const food of foods) {
    const name = clipName(String(food.description || ""));
    const calories = kcalFromUsda(food.foodNutrients);
    const sourceId = String(food.fdcId || "");
    if (!name || !calories || !sourceId || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    results.push({ name, calories, unit: "g", source: "usda", sourceId });
    if (results.length >= 8) {
      break;
    }
  }
  return results;
}

function mapOffProduct(product: Record<string, unknown>, code: string): CatalogFood | null {
  const calories = kcalFromOff(product.nutriments as Record<string, unknown> | undefined);
  const baseName = clipName(
    String(product.product_name || product.product_name_en || product.generic_name || "").trim(),
  );
  if (!calories || !baseName) {
    return null;
  }
  const brand = String(product.brands || "")
    .split(",")[0]
    .trim();
  const name = brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? clipName(`${baseName} (${brand})`) : baseName;
  return { name, calories, unit: "g", source: "openfoodfacts", sourceId: code };
}

export async function searchCatalog(query: string): Promise<CatalogFood[]> {
  return searchUsda(query);
}

export async function lookupBarcode(rawCode: string): Promise<CatalogFood | null> {
  const code = rawCode.replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(code)) {
    return null;
  }
  const payload = (await fetchJson(`${OFF_PRODUCT_URL}/${code}?fields=product_name,product_name_en,generic_name,brands,nutriments`, {
    "User-Agent": OFF_USER_AGENT,
  })) as { status?: number; product?: Record<string, unknown> };
  if (payload.status !== 1 || !payload.product) {
    return null;
  }
  return mapOffProduct(payload.product, code);
}
