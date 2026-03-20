import { Category, FBGroup } from './types';
import { fbGroups } from '@/data/fb-groups';

/**
 * Extract city name from a location string.
 * e.g. "台北市大安區" → "台北", "新北市板橋區" → "新北"
 */
function extractCity(location: string): string {
  // Remove 市/縣 and everything after
  return location.replace(/[市縣].*$/, '').trim();
}

/**
 * Check if a group's region matches the user's location.
 * "全台" always matches. Regional groups match if the city appears in the region string.
 */
function regionMatches(groupRegion: string, city: string): boolean {
  if (groupRegion === '全台') return true;
  if (!city) return true; // no location filter → show all

  // Split compound regions like "台北/新北" or "台南/高雄"
  const regionParts = groupRegion.split('/');
  return regionParts.some((part) => part.includes(city) || city.includes(part));
}

export function recommendGroups(category: Category, location?: string): FBGroup[] {
  const city = location ? extractCity(location) : '';

  const matched = fbGroups.filter((g) => {
    // Must match category or be 綜合
    const categoryMatch = g.categories.includes(category) || g.categories.includes('綜合');
    if (!categoryMatch) return false;

    // Filter by region if location is provided
    if (city) {
      return regionMatches(g.region, city);
    }

    return true;
  });

  const sorted = matched.sort((a, b) => b.members - a.members);

  return sorted.slice(0, 5);
}
