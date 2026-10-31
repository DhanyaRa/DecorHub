import React, { useState } from 'react';
import { FurnitureCategory } from '../../types';

interface FurnitureImageProps {
  src?: string;
  alt: string;
  category: FurnitureCategory;
  hexColor?: string;
  className?: string;
}

export const FurnitureImage: React.FC<FurnitureImageProps> = ({
  src,
  alt,
  category,
  hexColor = '#D8C3A5',
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState<boolean>(!src);

  if (!hasError && src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // Consistent category-specific SVG vector fallback
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FAF8F5] to-stone-200/70 text-stone-700 relative overflow-hidden select-none ${className}`}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs border border-white/60"
        style={{ backgroundColor: `${hexColor}33`, color: hexColor }}
      >
        {category === 'beds' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 19h20M2 10h20M2 14h20M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M4 14v5M20 14v5" />
          </svg>
        )}
        {category === 'sofas' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M3 13a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3M3 13h18M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M6 20v2M18 20v2" />
          </svg>
        )}
        {category === 'desks' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18M5 8v11M19 8v11M9 8v11M15 8v11M3 8V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3" />
          </svg>
        )}
        {category === 'chairs' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 10V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M5 14h14a2 2 0 0 0 2-2v-2H3v2a2 2 0 0 0 2 2zm1 0v8M17 14v8M8 18h8" />
          </svg>
        )}
        {category === 'wardrobes' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 0v18M9 11v2M15 11v2" />
          </svg>
        )}
        {category === 'bookshelves' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h16v18H4zM4 9h16M4 15h16M8 3v6M14 9v6M10 15v6" />
          </svg>
        )}
        {category === 'lighting' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6l3 7H6l3-7zm3 7v10m-4 3h8" />
          </svg>
        )}
        {category === 'rugs' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 18h18M5 6v12M19 6v12M9 6v12M15 6v12" />
          </svg>
        )}
        {category === 'decor_plants' && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 0 1 7 7c0 4-7 13-7 13S5 13 5 9a7 7 0 0 1 7-7zm-4 19h8" />
          </svg>
        )}
        {(category === 'tables' || category === 'storage' || category === 'tv_units') && (
          <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M5 9v11M19 9v11M4 9V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3" />
          </svg>
        )}
      </div>
      <span className="text-[11px] font-semibold text-stone-500 mt-2 capitalize">
        {category.replace('_', ' ')}
      </span>
    </div>
  );
};
