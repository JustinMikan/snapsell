'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Listing, FBGroup, ListingStatus } from '@/lib/types';
import { getListingById, updateListing } from '@/lib/storage';
import { recommendGroups } from '@/lib/group-recommender';
import CopyPreview from '@/components/CopyPreview';
import PublishChecklist from '@/components/PublishChecklist';

const STATUS_OPTIONS: ListingStatus[] = ['待上架', '已上架', '已售出'];

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [groups, setGroups] = useState<FBGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const found = getListingById(id);
    if (found) {
      setListing(found);
      setGroups(recommendGroups(found.category, found.tradeLocation));
    }
    setLoaded(true);
  }, [id]);

  const handleToggleGroup = useCallback(
    (groupId: string) => {
      if (!listing) return;
      const newPublished = listing.publishedGroups.includes(groupId)
        ? listing.publishedGroups.filter((g) => g !== groupId)
        : [...listing.publishedGroups, groupId];
      updateListing(id, { publishedGroups: newPublished });
      setListing({ ...listing, publishedGroups: newPublished });
    },
    [listing, id]
  );

  const handleStatusChange = useCallback(
    (status: ListingStatus) => {
      if (!listing) return;
      updateListing(id, { status });
      setListing({ ...listing, status });
    },
    [listing, id]
  );

  const handleCopyChange = useCallback(
    (newCopy: string) => {
      if (!listing) return;
      updateListing(id, { generatedCopy: newCopy });
      setListing({ ...listing, generatedCopy: newCopy });
    },
    [listing, id]
  );

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh max-w-[480px] mx-auto px-4">
        <p className="text-gray-500 mb-4">找不到此商品</p>
        <button
          onClick={() => router.push('/')}
          className="h-12 px-6 rounded-full bg-[#FF6B35] text-white font-semibold text-sm"
        >
          回首頁
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-[480px] mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FFF8F0]/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-sm text-[#FF6B35] font-medium">
            返回
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-gray-800 truncate">
            {listing.name}
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-6">
        {/* Photos */}
        {listing.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {listing.photos.map((photo, i) => (
              <div
                key={i}
                className="w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={photo}
                  alt={`${listing.name} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Info card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-[#FF6B35]">
              ${listing.price.toLocaleString()}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
              {listing.category}
            </span>
          </div>
          <div className="space-y-1.5 text-sm text-gray-600">
            <p>品牌：{listing.brand}</p>
            <p>成色：{listing.condition}</p>
            <p>交易：{listing.tradeMethod}（{listing.tradeLocation}）</p>
            {listing.notes.length > 0 && (
              <div>
                <p className="mt-2 font-medium text-gray-700">備註：</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {listing.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">商品狀態</h3>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`flex-1 h-10 rounded-full text-sm font-medium transition-colors ${
                  listing.status === status
                    ? status === '已售出'
                      ? 'bg-green-500 text-white'
                      : 'bg-[#FF6B35] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Copy */}
        <CopyPreview copy={listing.generatedCopy} onCopyChange={handleCopyChange} />

        {/* Publish checklist */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">推薦社團</h3>
          <PublishChecklist
            groups={groups}
            copy={listing.generatedCopy}
            publishedGroups={listing.publishedGroups}
            onPublishGroup={handleToggleGroup}
          />
        </div>
      </main>
    </div>
  );
}
