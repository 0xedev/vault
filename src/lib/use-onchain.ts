"use client";

import { useState, useCallback, useRef } from "react";
import {
  readAllListings,
  readAllDeals,
  readPaused,
  readListingCount,
  type OnChainListing,
  type OnChainDeal,
} from "@/lib/contract-reads";

export function useOnChainListings() {
  const [listings, setListings] = useState<{ id: bigint; data: OnChainListing }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await readAllListings();
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    await refetch();
  }, [refetch]);

  return { listings, loading, error, refetch, initialize };
}

export function useOnChainDeals() {
  const [deals, setDeals] = useState<{ id: bigint; data: OnChainDeal }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await readAllDeals();
      setDeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    await refetch();
  }, [refetch]);

  return { deals, loading, error, refetch, initialize };
}

export function useOnChainContractStatus() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [listingCount, setListingCount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([readPaused(), readListingCount()]);
      setPaused(p);
      setListingCount(c);
    } catch {
      setPaused(null);
      setListingCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    await refetch();
  }, [refetch]);

  return { paused, listingCount, loading, refetch, initialize };
}
