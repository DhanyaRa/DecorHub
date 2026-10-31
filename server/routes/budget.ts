import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateBudgetBreakdown, formatINR } from '../../src/utils/currency';
import { PlacedItem, BudgetPreferences } from '../../src/types';
import { getCatalogItemById, FURNITURE_CATALOG } from '../../src/data/furnitureCatalog';

export const budgetRouter = Router();

const BudgetCalculateSchema = z.object({
  items: z.array(
    z.object({
      instanceId: z.string(),
      itemId: z.string(),
      xCm: z.number().optional().default(0),
      yCm: z.number().optional().default(0),
      rotationDeg: z.number().optional().default(0),
      isOwned: z.boolean().optional().default(false),
      quantity: z.number().int().positive().optional().default(1),
    })
  ),
  budget: z.object({
    totalBudgetINR: z.number().nonnegative(),
    includesFurniture: z.boolean().default(true),
    includesDecor: z.boolean().default(true),
    includesDelivery: z.boolean().default(false),
    includesInstallation: z.boolean().default(false),
    deliveryEstimateINR: z.number().nonnegative().default(3500),
    installationEstimateINR: z.number().nonnegative().default(4500),
  }),
});

// POST /api/budget/calculate - Server-verified budget computation
budgetRouter.post('/calculate', (req: Request, res: Response): void => {
  const parsed = BudgetCalculateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid budget calculation payload', details: parsed.error.format() });
    return;
  }

  const { items, budget } = parsed.data;

  // Verify item IDs against server catalog data (do not trust client prices!)
  const verifiedItems: PlacedItem[] = [];
  const invalidItemIds: string[] = [];

  for (const item of items) {
    const catalogItem = getCatalogItemById(item.itemId);
    if (!catalogItem) {
      invalidItemIds.push(item.itemId);
      continue;
    }
    verifiedItems.push({
      instanceId: item.instanceId,
      itemId: catalogItem.id,
      xCm: item.xCm,
      yCm: item.yCm,
      rotationDeg: item.rotationDeg,
      isOwned: item.isOwned,
      quantity: item.quantity,
    });
  }

  const breakdown = calculateBudgetBreakdown(verifiedItems, budget as BudgetPreferences);

  // Compute cheaper alternatives for items above budget tier
  const cheaperAlternatives: Array<{
    instanceId: string;
    originalId: string;
    originalName: string;
    originalPriceINR: number;
    alternativeId: string;
    alternativeName: string;
    alternativePriceINR: number;
    potentialSavingsINR: number;
  }> = [];

  for (const item of verifiedItems) {
    if (item.isOwned) continue;
    const cat = getCatalogItemById(item.itemId);
    if (!cat || cat.priceTier === 'budget') continue;

    const cheaper = FURNITURE_CATALOG.find(
      (alt) => alt.category === cat.category && alt.priceTier === 'budget' && alt.priceINR < cat.priceINR
    );

    if (cheaper) {
      const qty = item.quantity || 1;
      cheaperAlternatives.push({
        instanceId: item.instanceId,
        originalId: cat.id,
        originalName: cat.name,
        originalPriceINR: cat.priceINR,
        alternativeId: cheaper.id,
        alternativeName: cheaper.name,
        alternativePriceINR: cheaper.priceINR,
        potentialSavingsINR: (cat.priceINR - cheaper.priceINR) * qty,
      });
    }
  }

  res.json({
    breakdown,
    cheaperAlternatives,
    warnings: invalidItemIds.length > 0 ? [`Ignored unrecognized item IDs: ${invalidItemIds.join(', ')}`] : [],
    formatted: {
      grandTotal: formatINR(breakdown.grandTotal),
      totalBudget: formatINR(breakdown.totalBudget),
      remainingBudget: formatINR(breakdown.remainingBudget),
      overBudgetAmount: formatINR(breakdown.overBudgetAmount),
    },
  });
});
