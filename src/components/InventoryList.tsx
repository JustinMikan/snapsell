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
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">拍照就能上架</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          上傳商品照片，AI 自動辨識品牌型號、<br />
          查好市場行情、寫好銷售文案，<br />
          還幫你推薦最活躍的社團。
        </p>
        <div className="space-y-2.5 w-full max-w-[260px] text-left mb-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center text-xs flex-shrink-0">1</div>
            <span className="text-sm text-gray-600">拍照上傳</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center text-xs flex-shrink-0">2</div>
            <span className="text-sm text-gray-600">AI 辨識、查價、生成文案</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center text-xs flex-shrink-0">3</div>
            <span className="text-sm text-gray-600">一鍵發布到推薦社團</span>
          </div>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-semibold text-sm shadow-md active:scale-[0.98] transition-all"
        >
          開始上架第一件商品
        </Link>
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
