import React, { useState } from 'react';
import { Project, CatalogItem, PlacedItem } from '../../types';
import { calculateBudgetBreakdown, formatINR } from '../../utils/currency';
import { getCatalogItemById, FURNITURE_CATALOG, CATEGORY_LABELS } from '../../data/furnitureCatalog';
import { FurnitureImage } from '../catalog/FurnitureImage';
import {
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  ArrowRightLeft,
  Truck,
  Wrench,
  ShieldAlert,
  Layers,
  Clock,
  ExternalLink,
  Sliders,
  Tag,
  ShieldCheck,
  ShoppingBag,
  HelpCircle,
  Check,
} from 'lucide-react';
import { ReplaceItemModal } from '../planner/ReplaceItemModal';

interface BudgetDashboardViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenPlanner: () => void;
  onOpenCatalog?: () => void;
}

export const BudgetDashboardView: React.FC<BudgetDashboardViewProps> = ({
  project,
  onUpdateProject,
  onOpenPlanner,
  onOpenCatalog,
}) => {
  const [replacingItem, setReplacingItem] = useState<PlacedItem | null>(null);

  const budgetPrefs = project.questionnaire.budget;
  const breakdown = calculateBudgetBreakdown(project.currentPlacedItems, budgetPrefs);

  // Budget preferences updates
  const handleUpdateBudgetAmount = (newAmount: number) => {
    onUpdateProject({
      ...project,
      questionnaire: {
        ...project.questionnaire,
        budget: {
          ...project.questionnaire.budget,
          totalBudgetINR: Math.max(0, newAmount),
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleOption = (key: 'includesDelivery' | 'includesInstallation' | 'includesDecor') => {
    onUpdateProject({
      ...project,
      questionnaire: {
        ...project.questionnaire,
        budget: {
          ...project.questionnaire.budget,
          [key]: !project.questionnaire.budget[key],
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Promote an AI suggestion to an explicitly selected purchase item
  const handleSelectSuggestion = (instanceId: string) => {
    const updated = project.currentPlacedItems.map((item) => {
      if (item.instanceId === instanceId) {
        return {
          ...item,
          isSuggested: false,
          isOwned: false,
          status: 'selected' as const,
        };
      }
      return item;
    });

    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Demote a selected purchase item back to an optional suggestion
  const handleDeselectPurchase = (instanceId: string) => {
    const updated = project.currentPlacedItems.map((item) => {
      if (item.instanceId === instanceId) {
        return {
          ...item,
          isSuggested: true,
          status: 'suggested' as const,
        };
      }
      return item;
    });

    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Quantity changes for selected items
  const handleUpdateQuantity = (instanceId: string, delta: number) => {
    const updated = project.currentPlacedItems
      .map((item) => {
        if (item.instanceId === instanceId) {
          const newQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter(Boolean) as PlacedItem[];

    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Remove item completely from layout
  const handleRemoveItem = (instanceId: string) => {
    const updated = project.currentPlacedItems.filter((i) => i.instanceId !== instanceId);
    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Toggle already owned status (reduces sourcing cost to ₹0)
  const handleToggleOwned = (instanceId: string) => {
    const updated = project.currentPlacedItems.map((item) => {
      if (item.instanceId === instanceId) {
        const nextOwned = !item.isOwned;
        return {
          ...item,
          isOwned: nextOwned,
          isSuggested: false,
          status: (nextOwned ? 'owned' : 'selected') as any,
        };
      }
      return item;
    });

    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Quick swap to cheaper alternative
  const handleSwapToCheaper = (instanceId: string, cheaperItemId: string) => {
    const updated = project.currentPlacedItems.map((item) => {
      if (item.instanceId === instanceId) {
        return { ...item, itemId: cheaperItemId };
      }
      return item;
    });

    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Identify items with potential cheaper alternatives (only for selected purchases)
  const costSavingOpportunities: Array<{
    item: PlacedItem;
    currentCatalog: CatalogItem;
    cheaperCatalog: CatalogItem;
    savings: number;
  }> = [];

  for (const placed of project.currentPlacedItems) {
    if (placed.isOwned || placed.isSuggested) continue;
    const cat = getCatalogItemById(placed.itemId);
    if (!cat) continue;

    if (cat.priceTier !== 'budget') {
      const cheaperOption = FURNITURE_CATALOG.find(
        (alt) => alt.category === cat.category && alt.priceTier === 'budget' && alt.priceINR < cat.priceINR
      );
      if (cheaperOption) {
        const qty = placed.quantity || 1;
        costSavingOpportunities.push({
          item: placed,
          currentCatalog: cat,
          cheaperCatalog: cheaperOption,
          savings: (cat.priceINR - cheaperOption.priceINR) * qty,
        });
      }
    }
  }

  // Top drivers of over-budget amount
  const sortedSelected = [...breakdown.selectedPurchases].sort((a, b) => b.totalPrice - a.totalPrice);
  const topCostDrivers = sortedSelected.slice(0, 3);

  const roomTypeLabel = project.questionnaire.roomType
    ? project.questionnaire.roomType.replace('_', ' ')
    : 'room';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">
            Live Cost Calculator & Sourcing BOM
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Budget & Sourcing Dashboard
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-xl">
            Real-time Indian Rupee budget tracking for your <strong>{roomTypeLabel}</strong>.
            Purchases are calculated strictly from your explicitly selected items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenCatalog && (
            <button
              onClick={onOpenCatalog}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#86113C]" />
              <span>Browse Catalog</span>
            </button>
          )}
          <button
            onClick={onOpenPlanner}
            className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-xs transition-colors"
          >
            Return to 2D Room Planner
          </button>
        </div>
      </div>

      {/* Over-Budget Alert Banner (only when selected purchases cause overrun) */}
      {breakdown.isOverBudget && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Your explicitly selected purchases exceed your target budget by {formatINR(breakdown.overBudgetAmount)}
            </span>
          </div>
          <p className="text-rose-700 leading-relaxed">
            Main cost drivers among your selected items:{' '}
            {topCostDrivers.map((d, idx) => (
              <strong key={d.instanceId}>
                {d.name} ({formatINR(d.totalPrice)}){idx < topCostDrivers.length - 1 ? ', ' : ''}
              </strong>
            ))}
            . You can adjust quantities, swap for smart budget alternatives below, or mark items as Already Owned.
          </p>
        </div>
      )}

      {/* Onboarding Sourcing Profile Banner */}
      <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#86113C]/10 text-[#86113C]">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="font-serif-display text-sm font-bold text-stone-900">
              Personalised Sourcing Scope & Strategy
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white text-stone-600 border border-stone-200 font-semibold self-start sm:self-auto">
            Configured for {roomTypeLabel} ({project.questionnaire.dimensions.lengthCm}×{project.questionnaire.dimensions.widthCm}cm)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-stone-400 font-medium">Coverage Scope</div>
            <div className="font-semibold text-stone-800 capitalize mt-0.5">
              {(budgetPrefs.coverageScope || 'full_turnkey').replace(/_/g, ' ')}
            </div>
          </div>

          <div>
            <div className="text-stone-400 font-medium">Budget Strictness</div>
            <div className="font-semibold text-stone-800 capitalize mt-0.5 flex items-center gap-1.5">
              <span>{budgetPrefs.strictness || 'flexible'}</span>
              <span className={`w-2 h-2 rounded-full ${
                budgetPrefs.strictness === 'strict' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </div>
          </div>

          <div>
            <div className="text-stone-400 font-medium">Furnishing Pace</div>
            <div className="font-semibold text-stone-800 capitalize mt-0.5">
              {(budgetPrefs.furnishingPace || 'entire_room').replace(/_/g, ' ')}
            </div>
          </div>

          <div>
            <div className="text-stone-400 font-medium">Selection Drivers</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(budgetPrefs.selectionDrivers || ['best_value', 'quality_durability']).slice(0, 3).map((driver) => (
                <span
                  key={driver}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#86113C] border border-[#86113C]/20 font-medium"
                >
                  {driver.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Target Budget */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="text-xs font-medium text-stone-500 flex items-center justify-between">
            <span>Target Budget</span>
            <IndianRupee className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="font-serif-display text-2xl font-bold text-stone-900">
            {formatINR(breakdown.totalBudget)}
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            {[75000, 125000, 200000].map((quick) => (
              <button
                key={quick}
                onClick={() => handleUpdateBudgetAmount(quick)}
                className="text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium transition-colors"
              >
                {formatINR(quick)}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Furniture Total */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="text-xs font-medium text-stone-500 flex items-center justify-between">
            <span>Furniture Subtotal</span>
            <span className="text-[10px] text-stone-400">{breakdown.selectedItemsCount} Selected Pieces</span>
          </div>
          <div className="font-serif-display text-2xl font-bold text-stone-900">
            {formatINR(breakdown.furnitureSubtotal)}
          </div>
          <div className="text-xs text-stone-500">
            Decor Subtotal: <strong>{formatINR(breakdown.decorSubtotal)}</strong>
          </div>
        </div>

        {/* Grand Total Estimated */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="text-xs font-medium text-stone-500 flex items-center justify-between">
            <span>Grand Total (Purchases)</span>
            <span className="text-[10px] text-stone-400">Selected Only</span>
          </div>
          <div
            className={`font-serif-display text-2xl font-bold ${
              breakdown.isOverBudget ? 'text-rose-600' : 'text-stone-900'
            }`}
          >
            {formatINR(breakdown.grandTotal)}
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                breakdown.isOverBudget ? 'bg-rose-500' : 'bg-[#86113C]'
              }`}
              style={{ width: `${Math.min(100, breakdown.percentUsed)}%` }}
            />
          </div>
        </div>

        {/* Remaining / Variance */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
          <div className="text-xs font-medium text-stone-500 flex items-center justify-between">
            <span>Budget Variance</span>
            <span className="text-[10px] text-stone-400">Balance</span>
          </div>
          <div
            className={`font-serif-display text-2xl font-bold ${
              breakdown.remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {breakdown.remainingBudget >= 0
              ? `${formatINR(breakdown.remainingBudget)} Left`
              : `${formatINR(breakdown.overBudgetAmount)} Over`}
          </div>
          <div className="text-xs text-stone-500">
            {breakdown.percentUsed}% of budget allocated
          </div>
        </div>
      </div>

      {/* Cost Inclusions & Category Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Breakdown Bars */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="font-serif-display text-lg font-bold text-stone-900">
            Category Cost Distribution (Selected Purchases)
          </h2>

          {Object.keys(breakdown.categoryTotals).length === 0 ? (
            <div className="p-4 text-xs text-stone-400 bg-stone-50 rounded-xl text-center">
              No categories currently selected for purchase.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(breakdown.categoryTotals).map(([catKey, total]) => {
                const label = CATEGORY_LABELS[catKey as any] || catKey;
                const pct = breakdown.grandTotal > 0 ? Math.round((total / breakdown.grandTotal) * 100) : 0;

                return (
                  <div key={catKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-800">{label}</span>
                      <span className="font-mono text-stone-600">
                        {formatINR(total)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#86113C] h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Optional Services Toggles */}
          <div className="pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => handleToggleOption('includesDelivery')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${
                budgetPrefs.includesDelivery
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-stone-200 bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-stone-600" />
                <div>
                  <div className="font-semibold text-stone-800">White-Glove Delivery</div>
                  <div className="text-stone-500">{formatINR(budgetPrefs.deliveryEstimateINR || 3500)}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={budgetPrefs.includesDelivery}
                readOnly
                className="accent-emerald-700 rounded"
              />
            </div>

            <div
              onClick={() => handleToggleOption('includesInstallation')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${
                budgetPrefs.includesInstallation
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-stone-200 bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-stone-600" />
                <div>
                  <div className="font-semibold text-stone-800">On-Site Assembly</div>
                  <div className="text-stone-500">{formatINR(budgetPrefs.installationEstimateINR || 4500)}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={budgetPrefs.includesInstallation}
                readOnly
                className="accent-emerald-700 rounded"
              />
            </div>
          </div>
        </div>

        {/* Right: Smart Cheaper Alternatives */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-display text-lg font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#86113C]" />
              <span>Smart Cost Alternatives</span>
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              {costSavingOpportunities.length} options
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Swap premium pieces for architecturally compatible budget alternatives to reduce expenditure.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {costSavingOpportunities.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
                Your selected room items are already optimized for maximum budget efficiency.
              </div>
            ) : (
              costSavingOpportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Smart Swap Recommendation</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Save {formatINR(opp.savings)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 items-center">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-200 min-w-0">
                      <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-stone-100">
                        <FurnitureImage
                          src={opp.currentCatalog.imageUrl}
                          alt={opp.currentCatalog.name}
                          category={opp.currentCatalog.category}
                          hexColor={opp.currentCatalog.hexColor}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 truncate text-[11px]">{opp.currentCatalog.name}</div>
                        <div className="text-stone-500 text-[10px]">{formatINR(opp.currentCatalog.priceINR)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 min-w-0">
                      <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-emerald-100">
                        <FurnitureImage
                          src={opp.cheaperCatalog.imageUrl}
                          alt={opp.cheaperCatalog.name}
                          category={opp.cheaperCatalog.category}
                          hexColor={opp.cheaperCatalog.hexColor}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-emerald-950 truncate text-[11px]">{opp.cheaperCatalog.name}</div>
                        <div className="text-emerald-700 font-bold text-[10px]">{formatINR(opp.cheaperCatalog.priceINR)}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSwapToCheaper(opp.item.instanceId, opp.cheaperCatalog.id)}
                    className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Swap to Save {formatINR(opp.savings)}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: Furniture Sourcing & Bill of Materials (Selected Purchases)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#86113C]" />
              <h2 className="font-serif-display text-lg font-bold text-stone-900">
                Selected Furniture Purchases & Bill of Materials ({breakdown.selectedPurchases.length})
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Items explicitly selected to purchase for your {roomTypeLabel}. Totals contribute directly to your budget.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#86113C]/10 text-[#86113C] self-start sm:self-auto">
            Subtotal: {formatINR(breakdown.furnitureSubtotal + breakdown.decorSubtotal)}
          </span>
        </div>

        {breakdown.selectedPurchases.length === 0 ? (
          /* Exact required empty state when no purchases are selected */
          <div className="p-10 rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F5] text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-serif-display text-base font-bold text-stone-800">
              No furniture selected for purchase yet
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              No furniture selected for purchase yet. Browse the furniture catalogue and select the items you want to include.
            </p>
            {onOpenCatalog && (
              <button
                onClick={onOpenCatalog}
                className="px-5 py-2.5 bg-[#86113C] hover:bg-[#700E32] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Browse Furniture Catalogue</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Unit Price</th>
                  <th className="pb-3 font-semibold text-center">Qty</th>
                  <th className="pb-3 font-semibold text-right">Subtotal</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {breakdown.selectedPurchases.map((row) => {
                  const catalogDetail = getCatalogItemById(row.itemId);
                  return (
                    <tr key={row.instanceId} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 font-semibold text-stone-900 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50">
                            <FurnitureImage
                              src={catalogDetail?.imageUrl}
                              alt={row.name}
                              category={row.category as any}
                              hexColor={catalogDetail?.hexColor}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-stone-900">{row.name}</div>
                            <div className="text-[11px] text-stone-500 font-normal truncate">
                              ID: <code className="bg-stone-100 px-1 py-0.5 rounded text-[10px]">{row.itemId}</code> · {catalogDetail?.material || 'Material'}
                            </div>
                            {catalogDetail?.retailerName && (
                              <div className="text-[10px] text-[#86113C] font-medium flex items-center gap-1 mt-0.5">
                                <span>{catalogDetail.retailerName}</span>
                                {catalogDetail.purchaseUrl && (
                                  <a
                                    href={catalogDetail.purchaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-stone-400 hover:text-[#86113C]"
                                    title="View Retailer Specification"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 capitalize text-stone-500">
                        {CATEGORY_LABELS[row.category as any] || row.category}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {row.priceUnavailable ? (
                          <span className="text-stone-400 italic">Unavailable</span>
                        ) : (
                          <>
                            {formatINR(row.unitPrice)}
                            {row.priceEstimated && (
                              <span className="block text-[9px] text-stone-400">Estimated</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                          <button
                            onClick={() => handleUpdateQuantity(row.instanceId, -1)}
                            className="px-2 py-0.5 hover:bg-stone-100 text-stone-600"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold">{row.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(row.instanceId, 1)}
                            className="px-2 py-0.5 hover:bg-stone-100 text-stone-600"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-stone-900">
                        {formatINR(row.totalPrice)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Selected
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleOwned(row.instanceId)}
                          className="px-2 py-1 text-[10px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
                          title="Mark as Already Owned (₹0)"
                        >
                          Mark Owned
                        </button>
                        <button
                          onClick={() => handleDeselectPurchase(row.instanceId)}
                          className="px-2 py-1 text-[10px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
                          title="Deselect from BOM"
                        >
                          Deselect
                        </button>
                        <button
                          onClick={() => {
                            const targetItem = project.currentPlacedItems.find(
                              (i) => i.instanceId === row.instanceId
                            );
                            if (targetItem) setReplacingItem(targetItem);
                          }}
                          className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100"
                          title="Swap Alternative"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(row.instanceId)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50"
                          title="Remove from Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: Optional AI Suggestions (NOT in Purchase Total until selected)
         ========================================================================= */}
      {breakdown.suggestedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="font-serif-display text-lg font-bold text-stone-900">
                  Optional AI Suggestions ({breakdown.suggestedItems.length})
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Recommended candidate pieces suited to your layout. They do <strong>NOT</strong> count toward your budget total until you explicitly select them.
              </p>
            </div>
            <span className="text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 self-start sm:self-auto">
              Cost: ₹0 (Unselected)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Suggested Piece</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Est. Price</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {breakdown.suggestedItems.map((row) => {
                  const catalogDetail = getCatalogItemById(row.itemId);
                  return (
                    <tr key={row.instanceId} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 font-semibold text-stone-900 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50">
                            <FurnitureImage
                              src={catalogDetail?.imageUrl}
                              alt={row.name}
                              category={row.category as any}
                              hexColor={catalogDetail?.hexColor}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-stone-900">{row.name}</div>
                            <div className="text-[11px] text-stone-500 truncate">
                              ID: {row.itemId} · {catalogDetail?.material}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 capitalize text-stone-500">
                        {CATEGORY_LABELS[row.category as any] || row.category}
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-stone-600">
                        {formatINR(row.unitPrice)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Optional Suggestion
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleSelectSuggestion(row.instanceId)}
                          className="px-3 py-1.5 bg-[#86113C] hover:bg-[#700E32] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Select for Purchase</span>
                        </button>
                        <button
                          onClick={() => handleRemoveItem(row.instanceId)}
                          className="p-1.5 text-stone-400 hover:text-stone-600 rounded-md hover:bg-stone-100 transition-colors"
                          title="Dismiss Suggestion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: Retained / Already Owned Furniture (₹0 Sourcing Cost)
         ========================================================================= */}
      {breakdown.ownedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-serif-display text-lg font-bold text-stone-900">
                  Retained & Existing Owned Furniture ({breakdown.ownedItems.length})
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Furniture you already own and are retaining in the space. Sourcing purchase cost is <strong>₹0</strong>.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              Total Asset Savings: {formatINR(breakdown.ownedSavings)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Owned Item</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Asset Value</th>
                  <th className="pb-3 font-semibold text-center">Purchase Cost</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {breakdown.ownedItems.map((row) => {
                  const catalogDetail = getCatalogItemById(row.itemId);
                  return (
                    <tr key={row.instanceId} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3 font-semibold text-stone-900 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50">
                            <FurnitureImage
                              src={catalogDetail?.imageUrl}
                              alt={row.name}
                              category={row.category as any}
                              hexColor={catalogDetail?.hexColor}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-stone-900">{row.name}</div>
                            <div className="text-[11px] text-stone-500 truncate">
                              ID: {row.itemId} · Retained Piece
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 capitalize text-stone-500">
                        {CATEGORY_LABELS[row.category as any] || row.category}
                      </td>
                      <td className="py-3 text-right font-mono text-stone-500">
                        {formatINR(row.unitPrice)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Owned (₹0)
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleOwned(row.instanceId)}
                          className="px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
                          title="Convert to new purchase"
                        >
                          Move to Purchases
                        </button>
                        <button
                          onClick={() => handleRemoveItem(row.instanceId)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-stone-100 transition-colors"
                          title="Remove from room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Replace Item Modal */}
      {replacingItem && (
        <ReplaceItemModal
          itemToReplace={replacingItem}
          onConfirmReplace={(oldId, newCat) => {
            handleSwapToCheaper(oldId, newCat.id);
            setReplacingItem(null);
          }}
          onClose={() => setReplacingItem(null)}
        />
      )}
    </div>
  );
};
