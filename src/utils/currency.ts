/**
 * DecorHub Currency & Budget Calculation Utilities
 *
 * Implements strict separation between:
 * A. Existing furniture (owned) - ₹0 sourcing cost, tracked as retained asset
 * B. Selected purchase items - core Bill of Materials contributing to budget
 * C. AI suggestions - optional recommendations that do NOT affect purchase subtotals
 */

import { BudgetPreferences, PlacedItem } from '../types';
import { getCatalogItemById } from '../data/furnitureCatalog';

/**
 * Formats a number to Indian Rupee currency string, e.g. ₹12,500
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rounded);
}

export interface ItemizedSummaryRow {
  instanceId: string;
  itemId: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  isOwned: boolean;
  isDecor: boolean;
  isSuggested: boolean;
  status: 'selected' | 'owned' | 'suggested' | 'purchased';
  priceEstimated: boolean;
  priceUnavailable: boolean;
  purchaseUrl?: string;
  retailerName?: string;
}

export interface BudgetBreakdown {
  furnitureSubtotal: number;
  decorSubtotal: number;
  ownedSavings: number;
  deliveryCost: number;
  installationCost: number;
  grandTotal: number;
  totalBudget: number;
  remainingBudget: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  percentUsed: number;
  categoryTotals: Record<string, number>;
  selectedItemsCount: number;
  ownedItemsCount: number;
  suggestedItemsCount: number;
  itemizedSummary: ItemizedSummaryRow[];
  selectedPurchases: ItemizedSummaryRow[];
  ownedItems: ItemizedSummaryRow[];
  suggestedItems: ItemizedSummaryRow[];
}

export function calculateBudgetBreakdown(
  items: PlacedItem[],
  budgetPrefs: BudgetPreferences
): BudgetBreakdown {
  let furnitureSubtotal = 0;
  let decorSubtotal = 0;
  let ownedSavings = 0;
  const categoryTotals: Record<string, number> = {};
  const itemizedSummary: ItemizedSummaryRow[] = [];

  for (const placed of items) {
    const catalogItem = getCatalogItemById(placed.itemId);
    if (!catalogItem) continue;

    const qty = placed.quantity && placed.quantity > 0 ? placed.quantity : 1;
    const unitPrice = catalogItem.priceINR || 0;
    const itemTotal = unitPrice * qty;

    const isOwned = Boolean(placed.isOwned);
    const isSuggested = Boolean(placed.isSuggested && !placed.isOwned);
    const isSelected = !isOwned && !isSuggested;

    const status: ItemizedSummaryRow['status'] = isOwned
      ? 'owned'
      : isSuggested
      ? 'suggested'
      : 'selected';

    if (isOwned) {
      // Collection A: Retained asset, savings vs buying new
      ownedSavings += itemTotal;
    } else if (isSelected) {
      // Collection B: Explicitly selected purchase items
      if (catalogItem.isDecor) {
        decorSubtotal += itemTotal;
      } else {
        furnitureSubtotal += itemTotal;
      }
      categoryTotals[catalogItem.category] = (categoryTotals[catalogItem.category] || 0) + itemTotal;
    }
    // Collection C (isSuggested) does NOT contribute to subtotal, decor, or grand total

    itemizedSummary.push({
      instanceId: placed.instanceId,
      itemId: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      unitPrice,
      quantity: qty,
      totalPrice: itemTotal,
      isOwned,
      isDecor: Boolean(catalogItem.isDecor),
      isSuggested,
      status,
      priceEstimated: !catalogItem.isVerified,
      priceUnavailable: unitPrice <= 0,
      purchaseUrl: catalogItem.purchaseUrl,
      retailerName: catalogItem.retailerName,
    });
  }

  // Delivery & Installation: included only when selected purchase items exist or explicitly enabled
  const selectedPurchases = itemizedSummary.filter((i) => i.status === 'selected');
  const ownedItems = itemizedSummary.filter((i) => i.status === 'owned');
  const suggestedItems = itemizedSummary.filter((i) => i.status === 'suggested');

  const hasPurchases = selectedPurchases.length > 0;
  const deliveryCost = hasPurchases && budgetPrefs.includesDelivery ? (budgetPrefs.deliveryEstimateINR || 3500) : 0;
  const installationCost = hasPurchases && budgetPrefs.includesInstallation ? (budgetPrefs.installationEstimateINR || 4500) : 0;

  const grandTotal = furnitureSubtotal + decorSubtotal + deliveryCost + installationCost;
  const totalBudget = budgetPrefs.totalBudgetINR || 0;
  const remainingBudget = totalBudget - grandTotal;
  const isOverBudget = grandTotal > totalBudget;
  const overBudgetAmount = Math.max(0, grandTotal - totalBudget);
  const percentUsed = totalBudget > 0 ? Math.round((grandTotal / totalBudget) * 100) : 0;

  return {
    furnitureSubtotal,
    decorSubtotal,
    ownedSavings,
    deliveryCost,
    installationCost,
    grandTotal,
    totalBudget,
    remainingBudget,
    isOverBudget,
    overBudgetAmount,
    percentUsed,
    categoryTotals,
    selectedItemsCount: selectedPurchases.length,
    ownedItemsCount: ownedItems.length,
    suggestedItemsCount: suggestedItems.length,
    itemizedSummary,
    selectedPurchases,
    ownedItems,
    suggestedItems,
  };
}
