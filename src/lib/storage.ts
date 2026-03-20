import { Listing } from './types';

const STORAGE_KEY = 'snapsell-listings';

export function getListings(): Listing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Listing[];
  } catch {
    return [];
  }
}

export function saveListing(listing: Listing): void {
  const listings = getListings();
  const idx = listings.findIndex((l) => l.id === listing.id);
  if (idx >= 0) {
    listings[idx] = listing;
  } else {
    listings.unshift(listing);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

export function getListingById(id: string): Listing | undefined {
  return getListings().find((l) => l.id === id);
}

export function updateListing(id: string, updates: Partial<Listing>): void {
  const listings = getListings();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx >= 0) {
    listings[idx] = { ...listings[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  }
}

export function deleteListing(id: string): void {
  const listings = getListings().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
