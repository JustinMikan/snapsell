import { Listing } from './types';

export function generateCopy(listing: Pick<Listing, 'name' | 'brand' | 'price' | 'tradeMethod' | 'tradeLocation' | 'condition' | 'notes'>): string {
  const notesLines = listing.notes
    .filter((n) => n.trim().length > 0)
    .map((n) => `- ${n}`)
    .join('\n');

  const parts = [
    `📦 品名：${listing.name}`,
    `🏷️ 品牌：${listing.brand}`,
    `💰 售價：$${listing.price.toLocaleString()}`,
    `📍 交易方式：${listing.tradeMethod}（${listing.tradeLocation}）`,
    `📝 備註：`,
    `- ${listing.condition}`,
  ];

  if (notesLines) {
    parts.push(notesLines);
  }

  return parts.join('\n');
}
