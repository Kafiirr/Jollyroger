/**
 * Room system — identifies rooms by EVM wallet address (Monad).
 * URL param: ?room=0xABC...DEF  → visit that wallet's room.
 * Home room = "home" (the currently connected wallet's own room).
 */
export interface Room {
  /** URL ?room= key — "home" for own room, or a wallet address */
  id: string;
  /** Display name for the room owner */
  ownerName: string;
  /** EVM wallet address (0x...) — used for profile/showcase/SBT lookups */
  walletAddress: string;
  /** Avatar URL (fetched from Supabase user_profiles) */
  avatarUrl: string;
  /** True when the room was created dynamically from a pasted wallet address */
  synthetic?: boolean;
}

/** Home room ID — represents the currently connected wallet's own room */
export const HOME_ROOM_ID = "home";

/** Validate an EVM wallet address (0x + 40 hex chars) */
const ETH_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function isValidAddress(input: string): boolean {
  return ETH_ADDR_RE.test(input.trim());
}

/**
 * Resolve a room from a URL param value.
 * - null/undefined/"home" → home room
 * - Valid 0x address → synthetic room for that wallet
 * - Anything else → home room (ignore invalid input)
 */
export function getRoom(id: string | null | undefined): Room {
  const clean = id?.trim();
  if (!clean || clean === HOME_ROOM_ID) {
    return { id: HOME_ROOM_ID, ownerName: "", walletAddress: "", avatarUrl: "" };
  }
  // Valid EVM address → create synthetic room
  if (isValidAddress(clean)) {
    const addr = clean.toLowerCase();
    const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    return { id: addr, ownerName: short, walletAddress: addr, avatarUrl: "", synthetic: true };
  }
  // Invalid input → fallback to home
  return { id: HOME_ROOM_ID, ownerName: "", walletAddress: "", avatarUrl: "" };
}
