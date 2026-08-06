"use client";
import { useEffect, useState } from "react";

/**
 * Fetch avatar URL for a wallet address from /api/profile.
 * Pass undefined → returns undefined (no fetch).
 */
export function useAvatar(walletAddress?: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!walletAddress) {
      setUrl(undefined);
      return;
    }
    let alive = true;
    fetch(`/api/profile?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setUrl(d?.avatarUrl || undefined);
      })
      .catch(() => {
        if (alive) setUrl(undefined);
      });
    return () => {
      alive = false;
    };
  }, [walletAddress]);
  return url;
}
