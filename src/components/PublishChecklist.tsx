'use client';

import { useState, useCallback } from 'react';
import { FBGroup } from '@/lib/types';

interface PublishChecklistProps {
  groups: FBGroup[];
  copy: string;
  publishedGroups: string[];
  onPublishGroup: (groupId: string) => void;
}

export default function PublishChecklist({
  groups,
  copy,
  publishedGroups,
  onPublishGroup,
}: PublishChecklistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buttonState, setButtonState] = useState<'ready' | 'copied'>('ready');

  const publishedSet = new Set(publishedGroups);
  const totalGroups = groups.length;
  const publishedCount = publishedGroups.length;
  const progress = totalGroups > 0 ? (publishedCount / totalGroups) * 100 : 0;
  const allDone = currentIndex >= totalGroups;
  const currentGroup = !allDone ? groups[currentIndex] : null;

  const handlePublish = useCallback(async () => {
    if (!currentGroup) return;

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

    // Show copied state
    setButtonState('copied');
    onPublishGroup(currentGroup.id);

    // Open group URL
    window.open(currentGroup.url, '_blank');

    // Advance to next group after delay
    setTimeout(() => {
      setButtonState('ready');
      setCurrentIndex(prev => prev + 1);
    }, 1500);
  }, [currentGroup, copy, onPublishGroup]);

  const handleSkip = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

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

      {/* Completed groups (compact) */}
      {groups.slice(0, currentIndex).map((group) => {
        const wasPublished = publishedSet.has(group.id);
        return (
          <div
            key={group.id}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${
              wasPublished
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              wasPublished ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
            }`}>
              {wasPublished ? '✓' : '—'}
            </div>
            <span className={`text-sm flex-1 truncate ${
              wasPublished ? 'text-green-700 font-medium' : 'text-gray-400'
            }`}>
              {group.name}
            </span>
            <span className="text-[10px] text-gray-400">
              {wasPublished ? '已發布' : '已跳過'}
            </span>
          </div>
        );
      })}

      {/* Current group (hero card) */}
      {currentGroup && (
        <div key={currentGroup.id} className="bg-white rounded-2xl border-2 border-[#FF6B35] p-5 card-shadow animate-fade-in-up">
          <p className="text-[10px] font-semibold text-[#FF6B35] tracking-wider mb-2 uppercase">
            下一個社團
          </p>
          <h3 className="text-base font-bold text-gray-800 mb-1">{currentGroup.name}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>{currentGroup.membersDisplay} 成員</span>
            <span>·</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              currentGroup.type === '公開'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-amber-50 text-amber-600'
            }`}>
              {currentGroup.type}
            </span>
            <span>·</span>
            <span>{currentGroup.region}</span>
          </div>
          {currentGroup.type === '私密' && (
            <p className="text-[10px] text-amber-600 mb-3">需先加入社團才能發文</p>
          )}
          {currentGroup.notes && (
            <p className="text-[10px] text-red-500 mb-3">{currentGroup.notes}</p>
          )}

          <button
            type="button"
            onClick={handlePublish}
            disabled={buttonState === 'copied'}
            className={`w-full h-12 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              buttonState === 'copied'
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white shadow-md active:scale-[0.98]'
            }`}
          >
            {buttonState === 'copied' ? (
              <>✓ 已複製！正在開啟社團...</>
            ) : (
              <>📋 複製文案並開啟社團</>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="block mx-auto mt-2.5 text-xs text-gray-400 underline"
          >
            跳過此社團
          </button>
        </div>
      )}

      {/* Pending groups (minimal) */}
      {groups.slice(currentIndex + 1).map((group, i) => (
        <div
          key={group.id}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
        >
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
            {currentIndex + i + 2}
          </div>
          <span className="text-sm text-gray-400 truncate">{group.name}</span>
        </div>
      ))}

      {/* All done */}
      {allDone && (
        <div className="bg-white rounded-2xl border-2 border-green-400 p-6 text-center card-shadow animate-fade-in-up">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-base font-bold text-gray-800 mb-1">
            {publishedCount > 0 ? '全部發布完成！' : '已跳過所有社團'}
          </p>
          <p className="text-xs text-gray-500">
            {publishedCount > 0
              ? `已發布到 ${publishedCount} 個社團`
              : '你可以稍後再發布'}
          </p>
        </div>
      )}
    </div>
  );
}
