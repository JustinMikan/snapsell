'use client';

import Link from 'next/link';
import { Listing } from '@/lib/types';

interface InventoryListProps {
  listings: Listing[];
}

const STATUS_STYLES: Record<string, string> = {
  '待上架': 'bg-amber-50 text-amber-700',
  '已上架': 'bg-blue-50 text-blue-700',
  '已售出': 'bg-green-50 text-green-700',
};

export default function InventoryList({ listings }: InventoryListProps) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">還沒有商品</h2>
        <p className="text-sm text-gray-400">點右下角的 + 開始上架第一件商品吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <Link
          key={listing.id}
          href={`/listing/${listing.id}`}
          className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="flex">
            {listing.photos[0] && (
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={listing.photos[0]}
                  alt={listing.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-800 truncate">
                  {listing.name}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                    STATUS_STYLES[listing.status] || ''
                  }`}
                >
                  {listing.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{listing.brand}</p>
              <p className="text-sm font-bold text-[#FF6B35] mt-1">
                ${listing.price.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(listing.createdAt).toLocaleDateString('zh-TW')}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
