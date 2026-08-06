"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { X, Check, Camera, User, FloppyDisk } from "@phosphor-icons/react";
import { getLocalProfile, saveUserProfile, isUsernameAvailable, fetchRemoteProfile, UserProfile } from "@/lib/userProfile";
import { uploadAvatarDirectToR2 } from "@/lib/uploadToR2";
import { useAccount } from "wagmi";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function ProfileSettingsModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const initialProfile = getLocalProfile(address);
  const [username, setUsername] = useState((initialProfile.username || "").toLowerCase());
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetchRemoteProfile(address).then((remote) => {
      if (remote) {
        if (remote.username) setUsername(remote.username);
        if (remote.avatarUrl) setAvatarUrl(remote.avatarUrl);
      }
    });
  }, [address]);

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadAvatarDirectToR2(file);
      setAvatarUrl(uploadedUrl);
    } catch (err) {
      console.warn("Avatar upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    const cleanName = username.trim().toLowerCase();

    if (!cleanName) {
      setError("Username cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const available = await isUsernameAvailable(cleanName, address);
      if (!available) {
        setError("Username is already taken");
        setIsSaving(false);
        return;
      }

      const newProfile: UserProfile = {
        username: cleanName,
        avatarUrl,
      };
      await saveUserProfile(newProfile, address);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile Settings"
      className="fixed inset-0 z-[80] bg-bg/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] rounded-panel bg-glass border border-glassline p-6 text-cream shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream/5 hover:bg-cream/15 text-creamdim hover:text-cream flex items-center justify-center transition-colors"
        >
          <X size={14} weight="bold" />
        </button>

        <div className="text-center pt-1">
          <Eyebrow>Collector Profile</Eyebrow>
          <h2 className="text-lg font-bold text-cream">Profile Settings</h2>
          <p className="text-xs text-creamdim mt-0.5">Customize your nickname and avatar</p>
        </div>

        {/* Avatar Upload Preview */}
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-ambersoft border-2 border-amber/40 shadow-[0_0_24px_rgba(183,140,255,0.25)] flex items-center justify-center group">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <User size={34} weight="duotone" className="text-amber" />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-bg/75 flex items-center justify-center backdrop-blur-sm">
                <span className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            )}
          </div>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ambersoft hover:bg-amber/20 border border-glassline text-xs font-semibold text-cream hover:text-amber transition-all shadow-sm">
            <Camera size={14} weight="bold" className="text-amber" />
            <span>{isUploading ? "Uploading..." : "Change Avatar"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={isUploading || isSaving}
            />
          </label>
        </div>

        {/* Username Input */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold text-creamdim uppercase tracking-wider">Nickname (lowercase only)</label>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              if (error) setError(null);
            }}
            placeholder="enter nickname"
            maxLength={24}
            className={`w-full bg-ambersoft/40 border rounded-xl px-3.5 py-2.5 text-xs text-cream outline-none transition placeholder:text-creamdim/40 ${
              error ? "border-red-400/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/40" : "border-glassline focus:border-amber focus:ring-1 focus:ring-amber/40"
            }`}
          />
          {error && <p className="text-[11px] text-red-400 font-semibold mt-1">{error}</p>}
        </div>

        {/* Save Action */}
        <button
          onClick={handleSave}
          disabled={isUploading || isSaving}
          className="w-full bg-amber hover:bg-amber/90 disabled:opacity-50 text-inkdark font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(183,140,255,0.3)] active:scale-[0.98]"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-inkdark/30 border-t-inkdark rounded-full animate-spin" />
          ) : saved ? (
            <>
              <Check size={16} weight="bold" /> Saved
            </>
          ) : (
            <>
              <FloppyDisk size={16} weight="bold" /> Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
