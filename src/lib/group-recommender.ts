import { Category, FBGroup } from './types';
import { fbGroups as staticGroups } from '@/data/fb-groups';

/**
 * Extract city name from a location string.
 * e.g. "台北市大安區" → "台北", "新北市板橋區" → "新北"
 */
function extractCity(location: string): string {
  return location.replace(/[市縣].*$/, '').trim();
}

/**
 * Check if a group's region matches the user's location.
 * "全台" always matches. Regional groups match if the city appears in the region string.
 */
function regionMatches(groupRegion: string, city: string): boolean {
  if (groupRegion === '全台') return true;
  if (!city) return true;

  const regionParts = groupRegion.split('/');
  return regionParts.some((part) => part.includes(city) || city.includes(part));
}

/**
 * Try to load groups from the JSON data file (allows hot-updating without redeploy).
 * Falls back to the static TypeScript data if fetch fails.
 */
async function loadGroups(): Promise<FBGroup[]> {
  try {
    // In browser: fetch from /data/fb-groups.json
    // On server: use static import as fallback
    if (typeof window !== 'undefined') {
      const res = await fetch('/data/fb-groups.json', { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Fetch failed, use static data
  }
  return staticGroups;
}

/**
 * Synchronous version using static data (for immediate rendering).
 */
export function recommendGroups(category: Category, location?: string): FBGroup[] {
  return filterAndSort(staticGroups, category, location);
}

/**
 * Async version that loads fresh data from JSON file.
 */
export async function recommendGroupsAsync(category: Category, location?: string): Promise<FBGroup[]> {
  const groups = await loadGroups();
  return filterAndSort(groups, category, location);
}

function filterAndSort(groups: FBGroup[], category: Category, location?: string): FBGroup[] {
  const city = location ? extractCity(location) : '';

  const matched = groups.filter((g) => {
    const categoryMatch = g.categories.includes(category) || g.categories.includes('綜合');
    if (!categoryMatch) return false;

    if (city) {
      return regionMatches(g.region, city);
    }

    return true;
  });

  const sorted = matched.sort((a, b) => b.members - a.members);
  return sorted.slice(0, 5);
}
