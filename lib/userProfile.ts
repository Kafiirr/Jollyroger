"use client";
import { supabase } from "./supabase";

export interface UserProfile {
  username: string;
  avatarUrl: string;
}

const EMPTY_PROFILE: UserProfile = { username: "", avatarUrl: "" };

/** Build a wallet-scoped localStorage key so each address has its own slot. */
function localKey(walletAddress?: string): string | null {
  if (!walletAddress) return null;
  return `jollyroger_profile_${walletAddress.toLowerCase()}`;
}

/**
 * Read the locally-cached profile for a specific wallet address.
 * Returns an empty profile when no address is provided or nothing is stored.
 */
export function getLocalProfile(walletAddress?: string): UserProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  const key = localKey(walletAddress);
  if (!key) return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.username) return { username: String(parsed.username).toLowerCase(), avatarUrl: parsed.avatarUrl || "" };
    }
  } catch {}
  return EMPTY_PROFILE;
}

export async function isUsernameAvailable(username: string, walletAddress?: string): Promise<boolean> {
  const cleanName = username.trim().toLowerCase();
  if (!cleanName) return false;

  try {
    const currentId = walletAddress ? walletAddress.toLowerCase() : "default_user";
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .ilike("username", cleanName)
      .neq("id", currentId)
      .limit(1);

    if (data && data.length > 0) {
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error checking username availability:", err);
    return true;
  }
}

export async function fetchRemoteProfile(walletAddress?: string): Promise<UserProfile | null> {
  if (!walletAddress) return null;
  const id = walletAddress.toLowerCase();
  const key = localKey(walletAddress);
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("username, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (data && (data.username || data.avatar_url)) {
      const profile: UserProfile = {
        username: (data.username || "").toLowerCase(),
        avatarUrl: data.avatar_url || "",
      };
      if (typeof window !== "undefined" && key) {
        try {
          localStorage.setItem(key, JSON.stringify(profile));
          window.dispatchEvent(new CustomEvent("jollyroger_profile_updated", { detail: profile }));
        } catch {}
      }
      return profile;
    }
  } catch (err) {
    console.warn("Error fetching remote profile:", err);
  }
  return null;
}

export async function saveUserProfile(profile: UserProfile, walletAddress?: string) {
  const cleanProfile: UserProfile = {
    username: profile.username.trim().toLowerCase(),
    avatarUrl: profile.avatarUrl,
  };

  const key = localKey(walletAddress);
  if (typeof window !== "undefined" && key) {
    try {
      localStorage.setItem(key, JSON.stringify(cleanProfile));
      window.dispatchEvent(new CustomEvent("jollyroger_profile_updated", { detail: cleanProfile }));
    } catch {}
  }

  try {
    const id = walletAddress ? walletAddress.toLowerCase() : "default_user";
    await supabase.from("user_profiles").upsert({
      id,
      username: cleanProfile.username,
      avatar_url: cleanProfile.avatarUrl,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Supabase profile sync warning:", err);
  }
}
