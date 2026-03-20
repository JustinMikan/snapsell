'use client';

import { useState, useEffect, useCallback } from 'react';
import { Listing } from '@/lib/types';
import { getListings, saveListing, updateListing, deleteListing } from '@/lib/storage';

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setListings(getListings());
    setLoaded(true);
  }, []);

  const refresh = useCallback(() => {
    setListings(getListings());
  }, []);

  const add = useCallback((listing: Listing) => {
    saveListing(listing);
    setListings(getListings());
  }, []);

  const update = useCallback((id: string, updates: Partial<Listing>) => {
    updateListing(id, updates);
    setListings(getListings());
  }, []);

  const remove = useCallback((id: string) => {
    deleteListing(id);
    setListings(getListings());
  }, []);

  return { listings, loaded, refresh, add, update, remove };
}
