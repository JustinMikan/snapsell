import { Category, FBGroup } from './types';
import { fbGroups as staticGroups } from '@/data/fb-groups';

interface RecommendOptions {
  category: Category;
  name?: string;
  brand?: string;
  location?: string;
}

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
 * Extract keywords from product name and brand for tag matching.
 * e.g. "IKEA SUNDVIK 兒童床" → ['ikea', 'sundvik', '兒童床']
 *      brand: "IKEA" → ['ikea']
 */
function extractKeywords(name?: string, brand?: string): string[] {
  const keywords: string[] = [];

  if (brand) {
    keywords.push(brand.toLowerCase());
  }

  if (name) {
    // Split by spaces, slashes, dashes and filter short tokens
    const tokens = name
      .toLowerCase()
      .split(/[\s/\-_,，、]+/)
      .filter((t) => t.length >= 2);
    keywords.push(...tokens);

    // Also add the full name as a keyword for substring matching
    keywords.push(name.toLowerCase());
  }

  return keywords;
}

/**
 * Count how many tags a group matches against the product keywords.
 */
function countTagMatches(groupTags: string[], keywords: string[]): number {
  if (groupTags.length === 0 || keywords.length === 0) return 0;

  let matches = 0;
  for (const tag of groupTags) {
    const tagLower = tag.toLowerCase();
    for (const kw of keywords) {
      if (tagLower.includes(kw) || kw.includes(tagLower)) {
        matches++;
        break; // One match per tag is enough
      }
    }
  }
  return matches;
}

/**
 * Compute a relevance score for a group given the product info.
 *
 * Scoring weights:
 * - Tag match:     50 (at least 1 tag hit) + 10 per additional hit (max 80)
 * - Category:      20 (exact match) or 5 (綜合 fallback)
 * - Region:        15 (matches user's city)
 * - Members:       0-10 (normalized by max in candidate set)
 * - Activity:      activityScore × 2 (0-10)
 */
function scoreGroup(
  group: FBGroup,
  category: Category,
  keywords: string[],
  city: string,
  maxMembers: number
): number {
  let score = 0;

  // Tag matching
  const tagMatches = countTagMatches(group.tags ?? [], keywords);
  if (tagMatches > 0) {
    score += 50 + Math.min((tagMatches - 1) * 10, 30); // 50-80
  }

  // Category match
  if (group.categories.includes(category)) {
    score += 20;
  } else if (group.categories.includes('綜合')) {
    score += 5;
  }

  // Region match
  if (city && regionMatches(group.region, city)) {
    score += 15;
  } else if (!city) {
    score += 10; // No location preference, give partial credit
  }

  // Members (normalized 0-10)
  if (maxMembers > 0) {
    score += (group.members / maxMembers) * 10;
  }

  // Activity score bonus (if already evaluated)
  if (group.activityScore) {
    score += group.activityScore * 2;
  }

  return score;
}

/**
 * Synchronous version using static data (for immediate rendering).
 * Accepts either simple (category, location) or full options object.
 */
export function recommendGroups(categoryOrOpts: Category | RecommendOptions, location?: string): FBGroup[] {
  const opts: RecommendOptions = typeof categoryOrOpts === 'string'
    ? { category: categoryOrOpts, location }
    : categoryOrOpts;

  return scoreAndSort(staticGroups, opts);
}

/**
 * Async version that loads fresh data from JSON file.
 */
export async function recommendGroupsAsync(categoryOrOpts: Category | RecommendOptions, location?: string): Promise<FBGroup[]> {
  const opts: RecommendOptions = typeof categoryOrOpts === 'string'
    ? { category: categoryOrOpts, location }
    : categoryOrOpts;

  const groups = await loadGroups();
  return scoreAndSort(groups, opts);
}

/**
 * Try to load groups from the JSON data file (allows hot-updating without redeploy).
 * Falls back to the static TypeScript data if fetch fails.
 */
async function loadGroups(): Promise<FBGroup[]> {
  try {
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

function scoreAndSort(groups: FBGroup[], opts: RecommendOptions): FBGroup[] {
  const { category, name, brand, location } = opts;
  const city = location ? extractCity(location) : '';
  const keywords = extractKeywords(name, brand);

  // First pass: filter candidates (category match OR tag match)
  const candidates = groups.filter((g) => {
    const categoryMatch = g.categories.includes(category) || g.categories.includes('綜合');
    const tagMatch = countTagMatches(g.tags ?? [], keywords) > 0;

    // Must match category or have tag relevance
    if (!categoryMatch && !tagMatch) return false;

    // If user has location, exclude groups in different regions (unless 全台)
    if (city && !regionMatches(g.region, city)) return false;

    return true;
  });

  // Find max members for normalization
  const maxMembers = Math.max(...candidates.map((g) => g.members), 1);

  // Score and sort
  const scored = candidates.map((g) => ({
    group: g,
    score: scoreGroup(g, category, keywords, city, maxMembers),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((s) => s.group);
}
