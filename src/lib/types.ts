export type Category = '3C' | '家電' | '傢俱' | '衣物' | '精品' | '鞋子' | '嬰幼兒' | '露營' | '相機' | '運動' | '書籍' | '樂器' | '玩具' | '機車' | '寵物' | '綜合' | '其他';
export type Condition = '全新' | '近全新' | '八成新' | '有明顯使用痕跡';
export type ListingStatus = '待上架' | '已上架' | '已售出';
export type TradeMethod = '面交' | '郵寄' | '面交+郵寄';

export interface Listing {
  id: string;
  photos: string[];
  category: Category;
  name: string;
  brand: string;
  price: number;
  condition: Condition;
  tradeMethod: TradeMethod;
  tradeLocation: string;
  notes: string[];
  generatedCopy: string;
  status: ListingStatus;
  createdAt: string;
  publishedGroups: string[];
}

export interface FBGroup {
  id: string;
  name: string;
  members: number;
  membersDisplay: string;
  type: '公開' | '私密';
  region: string;
  categories: Category[];
  tags?: string[];
  url: string;
  notes?: string;
  activityScore?: number;
  activityReason?: string;
}

export interface PriceSource {
  title: string;
  url: string;
  price: number;
  type: 'new' | 'secondhand';
}

export interface PriceResearch {
  newPrice: number | null;
  secondhandPrices: PriceSource[];
  suggestedPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  reasoning: string;
}
