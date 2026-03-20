'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/StepIndicator';
import PhotoUploader from '@/components/PhotoUploader';
import AIRecognitionCard, { AIResult, ConfirmedData } from '@/components/AIRecognitionCard';
import ProductForm, { ProductFormData } from '@/components/ProductForm';
import CopyPreview from '@/components/CopyPreview';
import PublishChecklist from '@/components/PublishChecklist';
import { generateCopy } from '@/lib/copy-generator';
import { recommendGroups } from '@/lib/group-recommender';
import { saveListing, generateId } from '@/lib/storage';
import { Listing, FBGroup, Category, Condition, TradeMethod, PriceResearch } from '@/lib/types';

type AnalyzeState = 'idle' | 'analyzing' | 'done' | 'error';
type PriceResearchState = 'idle' | 'loading' | 'done' | 'error';

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);

  // AI recognition state
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  // Price research state
  const [priceResearchState, setPriceResearchState] = useState<PriceResearchState>('idle');
  const [priceResearch, setPriceResearch] = useState<PriceResearch | null>(null);
  const [priceResearchError, setPriceResearchError] = useState('');

  // Confirmed product data (from AI card or manual form)
  const [confirmedData, setConfirmedData] = useState<ConfirmedData | null>(null);

  // Fallback manual form
  const [useManualForm, setUseManualForm] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    category: '3C',
    name: '',
    brand: '',
    price: '',
    condition: '八成新',
    tradeMethod: '面交',
    tradeLocation: '',
    notes: '',
  });

  const [generatedCopy, setGeneratedCopy] = useState('');
  const [recommendedGroups, setRecommendedGroups] = useState<FBGroup[]>([]);
  const [publishedGroups, setPublishedGroups] = useState<string[]>([]);
  const [groupsEvaluating, setGroupsEvaluating] = useState(false);

  // P0-1: Saved trade preferences
  const [savedTradeMethod, setSavedTradeMethod] = useState<TradeMethod | undefined>();
  const [savedTradeLocation, setSavedTradeLocation] = useState<string | undefined>();

  useEffect(() => {
    try {
      const prefs = localStorage.getItem('snapsell-user-prefs');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.tradeMethod) setSavedTradeMethod(parsed.tradeMethod);
        if (parsed.tradeLocation) setSavedTradeLocation(parsed.tradeLocation);
      }
    } catch { /* ignore */ }
  }, []);

  // Trigger price research with enhanced params
  const fetchPriceResearch = useCallback(async (name: string, brand: string, condition: string, notes?: string[], aiEstimate?: number) => {
    setPriceResearchState('loading');
    setPriceResearchError('');
    try {
      const res = await fetch('/api/price-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, brand, condition, notes, aiEstimate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '查價失敗');
      }
      const data = await res.json();
      setPriceResearch(data);
      setPriceResearchState('done');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '查價失敗';
      setPriceResearchError(message);
      setPriceResearchState('error');
    }
  }, []);

  // Trigger AI analysis when moving from step 1 to step 2
  const analyzePhoto = useCallback(async () => {
    if (photos.length === 0) return;
    setAnalyzeState('analyzing');
    setAnalyzeError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI 辨識失敗');
      }

      const data = await res.json();

      const result: AIResult = {
        category: (['3C', '家電', '傢俱', '衣物', '精品', '鞋子', '嬰幼兒', '露營', '綜合', '其他'].includes(data.category)
          ? data.category
          : '其他') as Category,
        name: data.name || '未知商品',
        brand: data.brand || '未知品牌',
        condition: (['全新', '近全新', '八成新', '有明顯使用痕跡'].includes(data.condition)
          ? data.condition
          : '八成新') as Condition,
        suggestedPrice: Number(data.suggestedPrice) || 0,
        notes: Array.isArray(data.notes) ? data.notes : [],
      };

      setAiResult(result);
      setAnalyzeState('done');

      // Auto-trigger price research with notes + aiEstimate
      fetchPriceResearch(result.name, result.brand, result.condition, result.notes, result.suggestedPrice);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI 辨識失敗';
      setAnalyzeError(message);
      setAnalyzeState('error');
    }
  }, [photos, fetchPriceResearch]);

  // Auto-generate copy + background group evaluation when confirmedData changes
  useEffect(() => {
    if (confirmedData) {
      const copy = generateCopy({
        name: confirmedData.name,
        brand: confirmedData.brand,
        price: confirmedData.price,
        tradeMethod: confirmedData.tradeMethod,
        tradeLocation: confirmedData.tradeLocation,
        condition: confirmedData.condition,
        notes: confirmedData.notes,
      });
      setGeneratedCopy(copy);

      // Background: recommend groups + evaluate activity
      const groups = recommendGroups(confirmedData.category, confirmedData.tradeLocation);
      setRecommendedGroups(groups);
      setGroupsEvaluating(true);

      fetch('/api/evaluate-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groups: groups.map(g => ({ id: g.id, name: g.name, members: g.members, membersDisplay: g.membersDisplay })),
        }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.evaluations) {
            const scoreMap = new Map<string, { score: number; reason: string }>();
            for (const ev of data.evaluations) {
              scoreMap.set(ev.groupId, { score: ev.activityScore, reason: ev.reason });
            }
            const enriched = groups.map(g => ({
              ...g,
              activityScore: scoreMap.get(g.id)?.score ?? 3,
              activityReason: scoreMap.get(g.id)?.reason ?? '',
            }));
            enriched.sort((a, b) => (b.activityScore ?? 3) - (a.activityScore ?? 3));
            setRecommendedGroups(enriched);
          }
        })
        .catch(() => { /* keep original groups if evaluation fails */ })
        .finally(() => setGroupsEvaluating(false));
    }
  }, [confirmedData]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return photos.length > 0;
      case 2:
        if (useManualForm) {
          return (
            formData.name.trim() !== '' &&
            formData.brand.trim() !== '' &&
            formData.price !== '' &&
            Number(formData.price) > 0 &&
            formData.tradeLocation.trim() !== ''
          );
        }
        return confirmedData !== null;
      default:
        return true;
    }
  }, [step, photos, formData, useManualForm, confirmedData]);

  const handleNext = useCallback(() => {
    if (step === 1) {
      setStep(2);
      analyzePhoto();
      return;
    }

    if (step === 2) {
      let data: {
        category: Category;
        name: string;
        brand: string;
        price: number;
        condition: Condition;
        tradeMethod: TradeMethod;
        tradeLocation: string;
        notes: string[];
      };

      if (useManualForm) {
        data = {
          category: formData.category,
          name: formData.name,
          brand: formData.brand,
          price: Number(formData.price),
          condition: formData.condition,
          tradeMethod: formData.tradeMethod,
          tradeLocation: formData.tradeLocation,
          notes: formData.notes.split('\n').map((n) => n.trim()).filter((n) => n.length > 0),
        };
      } else if (confirmedData) {
        data = confirmedData;
      } else {
        return;
      }

      // Generate copy for step 3 (groups already evaluated in background)
      const copy = generateCopy({
        name: data.name,
        brand: data.brand,
        price: data.price,
        tradeMethod: data.tradeMethod,
        tradeLocation: data.tradeLocation,
        condition: data.condition,
        notes: data.notes,
      });
      setGeneratedCopy(copy);

      // If groups haven't been set yet (manual form), set them now
      if (recommendedGroups.length === 0) {
        const groups = recommendGroups(data.category, data.tradeLocation);
        setRecommendedGroups(groups);
      }
    }

    setStep((s) => Math.min(s + 1, 3));
  }, [step, formData, useManualForm, confirmedData, analyzePhoto]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleAIConfirm = useCallback((data: ConfirmedData) => {
    setConfirmedData(data);
  }, []);

  const handlePublishGroup = useCallback((groupId: string) => {
    setPublishedGroups((prev) =>
      prev.includes(groupId) ? prev : [...prev, groupId]
    );
  }, []);

  const handleSave = useCallback(() => {
    const data = useManualForm
      ? {
          category: formData.category,
          name: formData.name,
          brand: formData.brand,
          price: Number(formData.price),
          condition: formData.condition,
          tradeMethod: formData.tradeMethod,
          tradeLocation: formData.tradeLocation,
          notes: formData.notes.split('\n').map((n) => n.trim()).filter((n) => n.length > 0),
        }
      : confirmedData;

    if (!data) return;

    const listing: Listing = {
      id: generateId(),
      photos,
      category: data.category,
      name: data.name,
      brand: data.brand,
      price: data.price,
      condition: data.condition,
      tradeMethod: data.tradeMethod,
      tradeLocation: data.tradeLocation,
      notes: data.notes,
      generatedCopy,
      status: publishedGroups.length > 0 ? '已上架' : '待上架',
      createdAt: new Date().toISOString(),
      publishedGroups,
    };
    saveListing(listing);
    router.push('/');
  }, [photos, formData, confirmedData, useManualForm, generatedCopy, publishedGroups, router]);

  const handleRetryPriceResearch = useCallback(() => {
    if (aiResult) {
      fetchPriceResearch(aiResult.name, aiResult.brand, aiResult.condition, aiResult.notes, aiResult.suggestedPrice);
    }
  }, [aiResult, fetchPriceResearch]);

  return (
    <div className="flex flex-col min-h-dvh max-w-[480px] mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FFF8F0]/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 card-shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-500 text-sm">
            取消
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-gray-800">新增商品</h1>
          <div className="w-8" />
        </div>
      </header>

      <StepIndicator currentStep={step} />

      {/* Content with step animation */}
      <main className="flex-1 px-4 pb-28">
        <div className="animate-fade-in-up">

          {/* ===== STEP 1: Upload Photos ===== */}
          {step === 1 && (
            <>
              <div className="mb-4 text-center">
                <h2 className="text-lg font-bold text-gray-800 mb-1">拍幾張照片就好</h2>
                <p className="text-xs text-gray-500">AI 會自動辨識品牌型號、幫你查價、寫好文案</p>
              </div>
              <PhotoUploader photos={photos} onChange={setPhotos} />
            </>
          )}

          {/* ===== STEP 2: Product Info (AI + Price + Trade + Copy Preview) ===== */}
          {step === 2 && (
            <>
              {/* Onboarding context */}
              {analyzeState === 'done' && (
                <div className="mb-3 text-center">
                  <h2 className="text-lg font-bold text-gray-800 mb-1">AI 幫你搞定了</h2>
                  <p className="text-xs text-gray-500">確認資訊無誤，文案已自動生成，直接下一步就能發布</p>
                </div>
              )}

              {/* P1-2: Photo thumbnails */}
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-1 px-1">
                  {photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`商品照片 ${i + 1}`}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border-2 border-white card-shadow"
                    />
                  ))}
                </div>
              )}

              {/* AI analyzing — skeleton card */}
              {analyzeState === 'analyzing' && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FF6B35]/30 animate-pulse-glow" />
                    <span className="text-sm font-semibold text-gray-700">🤖 AI 辨識中...</span>
                  </div>
                  {/* Skeleton card */}
                  <div className="bg-white rounded-xl overflow-hidden card-shadow">
                    <div className="h-1 gradient-accent" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 rounded-full animate-shimmer w-2/3" />
                      <div className="h-4 rounded-full animate-shimmer w-1/2" />
                      <div className="h-6 rounded-full animate-shimmer w-1/3" />
                      <div className="h-4 rounded-full animate-shimmer w-3/4" />
                      <div className="h-3 rounded-full animate-shimmer w-5/6" />
                      <div className="h-3 rounded-full animate-shimmer w-4/6" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl card-shadow p-4 space-y-3">
                    <div className="h-4 rounded-full animate-shimmer w-1/3" />
                    <div className="h-8 rounded-full animate-shimmer w-full" />
                    <div className="h-10 rounded-xl animate-shimmer w-full" />
                  </div>
                </div>
              )}

              {/* AI recognition done */}
              {analyzeState === 'done' && aiResult && !useManualForm && (
                <>
                  <AIRecognitionCard
                    result={aiResult}
                    onConfirm={handleAIConfirm}
                    priceResearch={priceResearch}
                    priceResearchState={priceResearchState === 'idle' ? 'loading' : priceResearchState}
                    priceResearchError={priceResearchError}
                    onRetryPriceResearch={handleRetryPriceResearch}
                    savedTradeMethod={savedTradeMethod}
                    savedTradeLocation={savedTradeLocation}
                  />

                  {/* P1-1: Inline compact copy preview */}
                  {generatedCopy && (
                    <div className="mt-4">
                      <CopyPreview copy={generatedCopy} onCopyChange={setGeneratedCopy} compact />
                    </div>
                  )}
                </>
              )}

              {/* AI failed */}
              {analyzeState === 'error' && !useManualForm && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="bg-white rounded-xl overflow-hidden card-shadow">
                    <div className="h-1 bg-red-400" />
                    <div className="p-4 text-center">
                      <p className="text-sm text-red-600 mb-1">AI 辨識失敗</p>
                      <p className="text-xs text-red-400">{analyzeError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseManualForm(true)}
                    className="w-full h-12 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-semibold text-sm shadow-sm"
                  >
                    手動填寫商品資訊
                  </button>
                </div>
              )}

              {/* Manual form fallback */}
              {useManualForm && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">手動填寫</h3>
                    {aiResult && (
                      <button type="button" onClick={() => setUseManualForm(false)}
                        className="text-xs text-[#FF6B35] font-medium">
                        返回 AI 辨識
                      </button>
                    )}
                  </div>
                  <ProductForm data={formData} onChange={setFormData} />
                </div>
              )}
            </>
          )}

          {/* ===== STEP 3: Publish (was step 4) ===== */}
          {step === 3 && (
            <>
              {/* Onboarding context */}
              <div className="mb-3 text-center">
                <h2 className="text-lg font-bold text-gray-800 mb-1">選社團，一鍵發布</h2>
                <p className="text-xs text-gray-500">AI 按活躍度排序，點擊就能複製文案並開啟社團</p>
              </div>

              {/* P1-2: Photo thumbnails */}
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-1 px-1">
                  {photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`商品照片 ${i + 1}`}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border-2 border-white card-shadow"
                    />
                  ))}
                </div>
              )}

              {/* Copy preview at top of publish step */}
              {generatedCopy && (
                <div className="mb-4">
                  <CopyPreview copy={generatedCopy} onCopyChange={setGeneratedCopy} compact />
                </div>
              )}

              <PublishChecklist
                groups={recommendedGroups}
                copy={generatedCopy}
                publishedGroups={publishedGroups}
                onPublishGroup={handlePublishGroup}
                evaluating={groupsEvaluating}
              />
            </>
          )}
        </div>
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FFF8F0]/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3">
        <div className="max-w-[480px] mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={handlePrev}
              className="flex-1 h-12 rounded-full border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              上一步
            </button>
          )}

          {step === 2 && analyzeState === 'analyzing' && (
            <button
              onClick={() => { setUseManualForm(true); setAnalyzeState('idle'); }}
              className="flex-1 h-12 rounded-full border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-colors"
            >
              改為手動填寫
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed() || (step === 2 && analyzeState === 'analyzing')}
              className={`flex-1 h-12 rounded-full font-semibold text-sm transition-all shadow-sm ${
                canProceed() && !(step === 2 && analyzeState === 'analyzing')
                  ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white font-semibold text-sm transition-all shadow-sm"
            >
              儲存完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
