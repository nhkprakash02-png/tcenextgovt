'use client';

import React from 'react';
import { priceLabel } from '../lib/utils';

// Renders a batch's price. If a valid originalPrice greater than the
// selling price is provided, shows the original price with a diagonal
// red slash in a muted color, next to the discounted price in a
// prominent accent color. Falls back to a single plain price otherwise.
export default function PriceTag({ price, originalPrice, size = 'base', theme = 'dark', className = '' }) {
  const original = Number(originalPrice);
  const selling = Number(price);
  const hasDiscount = originalPrice !== undefined && originalPrice !== null && originalPrice !== '' && !Number.isNaN(original) && original > selling;

  const sellingSizeClass = size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
  const originalSizeClass = size === 'lg' ? 'text-sm sm:text-base' : size === 'sm' ? 'text-xs' : 'text-xs';

  // 'dark' = sits on dark card backgrounds (gold-text plain price / emerald discounted price)
  // 'gold' = sits on the solid gold-grad banner (black plain price / dark-green discounted price)
  const plainPriceClass = theme === 'gold' ? 'text-black' : 'gold-text';
  const mutedOriginalClass = theme === 'gold' ? 'text-black/50' : 'text-gray-400';
  const discountedPriceClass = theme === 'gold' ? 'text-emerald-800' : 'text-emerald-400';

  if (!hasDiscount) {
    return (
      <span className={`${plainPriceClass} font-display font-800 ${sellingSizeClass} ${className}`}>
        {priceLabel(price)}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`relative inline-block font-medium ${mutedOriginalClass} ${originalSizeClass}`}>
        {priceLabel(originalPrice)}
        <span
          aria-hidden="true"
          className="absolute left-[-4%] right-[-4%] top-1/2 h-[1.5px] bg-red-500"
          style={{ transform: 'translateY(-50%) rotate(-10deg)' }}
        />
      </span>
      <span className={`${discountedPriceClass} font-display font-800 ${sellingSizeClass}`}>
        {priceLabel(price)}
      </span>
    </span>
  );
}
