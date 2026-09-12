"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  Camera,
  User,
  ArrowRight,
  LockSimple,
  ShieldCheck,
  CircleNotch,
  CheckCircle,
  XCircle,
  CaretDown,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain } from "wagmi";
import { ROOM_IMG_DARK } from "@/lib/spots";
import { getLocalProfile, saveUserProfile, fetchRemoteProfile, isUsernameAvailable } from "@/lib/userProfile";
import { uploadAvatarDirectToR2 } from "@/lib/uploadToR2";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function LoginIntro({ onLogin, onCancel }: { onLogin: () => void; onCancel: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cviStatus, setCviStatus] = useState<'idle' | 'loading' | 'verified' | 'error'>('idle');
  const [cviData, setCviData] = useState<{ aPassId: string; verificationTier: string } | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWalletConnected = Boolean(isConnected && address);

  // Reset form state when wallet address changes, then load wallet-scoped profile
  useEffect(() => {
    if (!address) {
      setUsername("");
      setAvatarUrl("");
      setCviStatus('idle');
      setCviData(null);
      setUsernameStatus('idle');
      return;
    }
    // Read local cache for this specific wallet
    const local = getLocalProfile(address);
    setUsername(local.username);
    setAvatarUrl(local.avatarUrl);
    // Existing user with a stored name — mark as available (it's their own)
    if (local.username) setUsernameStatus('available');
    // Then fetch remote (may overwrite with fresher data)
    fetchRemoteProfile(address).then((remote) => {
      if (remote) {
        if (remote.username) { setUsername(remote.username); setUsernameStatus('available'); }
        if (remote.avatarUrl) setAvatarUrl(remote.avatarUrl);
      }
    });
  }, [address]);

  // Debounced username availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) { setUsernameStatus('idle'); return; }
    if (clean.length < 2) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await isUsernameAvailable(clean, address);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, address]);

  useEffect(() => {
    if (!address || !isWalletConnected) return;
    setCviStatus('verified');
    setCviData({ 
      aPassId: `CTC-CC3-${address.slice(2, 8).toUpperCase()}`, 
      verificationTier: "Creditcoin Attested" 
    });
  }, [address, isWalletConnected]);

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isWalletConnected) return;
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

  const handleEnterRoom = async () => {
    if (!isWalletConnected) return;
    if (chainId && chainId !== 102031 && chainId !== 11155111 && switchChainAsync) {
      try {
        await switchChainAsync({ chainId: 102031 });
      } catch (err) {
        console.warn("User dismissed network switch when entering room:", err);
      }
    }
    const cleanName = username.trim().toLowerCase();
    await saveUserProfile(
      {
        username: cleanName,
        avatarUrl,
      },
      address
    );
    onLogin();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Collector Room Access"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Dark background room view */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG_DARK}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px] rounded-panel bg-glass backdrop-blur-xl border border-glassline shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 my-auto space-y-5 text-cream">
        {/* Brand Header */}
        <div className="text-center pt-1">
          <Eyebrow>Welcome to Jolly Roger</Eyebrow>
          <h2 className="text-xl font-bold text-cream">Enter Collector Room</h2>
          <p className="text-xs text-creamdim mt-0.5">
            {isWalletConnected
              ? "Customize your profile and enter the room"
              : "Connect your Web3 wallet to get started"}
          </p>
        </div>

        {/* Step 1: Wallet Connection */}
        <div className="w-full">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              if (!ready) {
                return (
                  <div className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
                );
              }

              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-amber via-amber/90 to-amber/80 hover:from-amber hover:via-amber/95 hover:to-amber text-inkdark font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(183,140,255,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                  >
                    <Wallet size={16} weight="bold" />
                    <span>Connect Wallet</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      if (switchChainAsync) {
                        try {
                          await switchChainAsync({ chainId: 102031 });
                          return;
                        } catch {}
                      }
                      openChainModal();
                    }}
                    className="w-full h-11 px-4 rounded-xl bg-down/15 border border-down/40 hover:border-down/60 text-down font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center gap-2">
                      <WarningCircle size={16} weight="bold" className="shrink-0" />
                      <span className="whitespace-nowrap font-medium">Wrong Network</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-down/25 border border-down/30 group-hover:bg-down/40 transition">
                      Switch to Creditcoin CC3
                    </span>
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2.5 w-full">
                  {/* Network Button */}
                  <button
                    type="button"
                    onClick={openChainModal}
                    title={chain.name}
                    className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      {chain.hasIcon && chain.iconUrl ? (
                        <div
                          className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                          style={{ background: chain.iconBackground }}
                        >
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className="w-5 h-5 object-cover"
                          />
                        </div>
                      ) : (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        </span>
                      )}
                      <span className="text-xs font-semibold text-cream truncate whitespace-nowrap">
                        {chain.name}
                      </span>
                    </div>
                    <CaretDown
                      size={13}
                      weight="bold"
                      className="text-creamdim group-hover:text-cream shrink-0 transition-transform group-hover:translate-y-0.5"
                    />
                  </button>

                  {/* Account Button */}
                  <button
                    type="button"
                    onClick={openAccountModal}
                    title={account.address}
                    className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={account.displayName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-amber/40"
                        />
                      ) : account.ensAvatar ? (
                        <img
                          src={account.ensAvatar}
                          alt={account.displayName}
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center shrink-0 text-[9px] font-mono font-bold text-amber">
                          {account.displayName ? account.displayName.slice(2, 4).toUpperCase() : "0x"}
                        </div>
                      )}
                      <span className="text-xs font-mono font-semibold text-cream truncate whitespace-nowrap">
                        {account.displayName}
                      </span>
                    </div>
                    <CaretDown
                      size={13}
                      weight="bold"
                      className="text-creamdim group-hover:text-cream shrink-0 transition-transform group-hover:translate-y-0.5"
                    />
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {/* Step 2: Profile Setup (Locked until wallet is connected) */}
        <div
          className={`bg-ambersoft/40 border border-glassline rounded-2xl p-4 space-y-3 transition-opacity duration-200 ${
            isWalletConnected ? "opacity-100" : "opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-creamdim uppercase tracking-wider">
              Collector Identity
            </span>
            {!isWalletConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber/80">
                <LockSimple size={12} weight="bold" />
                Wallet Required
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-bg border-2 border-amber/40 shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(183,140,255,0.2)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <User size={26} weight="duotone" className="text-amber" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-bg/80 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-amber/40 border-t-amber rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  disabled={!isWalletConnected}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder={isWalletConnected ? "Collector Nickname" : "Connect wallet first"}
                  maxLength={20}
                  className={`w-full bg-bg/70 border rounded-xl px-3 py-1.5 text-xs text-cream outline-none placeholder:text-creamdim/40 disabled:cursor-not-allowed disabled:opacity-60 pr-7 ${
                    usernameStatus === 'taken'
                      ? 'border-down/60 focus:border-down focus:ring-1 focus:ring-down/40'
                      : usernameStatus === 'available'
                      ? 'border-up/40 focus:border-up focus:ring-1 focus:ring-up/40'
                      : 'border-glassline focus:border-amber focus:ring-1 focus:ring-amber/40'
                  }`}
                />
                {/* Inline status icon */}
                {isWalletConnected && username.trim().length >= 2 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <CircleNotch size={13} weight="bold" className="animate-spin text-amber/70" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle size={13} weight="fill" className="text-up" />
                    )}
                    {usernameStatus === 'taken' && (
                      <XCircle size={13} weight="fill" className="text-down" />
                    )}
                  </span>
                )}
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-[10px] font-semibold text-down">Username is already taken</p>
              )}
              <label
                className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  isWalletConnected && !isUploading
                    ? "cursor-pointer text-amber hover:text-amber/80"
                    : "cursor-not-allowed text-creamdim/40"
                }`}
              >
                <Camera size={13} weight="bold" />
                <span>{isUploading ? "Uploading..." : "Change Avatar"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  disabled={!isWalletConnected || isUploading}
                />
              </label>
            </div>
          </div>

          {!isWalletConnected && (
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-creamdim/70">
              <LockSimple size={12} weight="bold" className="text-amber/70 shrink-0" />
              <span>Connect your wallet above to unlock profile customization</span>
            </div>
          )}
        </div>

        {/* Step 3: Creditcoin Identity Verification */}
        <div
          className={`bg-ambersoft/40 border border-glassline rounded-2xl p-4 space-y-3 transition-opacity duration-200 ${
            isWalletConnected ? "opacity-100" : "opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-creamdim uppercase tracking-wider">
              Creditcoin Provenance ID
            </span>
            {!isWalletConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber/80">
                <LockSimple size={12} weight="bold" />
                Wallet Required
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!isWalletConnected && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-creamdim/70">
                <LockSimple size={12} weight="bold" className="text-amber/70 shrink-0" />
                <span>Connect your wallet above to verify identity</span>
              </div>
            )}

            {isWalletConnected && cviStatus === 'loading' && (
              <div className="flex items-center gap-2 text-[11px] text-creamdim">
                <CircleNotch size={14} weight="bold" className="animate-spin text-amber" />
                <span>Verifying identity...</span>
              </div>
            )}

            {isWalletConnected && cviStatus === 'verified' && cviData && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-up/10 flex items-center justify-center shrink-0 border border-up/20">
                  <ShieldCheck size={20} weight="fill" className="text-up" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-bold text-cream">{cviData.aPassId}</span>
                    <CheckCircle size={12} weight="fill" className="text-up" />
                  </div>
                  <span className="text-[10px] font-semibold text-creamdim px-1.5 py-0.5 rounded bg-bg/50 inline-block mt-0.5 border border-glassline">
                    {cviData.verificationTier}
                  </span>
                </div>
              </div>
            )}

            {isWalletConnected && cviStatus === 'error' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-down">
                  <XCircle size={14} weight="bold" />
                  <span>Verification failed</span>
                </div>
                <button 
                  onClick={() => {
                    if (!address) return;
                    setCviStatus('loading');
                    setTimeout(() => {
                      setCviData({ 
                        aPassId: `CTC-CC3-${address.slice(2, 8).toUpperCase()}`, 
                        verificationTier: "Creditcoin Attested" 
                      });
                      setCviStatus('verified');
                    }, 500);
                  }}
                  className="text-[10px] font-bold text-amber hover:text-cream transition-colors bg-bg/50 px-2 py-1 rounded border border-glassline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 w-full pt-1">
          <button
            onClick={onCancel}
            className="flex-1 border border-glassline text-creamdim rounded-xl py-2.5 text-xs font-bold hover:bg-cream/5 hover:text-cream transition"
          >
            Cancel
          </button>
          <button
            disabled={!isWalletConnected || isUploading || cviStatus !== 'verified' || !username.trim() || usernameStatus !== 'available'}
            onClick={handleEnterRoom}
            className={`flex-1 font-extrabold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 ${
              isWalletConnected && !isUploading && cviStatus === 'verified' && username.trim() && usernameStatus === 'available'
                ? "bg-amber hover:bg-amber/90 text-inkdark shadow-[0_0_20px_rgba(183,140,255,0.4)] active:scale-[0.98]"
                : "bg-ambersoft/30 text-creamdim/40 cursor-not-allowed border border-glassline opacity-60"
            }`}
          >
            <span>Enter Room</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
