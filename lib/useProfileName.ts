"use client";
import { useEffect, useState } from "react";

/**
 * Fetch username for a wallet address from /api/profile.
 * Used for synthetic (visited) rooms. Pass undefined → returns undefined.
 */
export function useProfileName(walletAddress?: string): string | undefined {
  const [name, setName] = useState<string>();
  useEffect(() => {
    if (!walletAddress) {
      setName(undefined);
      return;
    }
    let alive = true;
    fetch(`/api/profile?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setName(d?.username || undefined);
      })
      .catch(() => {
        if (alive) setName(undefined);
      });
    return () => {
      alive = false;
    };
  }, [walletAddress]);
  return name;
}
