'use client';

import { useCallback, useState, useRef, useEffect } from 'react';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

/** Race a promise against a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

/** Attempt 1: createObjectURL + canvas compression */
function compressViaObjectURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas ctx')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed (objectURL)'));
    };
    img.src = url;
  });
}

/** Attempt 2: FileReader + canvas compression */
function compressViaFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) { reject(new Error('FileReader empty')); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No canvas ctx')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Image load failed (FileReader)'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/** Attempt 3: raw FileReader without compression (guaranteed to work) */
function readRaw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) resolve(result);
      else reject(new Error('FileReader raw empty'));
    };
    reader.onerror = () => reject(new Error('FileReader raw error'));
    reader.readAsDataURL(file);
  });
}

/** Three-tier fallback: objectURL → FileReader+canvas → raw */
async function processImage(file: File): Promise<string> {
  // Attempt 1: createObjectURL + canvas (8s timeout)
  try {
    return await withTimeout(compressViaObjectURL(file), 8000, 'ObjectURL');
  } catch (err) {
    console.warn('[PhotoUploader] ObjectURL failed:', err);
  }

  // Attempt 2: FileReader + canvas (8s timeout)
  try {
    return await withTimeout(compressViaFileReader(file), 8000, 'FileReader+Canvas');
  } catch (err) {
    console.warn('[PhotoUploader] FileReader+Canvas failed:', err);
  }

  // Attempt 3: raw FileReader, no compression (5s timeout)
  try {
    return await withTimeout(readRaw(file), 5000, 'RawRead');
  } catch (err) {
    console.error('[PhotoUploader] All methods failed:', err);
    throw new Error('無法讀取此照片');
  }
}

export default function PhotoUploader({ photos, onChange }: PhotoUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety timeout: force reset processing after 15s
  useEffect(() => {
    if (processing) {
      safetyTimerRef.current = setTimeout(() => {
        setProcessing(false);
        setError('照片處理超時，請重新選擇照片');
      }, 15000);
    } else if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [processing]);

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Copy to array before async operations (prevents stale FileList on mobile)
      const fileArray = Array.from(files);
      // Reset input immediately so same file can be re-selected
      e.target.value = '';

      setProcessing(true);
      setError(null);

      try {
        const newPhotos: string[] = [];
        let failCount = 0;

        for (const file of fileArray) {
          try {
            const result = await processImage(file);
            newPhotos.push(result);
          } catch (err) {
            console.error('[PhotoUploader] File failed:', file.name, err);
            failCount++;
          }
        }

        if (newPhotos.length > 0) {
          onChange([...photos, ...newPhotos]);
        }

        if (failCount > 0 && newPhotos.length === 0) {
          setError('照片處理失敗，請再試一次或換一張照片');
        } else if (failCount > 0) {
          setError(`${failCount} 張照片處理失敗，其餘已上傳`);
        }
      } finally {
        setProcessing(false);
      }
    },
    [photos, onChange]
  );

  const removePhoto = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange]
  );

  return (
    <div className="animate-fade-in-up">
      {/* Empty state: large invite area */}
      {photos.length === 0 && !processing && (
        <label
          htmlFor="photo-gallery"
          className="flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-[#FF6B35]/40 bg-[#FF6B35]/5 cursor-pointer active:bg-[#FF6B35]/10 transition-colors mb-4"
        >
          <div className="text-5xl mb-3">📸</div>
          <p className="text-sm font-semibold text-gray-700">點擊上傳商品照片</p>
          <p className="text-xs text-gray-400 mt-1">建議 3-5 張，含正面、側面、細節</p>
        </label>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-2">已上傳 {photos.length} 張（建議 3-5 張）</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 card-shadow">
                <img src={photo} alt={`商品照片 ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs backdrop-blur-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Processing shimmer skeleton */}
      {processing && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-shimmer" />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">處理照片中...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
          {error}
        </div>
      )}

      {/* Buttons (shown when we have photos or not processing) */}
      {!processing && photos.length > 0 && (
        <div className="flex gap-3">
          <label
            htmlFor="photo-gallery"
            className="flex-1 h-12 rounded-full border-2 border-dashed border-[#FF6B35]/60 text-[#FF6B35] font-semibold text-sm flex items-center justify-center cursor-pointer active:bg-[#FF6B35]/10 transition-all shadow-sm"
          >
            📁 加更多照片
          </label>
          <label
            htmlFor="photo-camera"
            className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-semibold text-sm flex items-center justify-center cursor-pointer active:opacity-90 transition-all shadow-sm"
          >
            📷 拍照
          </label>
        </div>
      )}

      {/* Camera-only button when empty (gallery handled by the large area) */}
      {!processing && photos.length === 0 && (
        <label
          htmlFor="photo-camera"
          className="flex items-center justify-center w-full h-12 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-semibold text-sm cursor-pointer active:opacity-90 transition-all shadow-sm"
        >
          📷 直接拍照
        </label>
      )}

      {/* Hidden file inputs */}
      <input
        id="photo-gallery"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <input
        id="photo-camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
}
