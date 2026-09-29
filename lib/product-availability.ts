export type StockIngredient = {
  id: string;
  name: string;
  current_stock: number | null;
  unit?: string | null;
  yield_unit?: string | null;
  yield_quantity?: number | null;
};

export type RecipePart = { ingredient_id: string; quantity: number };

export type IngredientShortage = {
  name: string;
  available: number;
  required: number;
  unit: string;
};

export function formatIngredientShortages(shortages: IngredientShortage[]) {
  return shortages.map(({ name }) => name).join(', ');
}

export function calculateRecipeAvailability(
  recipe: RecipePart[] | null | undefined,
  ingredients: ReadonlyMap<string, StockIngredient>,
) {
  if (!recipe?.length) return null;

  // The sale function sums usage by ingredient, including repeated recipe rows.
  const requiredByIngredient = new Map<string, number>();
  for (const part of recipe) {
    requiredByIngredient.set(
      part.ingredient_id,
      (requiredByIngredient.get(part.ingredient_id) ?? 0) + Number(part.quantity),
    );
  }

  const requirements = [...requiredByIngredient].map(([id, required]) => {
    const ingredient = ingredients.get(id) ?? null;
    const available = Number(ingredient?.current_stock ?? 0);
    // Database stock and recipe quantities have two decimal places. Work in
    // hundredths so a value such as 0.3 / 0.1 does not round down to 2.
    const availableHundredths = Math.round(available * 100);
    const requiredHundredths = Math.round(required * 100);
    const portions = requiredHundredths > 0
      ? Math.max(0, Math.floor(availableHundredths / requiredHundredths)) : 0;
    return {
      ingredient,
      portions,
      name: ingredient?.name || 'Bahan resep tidak ditemukan',
      available,
      required,
      unit: ingredient?.yield_unit || ingredient?.unit || 'unit',
    };
  });

  const limiting = requirements.reduce((minimum, current) =>
    current.portions < minimum.portions ? current : minimum);
  const shortages: IngredientShortage[] = requirements
    .filter(requirement => requirement.portions === 0)
    .map(({ name, available, required, unit }) => ({ name, available, required, unit }));

  return { maxStock: limiting.portions, limiting, shortages };
}
