'use client';

import Link from 'next/link';
import { useListings } from '@/hooks/useListings';
import InventoryList from '@/components/InventoryList';

export default function HomePage() {
  const { listings, loaded } = useListings();

  return (
    <div className="flex flex-col min-h-dvh max-w-[480px] mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FFF8F0]/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-800">
          <span className="mr-1">📸</span> SnapSell
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-sm text-gray-400">載入中...</p>
          </div>
        ) : (
          <InventoryList listings={listings} />
        )}
      </main>

      {/* FAB */}
      <Link
        href="/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#FF6B35] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#FF6B35]/90 transition-colors active:scale-95 z-40"
      >
        +
      </Link>
    </div>
  );
}
