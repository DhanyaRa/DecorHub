import React, { useState } from 'react';
import { CatalogItem, FurnitureCategory, PriceTier, DesignStyle, Project } from '../../types';
import { FURNITURE_CATALOG, CATEGORY_LABELS } from '../../data/furnitureCatalog';
import { formatINR } from '../../utils/currency';
import { FurnitureImage } from './FurnitureImage';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Check,
  Info,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';

interface FurnitureCatalogViewProps {
  currentProject: Project;
  onAddItemToRoom: (item: CatalogItem) => void;
}

export const FurnitureCatalogView: React.FC<FurnitureCatalogViewProps> = ({
  currentProject,
  onAddItemToRoom,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name' | 'size'>('price_asc');
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  // Filter & Sort
  const filteredItems = FURNITURE_CATALOG.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedTier !== 'all' && item.priceTier !== selectedTier) return false;
    if (selectedStyle !== 'all' && !item.style.includes(selectedStyle as DesignStyle)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchMat = item.material.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchName && !matchMat && !matchDesc) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.priceINR - b.priceINR;
    if (sortBy === 'price_desc') return b.priceINR - a.priceINR;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') {
      const areaA = a.dimensions.widthCm * a.dimensions.depthCm;
      const areaB = b.dimensions.widthCm * b.dimensions.depthCm;
      return areaB - areaA;
    }
    return 0;
  });

  const handleAdd = (item: CatalogItem) => {
    onAddItemToRoom(item);
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold text-[#B45A3E] tracking-wider uppercase">
            Curated Sourcing
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Furniture Catalog
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-xl">
            Explore architectural furniture specifications, dimensions, materials, and illustrative
            INR market estimates. Add items directly to your active 2D layout.
          </p>
        </div>

        {/* Disclaimer Note */}
        <div className="bg-stone-100 px-3.5 py-2 rounded-xl text-stone-600 text-xs flex items-center gap-2 self-start md:self-auto border border-stone-200">
          <Info className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          <span>Prices are illustrative estimates for budget modeling.</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-8 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, timber, linen, finish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-xs focus:border-[#C86D51] focus:ring-1 focus:ring-[#C86D51]"
            />
          </div>

          {/* Style Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:border-[#C86D51]"
            >
              <option value="all">All Styles</option>
              <option value="Japandi">Japandi</option>
              <option value="Scandinavian">Scandinavian</option>
              <option value="Contemporary Indian">Contemporary Indian</option>
              <option value="Modern">Modern</option>
              <option value="Minimalist">Minimalist</option>
              <option value="Modern luxury">Modern Luxury</option>
              <option value="Organic modern">Organic Modern</option>
            </select>
          </div>

          {/* Price Tier */}
          <div className="md:col-span-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:border-[#C86D51]"
            >
              <option value="all">All Budget Tiers</option>
              <option value="budget">Budget Friendly</option>
              <option value="mid">Mid-Range</option>
              <option value="premium">Premium / Luxury</option>
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:border-[#C86D51]"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="size">Footprint Area</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#C86D51] text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Categories ({FURNITURE_CATALOG.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
            const count = FURNITURE_CATALOG.filter((i) => i.category === catKey).length;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === catKey
                    ? 'bg-[#C86D51] text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => {
          const isRecentlyAdded = addedItemId === item.id;
          return (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Visual Header / Realistic Photo + Top-Down Overlay */}
                <div className="h-44 relative overflow-hidden bg-stone-100">
                  <FurnitureImage
                    src={item.imageUrl}
                    alt={item.name}
                    category={item.category}
                    hexColor={item.hexColor}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-stone-700 text-[10px] uppercase tracking-wider shadow-2xs">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] shadow-2xs ${
                      item.isVerified
                        ? 'bg-emerald-100/95 text-emerald-800'
                        : 'bg-white/95 text-stone-600'
                    }`}>
                      {item.isVerified ? 'Verified Listing' : 'Illustrative Estimate'}
                    </span>
                  </div>

                  {/* Dimension pill */}
                  <div className="absolute bottom-2.5 left-2.5 text-[10px] text-stone-700 font-semibold bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-2xs">
                    {item.dimensions.widthCm}W × {item.dimensions.depthCm}D{item.dimensions.heightCm ? ` × ${item.dimensions.heightCm}H` : ''} cm
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-2">
                  <h3 className="font-serif-display text-base font-bold text-stone-900 group-hover:text-[#B45A3E] transition-colors line-clamp-1">
                    {item.name}
                  </h3>

                  <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="pt-2 text-xs text-stone-600 space-y-1">
                    <div>
                      <span className="text-stone-400">Material:</span> {item.material}
                    </div>
                    <div>
                      <span className="text-stone-400">Finish:</span> {item.color}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Action Footer */}
              <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                <div>
                  <div className="font-serif-display text-base font-bold text-stone-900">
                    {formatINR(item.priceINR)}
                  </div>
                  <div className="text-[10px] text-stone-400">Estimated INR</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailItem(item)}
                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    title="View Product Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAdd(item)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all ${
                      isRecentlyAdded
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#C86D51] hover:bg-[#B45A3E] text-white'
                    }`}
                  >
                    {isRecentlyAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Room</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-semibold text-[#B45A3E] tracking-wider uppercase">
                  Product Specifications
                </span>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">
                  {detailItem.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Modal Image */}
            <div className="h-56 w-full rounded-xl overflow-hidden border border-stone-200 relative bg-stone-50">
              <FurnitureImage
                src={detailItem.imageUrl}
                alt={detailItem.name}
                category={detailItem.category}
                hexColor={detailItem.hexColor}
                className="w-full h-full object-cover"
              />
              {detailItem.retailerName && (
                <div className="absolute bottom-3 left-3 bg-stone-900/90 text-white text-[11px] px-3 py-1 rounded-lg backdrop-blur-xs font-medium">
                  Sourced via {detailItem.retailerName}
                </div>
              )}
            </div>

            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              {detailItem.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-stone-400 block">Category</span>
                <span className="font-semibold text-stone-800">{CATEGORY_LABELS[detailItem.category]}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Budget Tier</span>
                <span className="font-semibold text-stone-800 capitalize">{detailItem.priceTier}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Dimensions (W × D × H)</span>
                <span className="font-semibold text-stone-800">
                  {detailItem.dimensions.widthCm} × {detailItem.dimensions.depthCm}
                  {detailItem.dimensions.heightCm ? ` × ${detailItem.dimensions.heightCm}` : ''} cm
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Estimated Price</span>
                <span className="font-bold text-stone-900">{formatINR(detailItem.priceINR)}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Material</span>
                <span className="font-semibold text-stone-800">{detailItem.material}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Color / Finish</span>
                <span className="font-semibold text-stone-800">{detailItem.color}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleAdd(detailItem);
                  setDetailItem(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C86D51] hover:bg-[#B45A3E] text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Active Room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
