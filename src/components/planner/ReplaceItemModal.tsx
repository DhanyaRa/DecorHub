import React, { useState } from 'react';
import { CatalogItem, PlacedItem } from '../../types';
import { FURNITURE_CATALOG, getCatalogItemById } from '../../data/furnitureCatalog';
import { formatINR } from '../../utils/currency';
import { FurnitureImage } from '../catalog/FurnitureImage';
import { X, ArrowRightLeft, Check, AlertTriangle } from 'lucide-react';

interface ReplaceItemModalProps {
  itemToReplace: PlacedItem;
  onConfirmReplace: (oldInstanceId: string, newItem: CatalogItem) => void;
  onClose: () => void;
}

export const ReplaceItemModal: React.FC<ReplaceItemModalProps> = ({
  itemToReplace,
  onConfirmReplace,
  onClose,
}) => {
  const currentCatalog = getCatalogItemById(itemToReplace.itemId);
  const [selectedReplacement, setSelectedReplacement] = useState<CatalogItem | null>(null);

  if (!currentCatalog) return null;

  // Find candidate replacements: same category or explicit alternativeItemIds
  const candidateItems = FURNITURE_CATALOG.filter(
    (i) =>
      i.id !== currentCatalog.id &&
      (i.category === currentCatalog.category ||
        (currentCatalog.alternativeItemIds && currentCatalog.alternativeItemIds.includes(i.id)))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <span className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">
              Swap Product
            </span>
            <h3 className="font-serif-display text-xl font-bold text-stone-900">
              Replace "{currentCatalog.name}"
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Item Summary */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-white">
              <FurnitureImage
                src={currentCatalog.imageUrl}
                alt={currentCatalog.name}
                category={currentCatalog.category}
                hexColor={currentCatalog.hexColor}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-stone-900 truncate">{currentCatalog.name}</div>
              <div className="text-stone-500 mt-0.5 truncate">
                Dimensions: {currentCatalog.dimensions.widthCm} × {currentCatalog.dimensions.depthCm} cm · {currentCatalog.material}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-stone-900">{formatINR(currentCatalog.priceINR)}</div>
            <div className="text-stone-500 capitalize">{currentCatalog.priceTier} tier</div>
          </div>
        </div>

        {/* Alternatives List */}
        <div>
          <div className="text-xs font-semibold text-stone-700 mb-2">
            Available Compatible Alternatives ({candidateItems.length})
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {candidateItems.map((alt) => {
              const isSelected = selectedReplacement?.id === alt.id;
              const priceDiff = alt.priceINR - currentCatalog.priceINR;
              const widthDiff = alt.dimensions.widthCm - currentCatalog.dimensions.widthCm;
              const depthDiff = alt.dimensions.depthCm - currentCatalog.dimensions.depthCm;
              const isSizeDifferent = widthDiff !== 0 || depthDiff !== 0;

              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedReplacement(alt)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#86113C] bg-[#FDF2F4] ring-2 ring-[#86113C]'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50">
                      <FurnitureImage
                        src={alt.imageUrl}
                        alt={alt.name}
                        category={alt.category}
                        hexColor={alt.hexColor}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-stone-900 truncate">{alt.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-medium shrink-0">
                          {alt.priceTier}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                        {alt.material} · {alt.color}
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5 flex items-center gap-2">
                        <span>{alt.dimensions.widthCm} × {alt.dimensions.depthCm} cm</span>
                        {isSizeDifferent && (
                          <span className="text-amber-700 font-medium flex items-center gap-0.5 text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {widthDiff > 0 ? `+${widthDiff}cm` : `${widthDiff}cm`} W
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-stone-900">{formatINR(alt.priceINR)}</div>
                    <div
                      className={`text-xs font-medium mt-0.5 ${
                        priceDiff < 0
                          ? 'text-emerald-700 font-semibold'
                          : priceDiff > 0
                          ? 'text-stone-600'
                          : 'text-stone-400'
                      }`}
                    >
                      {priceDiff < 0 ? `Save ${formatINR(Math.abs(priceDiff))}` : priceDiff > 0 ? `+${formatINR(priceDiff)}` : 'Same price'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!selectedReplacement}
            onClick={() => {
              if (selectedReplacement) {
                onConfirmReplace(itemToReplace.instanceId, selectedReplacement);
                onClose();
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-[#86113C] hover:bg-[#700E32] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Confirm Replacement</span>
          </button>
        </div>
      </div>
    </div>
  );
};
