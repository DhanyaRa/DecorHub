import React, { useState } from 'react';
import { CatalogItem, FurnitureCategory } from '../../types';
import {
  FURNITURE_CATALOG,
  CATEGORY_LABELS,
} from '../../data/furnitureCatalog';
import { formatINR } from '../../utils/currency';
import { FurnitureImage } from '../catalog/FurnitureImage';
import { X, Search, Plus, Sparkles, Filter } from 'lucide-react';

interface FurnitureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: CatalogItem) => void;
}

export const FurnitureDrawer: React.FC<FurnitureDrawerProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  if (!isOpen) return null;

  const filteredItems = FURNITURE_CATALOG.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedTier !== 'all' && item.priceTier !== selectedTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchMat = item.material.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchName && !matchMat && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">
            Furnishing Catalog
          </span>
          <h3 className="font-serif-display text-lg font-bold text-stone-900">
            Add Furniture to Canvas
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-4 border-b border-stone-100 space-y-3 bg-[#FAF8F5]">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search items, wood, fabrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#86113C] text-white'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
            }`}
          >
            All Items
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                selectedCategory === catKey
                  ? 'bg-[#86113C] text-white'
                  : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Items Scroll List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            No items matching your search.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white transition-all shadow-2xs hover:shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-stone-100 bg-stone-50">
                  <FurnitureImage
                    src={item.imageUrl}
                    alt={item.name}
                    category={item.category}
                    hexColor={item.hexColor}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-stone-900 truncate">
                      {item.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium shrink-0">
                      {item.priceTier}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                    {item.dimensions.widthCm}W × {item.dimensions.depthCm}D cm · {item.material}
                  </div>
                  <div className="text-xs font-bold text-stone-900 mt-1">
                    {formatINR(item.priceINR)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onAddItem(item);
                  onClose();
                }}
                className="shrink-0 px-3 py-2 rounded-lg bg-[#86113C] hover:bg-[#700E32] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
