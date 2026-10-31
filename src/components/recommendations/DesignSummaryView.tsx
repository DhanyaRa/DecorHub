import React from 'react';
import { Project, LayoutAlternative } from '../../types';
import { formatINR, calculateBudgetBreakdown } from '../../utils/currency';
import { getCatalogItemById, CATEGORY_LABELS } from '../../data/furnitureCatalog';
import { FurnitureImage } from '../catalog/FurnitureImage';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layout,
  Printer,
  ShieldCheck,
  Compass,
  Layers,
  IndianRupee,
  ShoppingBag,
} from 'lucide-react';

interface DesignSummaryViewProps {
  project: Project;
  onOpenPlanner: () => void;
  onOpenBudget: () => void;
  onSelectAlternative: (layoutKey: string) => void;
  onPrintReport: () => void;
}

export const DesignSummaryView: React.FC<DesignSummaryViewProps> = ({
  project,
  onOpenPlanner,
  onOpenBudget,
  onSelectAlternative,
  onPrintReport,
}) => {
  const q = project.questionnaire;
  const activeLayout = project.layoutAlternatives[project.activeLayoutId] || project.layoutAlternatives.space_efficient;
  const breakdown = calculateBudgetBreakdown(project.currentPlacedItems, q.budget);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Recommendation Header */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column (7 cols): Synthesis Narrative & Controls */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF0EB] text-[#B45A3E] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalized Synthesis Generated</span>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Budget: {formatINR(q.budget.totalBudgetINR)}</span>
              </div>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
              {project.name}
            </h1>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Synthesized specifically for a <strong className="text-stone-900">{q.userProfile.profession}</strong> ({q.userProfile.roomUsers}) in a{' '}
              <strong className="text-stone-900">{q.dimensions.lengthCm} × {q.dimensions.widthCm} cm</strong> space.
              Balances your desired <strong className="text-stone-900">{q.style.primaryStyle}</strong> aesthetic with
              ergonomic circulation, window daylight paths, and total INR investment.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onOpenPlanner}
                className="px-6 py-3 rounded-xl bg-[#C86D51] hover:bg-[#B45A3E] text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
              >
                <Layout className="w-4 h-4" />
                <span>Open in Interactive 2D Planner</span>
              </button>
              <button
                onClick={onPrintReport}
                className="px-5 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-stone-600" />
                <span>Print / Export Design Report</span>
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Uploaded Room Photograph Preview */}
          <div className="lg:col-span-5">
            {q.photoUrl ? (
              <div className="rounded-2xl overflow-hidden border border-stone-200/80 bg-stone-900 shadow-md group relative">
                <div className="aspect-16/10 w-full relative overflow-hidden">
                  <img
                    src={q.photoUrl}
                    alt="Your Uploaded Room Space"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-md bg-stone-900/90 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Uploaded Room Photo</span>
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-stone-950/80 backdrop-blur-md text-white text-[11px] flex items-center justify-between">
                    <span className="truncate max-w-[180px] text-stone-200 font-medium">
                      {q.photoName || 'Room Space'}
                    </span>
                    <span className="font-semibold text-amber-300">
                      {q.dimensions.lengthCm} × {q.dimensions.widthCm} cm
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F5] p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Layout className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Architectural Blueprint
                  </div>
                  <div className="text-xs text-stone-500">
                    Room dimensions: {q.dimensions.lengthCm} × {q.dimensions.widthCm} cm
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Highlights Corner */}
        <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-stone-400 font-medium">Style Philosophy</div>
            <div className="font-semibold text-stone-900 text-sm mt-0.5">{q.style.primaryStyle}</div>
          </div>
          <div>
            <div className="text-stone-400 font-medium">Floor Area</div>
            <div className="font-semibold text-stone-900 text-sm mt-0.5">
              {((q.dimensions.lengthCm * q.dimensions.widthCm) / 10000).toFixed(1)} sq. m (
              {Math.round(((q.dimensions.lengthCm * q.dimensions.widthCm) / 10000) * 10.764)} sq. ft)
            </div>
          </div>
          <div>
            <div className="text-stone-400 font-medium">Target Budget</div>
            <div className="font-semibold text-stone-900 text-sm mt-0.5">
              {formatINR(q.budget.totalBudgetINR)}
            </div>
          </div>
          <div>
            <div className="text-stone-400 font-medium">Estimated Sourcing Total</div>
            <div className="font-semibold text-stone-900 text-sm mt-0.5">
              {formatINR(breakdown.grandTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Layout Alternatives Comparison */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#B45A3E] tracking-wider uppercase">
              Algorithmic Variations
            </span>
            <h2 className="font-serif-display text-2xl font-bold text-stone-900 mt-0.5">
              Compare 3 Tailored Layout Alternatives
            </h2>
          </div>
          <span className="text-xs text-stone-500">Click to activate in 2D canvas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(project.layoutAlternatives).map((alt) => {
            const isCurrent = project.activeLayoutId === alt.id;
            const altCost = alt.items.reduce((sum, it) => {
              if (it.isOwned || it.isSuggested) return sum;
              const cat = getCatalogItemById(it.itemId);
              return sum + (cat ? cat.priceINR : 0);
            }, 0);

            return (
              <div
                key={alt.id}
                onClick={() => onSelectAlternative(alt.id)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#C86D51] bg-white ring-2 ring-[#C86D51] shadow-md'
                    : 'border-stone-200 bg-white hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold px-2 py-0.5 rounded bg-[#FAF0EB] text-[#B45A3E]">
                      {alt.id === 'space_efficient' ? 'Layout A' : alt.id === 'comfort_focused' ? 'Layout B' : 'Layout C'}
                    </span>
                    {isCurrent && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active in Planner
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif-display text-lg font-bold text-stone-900">
                    {alt.name}
                  </h3>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {alt.description}
                  </p>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-stone-800">Trade-offs & Focus:</div>
                    <div className="text-stone-600">{alt.tradeOffs}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between mt-4">
                  <div>
                    <div className="font-serif-display font-bold text-stone-900">
                      {formatINR(altCost)}
                    </div>
                    <div className="text-[10px] text-stone-400">{alt.items.length} items placed</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAlternative(alt.id);
                      onOpenPlanner();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
                  >
                    View in 2D
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Curated Sourcing Specification & Genuine Photography */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <span className="text-xs font-semibold text-[#86113C] tracking-wider uppercase flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Sourcing Specifications & Bill of Materials</span>
            </span>
            <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
              Selected Furniture Purchases ({breakdown.selectedPurchases.length})
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Purchase Total: <strong className="text-stone-900">{formatINR(breakdown.grandTotal)}</strong>
              {breakdown.isOverBudget && (
                <span className="ml-2 text-rose-600 font-semibold">
                  (Over budget by {formatINR(breakdown.overBudgetAmount)})
                </span>
              )}
            </p>
          </div>

          <button
            onClick={onOpenBudget}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <span>View Full Shopping List & BOM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Purchases Grid or Empty State */}
        {breakdown.selectedPurchases.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F5] text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6 text-stone-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-serif-display text-base font-bold text-stone-900">
                No furniture selected for purchase yet
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Browse the furniture catalogue and select the items you want to include.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onOpenBudget}
                className="px-4 py-2 rounded-xl bg-[#C86D51] hover:bg-[#B45A3E] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Browse Furniture Catalogue
              </button>
              <button
                onClick={onOpenPlanner}
                className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
              >
                Open 2D Planner
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {breakdown.selectedPurchases.map((placed) => {
              const cat = getCatalogItemById(placed.itemId);
              if (!cat) return null;
              return (
                <div
                  key={placed.instanceId}
                  className="group rounded-2xl border border-stone-200/80 hover:border-stone-300 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 w-full relative overflow-hidden bg-stone-50">
                      <FurnitureImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        category={cat.category}
                        hexColor={cat.hexColor}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/95 text-stone-700 backdrop-blur-xs uppercase tracking-wider">
                          {CATEGORY_LABELS[cat.category] || cat.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-900 text-white backdrop-blur-xs">
                          Selected
                        </span>
                      </div>
                      {cat.retailerName && (
                        <div className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-900/85 text-white backdrop-blur-xs">
                          {cat.retailerName.split(' ')[0]}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <h3 className="font-serif-display text-sm font-bold text-stone-900 line-clamp-1 group-hover:text-[#86113C] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {cat.material} · {cat.dimensions.widthCm}×{cat.dimensions.depthCm} cm
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-0 border-t border-stone-100 flex items-center justify-between mt-2">
                    <div className="font-serif-display text-sm font-bold text-stone-900">
                      {formatINR(cat.priceINR)}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium capitalize">
                      {cat.priceTier}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Optional AI Suggestions Sub-grid */}
        {breakdown.suggestedItems.length > 0 && (
          <div className="pt-6 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Optional AI Suggestions ({breakdown.suggestedItems.length})</span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  Recommended additions for balance. Not included in your purchase budget until selected.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {breakdown.suggestedItems.map((placed) => {
                const cat = getCatalogItemById(placed.itemId);
                if (!cat) return null;
                return (
                  <div
                    key={placed.instanceId}
                    className="group rounded-2xl border border-amber-200/80 bg-amber-50/20 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-36 w-full relative overflow-hidden bg-stone-50">
                        <FurnitureImage
                          src={cat.imageUrl}
                          alt={cat.name}
                          category={cat.category}
                          hexColor={cat.hexColor}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 backdrop-blur-xs uppercase tracking-wider">
                            Suggestion
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-1">
                        <h5 className="font-serif-display text-xs font-bold text-stone-900 line-clamp-1">
                          {cat.name}
                        </h5>
                        <p className="text-[10px] text-stone-500 line-clamp-1">
                          {cat.dimensions.widthCm}×{cat.dimensions.depthCm} cm · {formatINR(cat.priceINR)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 pt-0">
                      <span className="text-[10px] text-amber-800 font-medium block">
                        Optional · Add in 2D Planner
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Existing Retained Furniture */}
        {breakdown.ownedItems.length > 0 && (
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="font-medium">
              Retained Existing Furniture ({breakdown.ownedItems.length} item{breakdown.ownedItems.length > 1 ? 's' : ''}):
            </span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              ₹0 Purchase Cost (Owned Asset)
            </span>
          </div>
        )}
      </div>

      {/* Rationale & Placement Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="font-serif-display text-lg font-bold text-stone-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#C86D51]" />
            <span>Placement & Ergonomic Rationale</span>
          </h2>

          <div className="space-y-2.5 text-xs text-stone-600">
            {activeLayout.rationalePoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-[#FAF8F5]">
                <CheckCircle2 className="w-4 h-4 text-[#C86D51] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Palette & Moodboard Swatches */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="font-serif-display text-lg font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C86D51]" />
            <span>Material & Color Palette</span>
          </h2>

          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { name: 'Warm Terracotta', hex: '#C86D51', desc: 'Accent Linen' },
              { name: 'Bleached Ash', hex: '#E8D8C8', desc: 'Timber Joinery' },
              { name: 'Muted Moss', hex: '#879883', desc: 'Biophilic Foliage' },
              { name: 'Warm Cream', hex: '#FAF8F5', desc: 'Wall & Rug Field' },
            ].map((swatch, idx) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className="h-16 rounded-xl border border-stone-200 shadow-2xs"
                  style={{ backgroundColor: swatch.hex }}
                />
                <div className="text-[11px] font-semibold text-stone-900">{swatch.name}</div>
                <div className="text-[10px] text-stone-400">{swatch.desc}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-stone-500 pt-2 border-t border-stone-100 leading-relaxed">
            <strong>Atmosphere Note:</strong> {q.style.atmosphere || 'Balanced calm retreat designed for rest and focused work.'}
          </div>
        </div>
      </div>
    </div>
  );
};
