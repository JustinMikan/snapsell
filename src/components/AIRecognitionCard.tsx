'use client';

import { useState, useEffect, useRef } from 'react';
import { Category, Condition, TradeMethod, PriceResearch } from '@/lib/types';
import PriceResearchCard from './PriceResearchCard';

export interface AIResult {
  category: Category;
  name: string;
  brand: string;
  condition: Condition;
  suggestedPrice: number;
  notes: string[];
}

interface AIRecognitionCardProps {
  result: AIResult;
  onConfirm: (data: ConfirmedData) => void;
  priceResearch: PriceResearch | null;
  priceResearchState: 'loading' | 'done' | 'error';
  priceResearchError?: string;
  onRetryPriceResearch?: () => void;
  savedTradeMethod?: TradeMethod;
  savedTradeLocation?: string;
}

export interface ConfirmedData {
  category: Category;
  name: string;
  brand: string;
  price: number;
  condition: Condition;
  tradeMethod: TradeMethod;
  tradeLocation: string;
  notes: string[];
}

const CONDITIONS: Condition[] = ['全新', '近全新', '八成新', '有明顯使用痕跡'];
const TRADE_METHODS: TradeMethod[] = ['面交', '郵寄', '面交+郵寄'];
const CATEGORIES: Category[] = ['3C', '家電', '傢俱', '衣物', '精品', '鞋子', '嬰幼兒', '露營', '綜合', '其他'];

export default function AIRecognitionCard({
  result,
  onConfirm,
  priceResearch,
  priceResearchState,
  priceResearchError,
  onRetryPriceResearch,
  savedTradeMethod,
  savedTradeLocation,
}: AIRecognitionCardProps) {
  const [category, setCategory] = useState<Category>(result.category);
  const [name, setName] = useState(result.name);
  const [brand, setBrand] = useState(result.brand);
  const [price, setPrice] = useState(result.suggestedPrice);
  const [condition, setCondition] = useState<Condition>(result.condition);
  const [tradeMethod, setTradeMethod] = useState<TradeMethod>(savedTradeMethod || '面交');
  const [tradeLocation, setTradeLocation] = useState(savedTradeLocation || '');
  const [notes, setNotes] = useState(result.notes.join('\n'));
  const [editing, setEditing] = useState(false);
  const [priceToast, setPriceToast] = useState(false);
  const priceLabel = useRef<'ai' | 'research'>('ai');

  const canConfirm = name.trim() !== '' && brand.trim() !== '' && price > 0 && tradeLocation.trim() !== '';

  // Auto-confirm whenever valid data changes
  useEffect(() => {
    if (canConfirm) {
      onConfirm({
        category,
        name,
        brand,
        price,
        condition,
        tradeMethod,
        tradeLocation,
        notes: notes.split('\n').map(n => n.trim()).filter(n => n.length > 0),
      });
    }
  }, [canConfirm, category, name, brand, price, condition, tradeMethod, tradeLocation, notes, onConfirm]);

  // Save trade prefs to localStorage
  useEffect(() => {
    if (tradeLocation.trim()) {
      try {
        localStorage.setItem('snapsell-user-prefs', JSON.stringify({
          tradeMethod,
          tradeLocation,
        }));
      } catch { /* ignore */ }
    }
  }, [tradeMethod, tradeLocation]);

  // Auto-update price when price research completes
  const handlePriceResolved = (newPrice: number) => {
    setPrice(newPrice);
    priceLabel.current = 'research';
    setPriceToast(true);
    setTimeout(() => setPriceToast(false), 3000);
  };

  if (editing) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">編輯商品資訊</h3>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-[#FF6B35] font-medium">
            返回預覽
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">商品分類</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${category === cat ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">品名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">品牌</label>
          <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">售價（NT$）</label>
          <input type="number" inputMode="numeric" value={price} onChange={(e) => { setPrice(Number(e.target.value)); priceLabel.current = 'ai'; }}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">成色</label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((cond) => (
              <button key={cond} type="button" onClick={() => setCondition(cond)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${condition === cond ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {cond}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">交易方式</label>
          <div className="flex gap-1.5">
            {TRADE_METHODS.map((method) => (
              <button key={method} type="button" onClick={() => setTradeMethod(method)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${tradeMethod === method ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {method}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">交易地點</label>
          <input type="text" value={tradeLocation} onChange={(e) => setTradeLocation(e.target.value)} placeholder="例：台北市大安區"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">備註（每行一項）</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 resize-none" />
        </div>
      </div>
    );
  }

  // Preview card mode
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">🤖 AI 辨識結果</h3>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#FF6B35] font-medium">
          編輯
        </button>
      </div>

      {/* Price update toast */}
      {priceToast && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in-up">
          <span className="text-green-600 text-xs">✓ 已依據市場查價更新售價</span>
        </div>
      )}

      {/* AI-generated card with gradient accent */}
      <div className="bg-white rounded-xl overflow-hidden card-shadow">
        <div className="h-1 gradient-accent" />
        <div className="p-4 space-y-2 text-sm leading-relaxed">
          <p>📦 品名：<span className="font-medium">{name}</span></p>
          <p>🏷️ 品牌：<span className="font-medium">{brand}</span></p>
          <p className="flex items-center gap-2">
            💰 售價：<span className="text-[#FF6B35] font-bold text-lg">${price.toLocaleString()}</span>
            {priceLabel.current === 'research' && (
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">📊 依據市場查價</span>
            )}
          </p>
          <p>🔖 成色：{condition}</p>
          <p>📝 備註：</p>
          {notes.split('\n').filter(n => n.trim()).map((note, i) => (
            <p key={i} className="text-gray-500 pl-4 text-xs">- {note.trim()}</p>
          ))}
        </div>

        {/* Price Research Card — embedded inside the main card */}
        <div className="px-4 pb-4">
          <PriceResearchCard
            state={priceResearchState}
            data={priceResearch}
            error={priceResearchError}
            onPriceResolved={handlePriceResolved}
            onRetry={onRetryPriceResearch}
          />
        </div>
      </div>

      {/* Trade info section */}
      <div className="bg-white rounded-xl overflow-hidden card-shadow">
        <div className="h-1 bg-amber-400" />
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-700">📍 請補充交易資訊</p>

          <div className="flex gap-1.5">
            {TRADE_METHODS.map((method) => (
              <button key={method} type="button" onClick={() => setTradeMethod(method)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tradeMethod === method
                    ? 'bg-[#FF6B35] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                {method}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={tradeLocation}
            onChange={(e) => setTradeLocation(e.target.value)}
            placeholder="交易地點（例：台北市大安區）"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:bg-white placeholder:text-gray-400 transition-colors"
          />
        </div>
      </div>

      {!canConfirm && tradeLocation.trim() === '' && (
        <p className="text-xs text-gray-400 text-center">填寫交易地點後即可繼續</p>
      )}
    </div>
  );
}
