'use client';

import { useEffect, useRef } from 'react';
import { PriceResearch } from '@/lib/types';

interface PriceResearchCardProps {
  state: 'loading' | 'done' | 'error';
  data: PriceResearch | null;
  error?: string;
  onPriceResolved?: (price: number) => void;
  onRetry?: () => void;
}

export default function PriceResearchCard({
  state,
  data,
  error,
  onPriceResolved,
  onRetry,
}: PriceResearchCardProps) {
  const hasAutoApplied = useRef(false);

  // Auto-apply suggested price when research completes
  useEffect(() => {
    if (state === 'done' && data && data.suggestedPrice > 0 && onPriceResolved && !hasAutoApplied.current) {
      hasAutoApplied.current = true;
      onPriceResolved(data.suggestedPrice);
    }
  }, [state, data, onPriceResolved]);

  // Loading skeleton
  if (state === 'loading') {
    return (
      <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded-full bg-[#FF6B35]/20 animate-pulse-glow" />
          <span className="text-xs font-semibold text-gray-500">市場查價中...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded-full animate-shimmer w-3/4" />
          <div className="h-3 rounded-full animate-shimmer w-1/2" />
          <div className="h-8 rounded-lg animate-shimmer w-full mt-3" />
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs text-red-500 mb-2">查價失敗：{error || '未知錯誤'}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-[#FF6B35] font-medium underline"
          >
            重試查價
          </button>
        )}
      </div>
    );
  }

  // Done state
  if (state === 'done' && data) {
    const { newPrice, secondhandPrices, suggestedPrice, priceRangeLow, priceRangeHigh, reasoning } = data;
    const rangeWidth = priceRangeHigh - priceRangeLow;
    const suggestedPosition = rangeWidth > 0
      ? ((suggestedPrice - priceRangeLow) / rangeWidth) * 100
      : 50;

    return (
      <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4 card-shadow animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            📊 市場定價參考
          </span>
          {newPrice && (
            <span className="text-xs text-gray-400">
              新品價 ${newPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Price range bar */}
        {priceRangeLow > 0 && priceRangeHigh > 0 && (
          <div className="mb-3">
            <div className="relative h-8 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gray-100" />
              {/* Filled range */}
              <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-[#FF6B35]/30 to-[#FF6B35]/60" style={{ left: '0%', right: '0%' }} />
              {/* Suggested price marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FF6B35] border-2 border-white card-shadow-lg z-10"
                style={{ left: `${Math.min(Math.max(suggestedPosition, 5), 95)}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>${priceRangeLow.toLocaleString()}</span>
              <span className="text-[#FF6B35] font-bold text-sm">
                建議 ${suggestedPrice.toLocaleString()}
              </span>
              <span>${priceRangeHigh.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Sources */}
        {secondhandPrices.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">參考來源：</p>
            <div className="space-y-1">
              {secondhandPrices.slice(0, 5).map((source, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-600 truncate flex-1 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${source.type === 'new' ? 'bg-blue-400' : 'bg-green-400'}`} />
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline truncate"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <span className="truncate">{source.title}</span>
                    )}
                  </span>
                  <span className="font-medium text-gray-700 ml-2 flex-shrink-0">
                    ${source.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="bg-amber-50/60 rounded-lg p-2.5">
          <p className="text-xs text-gray-600 leading-relaxed">
            💡 {reasoning}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
