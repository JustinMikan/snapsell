'use client';

import { useState } from 'react';

interface CopyPreviewProps {
  copy: string;
  onCopyChange: (newCopy: string) => void;
  compact?: boolean;
}

export default function CopyPreview({ copy, onCopyChange, compact }: CopyPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [toast, setToast] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = copy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    }
  };

  // Compact mode: collapsible inline card for step 2
  if (compact) {
    return (
      <div className="bg-white rounded-xl overflow-hidden card-shadow animate-fade-in-up">
        <div className="h-1 bg-green-400" />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            📝 文案已生成
            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">✓</span>
          </span>
          <span className="text-xs text-[#FF6B35] font-medium">
            {isExpanded ? '收合' : '點擊預覽/編輯'}
          </span>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {isEditing ? (
              <div className="mt-3">
                <textarea
                  value={copy}
                  onChange={(e) => onCopyChange(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-[#FF6B35] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 resize-none"
                />
                <button type="button" onClick={() => setIsEditing(false)}
                  className="mt-2 text-xs text-[#FF6B35] font-medium">
                  完成編輯
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-xl p-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                  {copy}
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setIsEditing(true)}
                    className="text-xs text-[#FF6B35] font-medium">
                    編輯文案
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={handleCopy}
                    className="text-xs text-[#FF6B35] font-medium">
                    {toast ? '已複製！' : '複製文案'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode (not used anymore but kept for compatibility)
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">生成文案</h3>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-[#FF6B35] font-medium"
        >
          {isEditing ? '完成' : '編輯'}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={copy}
          onChange={(e) => onCopyChange(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 rounded-xl border border-[#FF6B35] text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 resize-none"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 whitespace-pre-wrap text-sm leading-relaxed">
          {copy}
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 w-full h-12 rounded-full bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#FF6B35]/90 transition-colors"
      >
        {toast ? '已複製！' : '複製文案'}
      </button>
    </div>
  );
}
