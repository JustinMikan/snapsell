'use client';

import { useState, useCallback } from 'react';
import { FBGroup } from '@/lib/types';

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: '🔥 非常活躍', color: 'text-green-600 bg-green-50' },
  4: { label: '✨ 活躍', color: 'text-blue-600 bg-blue-50' },
  3: { label: '普通', color: 'text-gray-500 bg-gray-50' },
  2: { label: '較冷清', color: 'text-amber-600 bg-amber-50' },
  1: { label: '不活躍', color: 'text-red-500 bg-red-50' },
};

interface PublishChecklistProps {
  groups: FBGroup[];
  copy: string;
  publishedGroups: string[];
  onPublishGroup: (groupId: string) => void;
  evaluating?: boolean;
}

export default function PublishChecklist({
  groups,
  copy,
  publishedGroups,
  onPublishGroup,
  evaluating,
}: PublishChecklistProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const publishedSet = new Set(publishedGroups);
  const totalGroups = groups.length;
  const publishedCount = publishedGroups.length;
  const progress = totalGroups > 0 ? (publishedCount / totalGroups) * 100 : 0;

  const handlePublish = useCallback(async (group: FBGroup) => {
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(copy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = copy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedId(group.id);
    onPublishGroup(group.id);
    window.open(group.url, '_blank');

    setTimeout(() => setCopiedId(null), 2000);
  }, [copy, onPublishGroup]);

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {publishedCount} / {totalGroups} 已發布
        </span>
      </div>

      {/* All groups — each is directly actionable */}
      {groups.map((group) => {
        const isPublished = publishedSet.has(group.id);
        const isCopied = copiedId === group.id;

        return (
          <div
            key={group.id}
            className={`bg-white rounded-2xl p-4 card-shadow transition-all ${
              isPublished
                ? 'border-2 border-green-400'
                : 'border border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className={`text-sm font-bold flex-1 ${
                isPublished ? 'text-green-700' : 'text-gray-800'
              }`}>
                {isPublished && <span className="mr-1">✓</span>}
                {group.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 flex-wrap">
              <span>{group.membersDisplay} 成員</span>
              <span>·</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                group.type === '公開'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {group.type}
              </span>
              <span>·</span>
              <span>{group.region}</span>
              {group.activityScore && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  SCORE_LABELS[group.activityScore]?.color ?? SCORE_LABELS[3].color
                }`}>
                  {SCORE_LABELS[group.activityScore]?.label ?? ''}
                </span>
              )}
              {evaluating && !group.activityScore && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 animate-pulse">
                  📊 評估中
                </span>
              )}
            </div>

            {group.activityReason && (
              <p className="text-[10px] text-gray-400 mb-1.5">{group.activityReason}</p>
            )}
            {group.type === '私密' && (
              <p className="text-[10px] text-amber-600 mb-1.5">需先加入社團才能發文</p>
            )}
            {group.notes && (
              <p className="text-[10px] text-red-500 mb-1.5">{group.notes}</p>
            )}

            <button
              type="button"
              onClick={() => handlePublish(group)}
              disabled={isCopied}
              className={`w-full h-10 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${
                isCopied
                  ? 'bg-green-500 text-white'
                  : isPublished
                    ? 'bg-green-50 text-green-700 border border-green-300 active:bg-green-100'
                    : 'bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white shadow-sm active:scale-[0.98]'
              }`}
            >
              {isCopied
                ? '✓ 已複製！正在開啟社團...'
                : isPublished
                  ? '📋 再次複製並開啟'
                  : '📋 複製文案並開啟社團'}
            </button>
          </div>
        );
      })}

      {/* All done celebration */}
      {publishedCount === totalGroups && totalGroups > 0 && (
        <div className="bg-white rounded-2xl border-2 border-green-400 p-6 text-center card-shadow animate-fade-in-up">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-base font-bold text-gray-800 mb-1">全部發布完成！</p>
          <p className="text-xs text-gray-500">已發布到 {publishedCount} 個社團</p>
        </div>
      )}
    </div>
  );
}
