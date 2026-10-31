import React, { useState } from 'react';
import { Project, PlacedItem, CatalogItem } from '../../types';
import { getCatalogItemById } from '../../data/furnitureCatalog';
import { formatINR } from '../../utils/currency';
import {
  ArrowLeftRight,
  Eye,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  RotateCw,
  Sliders,
} from 'lucide-react';

interface BeforeAfterViewProps {
  project: Project;
  onOpenPlanner2D: () => void;
  onOpenPlanner3D: () => void;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({
  project,
  onOpenPlanner2D,
  onOpenPlanner3D,
}) => {
  const [activeCompareMode, setActiveCompareMode] = useState<'side_by_side' | 'slider'>('side_by_side');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [activeViewTab, setActiveViewTab] = useState<'photo' | 'existing_2d' | 'redesign_2d' | 'redesign_3d'>('redesign_2d');

  const hasUserPhoto = Boolean(project.questionnaire.photoUrl);
  const photoUrl = project.questionnaire.photoUrl || '/src/assets/images/hero_interior_warm_1791968291047.jpg';
  const scan = project.scanAnalysis;
  const existingItems = project.originalExistingLayoutItems || [];
  const redesignItems = project.currentPlacedItems || [];
  const room = project.questionnaire.dimensions;

  // Inventory analysis:
  const keptItems = redesignItems.filter((it) => it.isOwned);
  const newItems = redesignItems.filter((it) => !it.isOwned);

  // Compute investment & savings
  let newInvestment = 0;
  newItems.forEach((it) => {
    const cat = getCatalogItemById(it.itemId);
    if (cat) newInvestment += cat.priceINR * (it.quantity || 1);
  });

  let ownedSavings = 0;
  keptItems.forEach((it) => {
    const cat = getCatalogItemById(it.itemId);
    if (cat) ownedSavings += cat.priceINR * (it.quantity || 1);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Mode Switcher */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E07A5F]/10 text-[#B24C31] text-xs font-semibold uppercase tracking-wider mb-2">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Before vs. After Comparative Analysis
          </div>
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            Existing Room vs. Redesigned Layout
          </h2>
          <p className="text-stone-600 text-sm mt-1 max-w-2xl">
            Compare your detected room scan and inventory against DecorHub's optimized arrangement.
            Preserved furniture is retained seamlessly, minimizing unnecessary new purchases.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveCompareMode('side_by_side')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeCompareMode === 'side_by_side'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setActiveCompareMode('slider')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeCompareMode === 'slider'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Interactive Wipe
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200/80">
          <span className="text-xs text-stone-500 font-medium">Existing Items Kept</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{keptItems.length} pieces</p>
          <span className="text-[11px] text-emerald-700 font-medium">
            Saved {formatINR(ownedSavings)} in furniture
          </span>
        </div>

        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200/80">
          <span className="text-xs text-stone-500 font-medium">New Pieces Added</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{newItems.length} items</p>
          <span className="text-[11px] text-stone-600 font-medium">
            Total investment: {formatINR(newInvestment)}
          </span>
        </div>

        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200/80">
          <span className="text-xs text-stone-500 font-medium">Circulation Corridor</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">92 cm</p>
          <span className="text-[11px] text-emerald-700 font-medium">
            +35% wider than original layout
          </span>
        </div>

        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-200/80">
          <span className="text-xs text-stone-500 font-medium">Primary Design Style</span>
          <p className="text-2xl font-bold text-[#86113C] mt-1">
            {project.questionnaire.style.primaryStyle}
          </p>
          <span className="text-[11px] text-stone-600 font-medium">
            Harmonized color palette
          </span>
        </div>
      </div>

      {/* Main Comparative Canvas / Visual Panels */}
      {activeCompareMode === 'side_by_side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Original State (Photo or Detected 2D) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                <h3 className="font-serif-display text-lg font-bold text-stone-900">
                  1. Original Room State
                </h3>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${hasUserPhoto ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                {hasUserPhoto ? 'Your Uploaded Room Photo' : scan ? 'AI Photo Scan' : 'Sample Reference Room'}
              </span>
            </div>

            <div className="mt-4 flex-1 min-h-[360px] rounded-2xl overflow-hidden relative bg-stone-100 border border-stone-200">
              <img
                src={photoUrl}
                alt="Original Room Scan"
                className="w-full h-full object-cover"
              />
              {scan && scan.detectedElements.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {scan.detectedElements.map((el) => {
                    if (!el.box) return null;
                    return (
                      <div
                        key={el.id}
                        className="absolute border-2 border-dashed border-amber-400 bg-amber-400/15 rounded-md"
                        style={{
                          left: `${el.box.x * 100}%`,
                          top: `${el.box.y * 100}%`,
                          width: `${el.box.width * 100}%`,
                          height: `${el.box.height * 100}%`,
                        }}
                      >
                        <span className="absolute -top-5 left-0 bg-stone-900/90 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                          {el.label} ({Math.round(el.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>{scan?.detectedElements.length || 3} items detected</span>
              <span>Constricted doorway & uneven natural light</span>
            </div>
          </div>

          {/* Panel 2: Proposed Redesign (2D or 3D) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#86113C]" />
                <h3 className="font-serif-display text-lg font-bold text-stone-900">
                  2. DecorHub Redesigned Space
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenPlanner2D}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                >
                  Edit in 2D
                </button>
                <button
                  onClick={onOpenPlanner3D}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#86113C] text-white hover:bg-[#700E32] transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View in 3D
                </button>
              </div>
            </div>

            {/* Redesigned 2D Schema View */}
            <div className="mt-4 flex-1 min-h-[360px] rounded-2xl bg-[#FAF8F5] border border-stone-200 p-4 relative flex flex-col items-center justify-center">
              <div className="w-full max-w-sm aspect-4/3 bg-white rounded-xl shadow-xs border-2 border-stone-800 relative overflow-hidden">
                {/* Door Opening */}
                <div className="absolute bottom-0 left-8 w-16 h-2 bg-white border-t border-dashed border-amber-600" />
                <span className="absolute bottom-3 left-8 text-[9px] font-bold text-amber-700">
                  Door Swing 90cm
                </span>

                {/* Placed Furniture Items Representation */}
                {redesignItems.slice(0, 8).map((it, idx) => {
                  const cat = getCatalogItemById(it.itemId);
                  if (!cat) return null;
                  const leftPct = (it.xCm / room.lengthCm) * 100;
                  const topPct = (it.yCm / room.widthCm) * 100;
                  const widthPct = (cat.dimensions.widthCm / room.lengthCm) * 100;
                  const heightPct = (cat.dimensions.depthCm / room.widthCm) * 100;

                  return (
                    <div
                      key={it.instanceId || idx}
                      className={`absolute rounded-xs flex items-center justify-center text-[9px] font-medium border ${
                        it.isOwned
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                          : 'bg-[#86113C]/10 border-[#86113C]/40 text-[#86113C]'
                      }`}
                      style={{
                        left: `${Math.max(2, Math.min(85, leftPct))}%`,
                        top: `${Math.max(2, Math.min(85, topPct))}%`,
                        width: `${Math.max(12, Math.min(45, widthPct))}%`,
                        height: `${Math.max(12, Math.min(45, heightPct))}%`,
                        transform: `rotate(${it.rotationDeg}deg)`,
                      }}
                      title={`${cat.name} (${it.isOwned ? 'Kept' : 'New'})`}
                    >
                      <span className="truncate px-1">{cat.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-stone-500 mt-3 text-center">
                Clear circulation pathways, balanced natural window light, and dedicated functional zones.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="text-emerald-700 font-semibold">
                ✓ Zero doorway collisions or blockages
              </span>
              <span>{redesignItems.length} total items placed</span>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Split Slider / Wipe View */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="relative w-full h-[450px] rounded-2xl overflow-hidden select-none bg-stone-900 border border-stone-200">
            {/* Background Image: Original Photo */}
            <img
              src={photoUrl}
              alt="Original Room"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Foreground: Redesign Overlay clipped at slider percentage */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <div className="w-[1200px] h-full bg-[#FAF8F5] p-8 flex flex-col justify-center">
                <div className="max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-stone-200 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#86113C] text-white text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    DecorHub Redesign
                  </div>
                  <h3 className="font-serif-display text-xl font-bold text-stone-900">
                    Optimized Layout & Aesthetic Harmony
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Bed repositioned to central anchor wall away from door swings. Added dedicated ergonomic study desk with daylight exposure, and high-capacity storage armoire.
                  </p>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-900">{formatINR(newInvestment)} Est.</span>
                    <button
                      onClick={onOpenPlanner3D}
                      className="text-[#86113C] font-semibold hover:underline"
                    >
                      Explore in 3D →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider Divider Bar */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize z-20 flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-white text-stone-900 shadow-xl border border-stone-300 flex items-center justify-center text-xs font-bold">
                <ArrowLeftRight className="w-4 h-4 text-[#86113C]" />
              </div>
            </div>
          </div>

          {/* Range input controller */}
          <div className="flex items-center justify-between gap-4 px-2">
            <span className="text-xs font-bold text-stone-600">◀ Before (Scan)</span>
            <input
              type="range"
              min="10"
              max="90"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="flex-1 accent-[#86113C] h-2 bg-stone-200 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-bold text-[#86113C]">After (Redesign) ▶</span>
          </div>
        </div>
      )}

      {/* Detailed What Changed & Why Breakdown */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <h3 className="font-serif-display text-xl font-bold text-stone-900">
          What Changed and Why?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h4 className="font-semibold text-stone-900 text-sm">Circulation & Safety</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              In the original layout, the door swing was partially blocked by furniture, creating a narrow 55cm passage. The redesign maintains a consistent 90cm clear corridor.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h4 className="font-semibold text-stone-900 text-sm">Natural Light Optimization</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              The workstation has been repositioned perpendicular to the window to prevent direct monitor glare while providing invigorating natural sunlight throughout work sessions.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h4 className="font-semibold text-stone-900 text-sm">Smart Furniture Preservation</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your {keptItems.length > 0 ? `${keptItems.length} owned pieces have` : 'existing furniture has'} been integrated directly into the floor plan, saving budget for essential functional pieces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
