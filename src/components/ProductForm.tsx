'use client';

import { Category, Condition, TradeMethod } from '@/lib/types';

const CATEGORIES: Category[] = ['3C', '家電', '傢俱', '衣物', '精品', '鞋子', '嬰幼兒', '露營', '綜合', '其他'];
const CONDITIONS: Condition[] = ['全新', '近全新', '八成新', '有明顯使用痕跡'];
const TRADE_METHODS: TradeMethod[] = ['面交', '郵寄', '面交+郵寄'];

export interface ProductFormData {
  category: Category;
  name: string;
  brand: string;
  price: number | '';
  condition: Condition;
  tradeMethod: TradeMethod;
  tradeLocation: string;
  notes: string;
}

interface ProductFormProps {
  data: ProductFormData;
  onChange: (data: ProductFormData) => void;
}

export default function ProductForm({ data, onChange }: ProductFormProps) {
  const update = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">商品分類</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => update('category', cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                data.category === cat
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">商品名稱</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="例：iPhone 15 Pro 256GB"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
        />
      </div>

      {/* Brand */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">品牌</label>
        <input
          type="text"
          value={data.brand}
          onChange={(e) => update('brand', e.target.value)}
          placeholder="例：Apple"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">售價（NT$）</label>
        <input
          type="number"
          inputMode="numeric"
          value={data.price}
          onChange={(e) => update('price', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
        />
      </div>

      {/* Condition */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">成色</label>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => update('condition', cond)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                data.condition === cond
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Method */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">交易方式</label>
        <div className="flex flex-wrap gap-2">
          {TRADE_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => update('tradeMethod', method)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                data.tradeMethod === method
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Location */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">交易地點</label>
        <input
          type="text"
          value={data.tradeLocation}
          onChange={(e) => update('tradeLocation', e.target.value)}
          placeholder="例：台北市大安區 / 全家店到店"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">備註（每行一項）</label>
        <textarea
          value={data.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="例：附原廠充電器&#10;保固到 2025/06"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35] resize-none"
        />
      </div>
    </div>
  );
}
