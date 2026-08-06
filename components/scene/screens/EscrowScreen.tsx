"use client";
import { useState, useEffect } from "react";
import { ScreenShell } from "./ScreenShell";
import { CleanverseStatus } from "@/components/ui/CleanverseStatus";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Handshake, LockKey, CheckCircle, Sparkle, Gift, LinkBreak, ShieldCheck, Clock } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { useRoom } from "../RoomContext";

interface MysteryCard {
  id: string;
  name: string;
  grade: string;
  franchise: string;
  priceUsd: number;
  imageUrl: string;
  cvaAssetId: string;
  traceabilityHash: string;
  acquiredAt: string;
  packType?: "gold" | "silver";
  packImage?: string;
}

export function EscrowScreen({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { room } = useRoom();
  const [claiming, setClaiming] = useState(false);
  const [revealedCard, setRevealedCard] = useState<MysteryCard | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [checkingClaim, setCheckingClaim] = useState(true);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic preview toggle between Silver & Gold packs
  const [previewPack, setPreviewPack] = useState<"silver" | "gold">("gold");

  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewPack((prev) => (prev === "gold" ? "silver" : "gold"));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Check 24-hour rolling cooldown status on mount
  useEffect(() => {
    async function checkDailyClaim() {
      setCheckingClaim(true);
      try {
        const wallet = address || room.walletAddress || "0xDemoWallet";
        const roomId = room.id;
        const res = await fetch(`/api/cleanverse/claim-mystery?walletAddress=${encodeURIComponent(wallet)}&roomId=${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (res.ok && data.hasClaimedToday) {
          setAlreadyClaimed(true);
          setRemainingSecs(data.remainingSeconds || 86400);
        } else {
          setAlreadyClaimed(false);
          setRemainingSecs(0);
        }
      } catch (err) {
        console.warn("Failed checking 24-hour cooldown status:", err);
      } finally {
        setCheckingClaim(false);
      }
    }
    checkDailyClaim();
  }, [address, room.walletAddress, room.id]);

  // Live countdown ticker for remaining seconds
  useEffect(() => {
    if (remainingSecs <= 0) return;
    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          setAlreadyClaimed(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSecs]);

  const handleUnwrap = async () => {
    if (alreadyClaimed) return;
    setClaiming(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/cleanverse/claim-mystery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address || room.walletAddress || "0xDemoWallet",
          roomId: room.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.card) {
        setRevealedCard(data.card);
        setAlreadyClaimed(true);
        setRemainingSecs(86400);
      } else {
        setErrorMsg(data.error || "Failed to unwrap mystery card.");
        if (data.error?.includes("Cooldown Active")) {
          setAlreadyClaimed(true);
        }
      }
    } catch (err) {
      console.error("Unwrap mystery card error:", err);
      setErrorMsg("Network error unwrapping mystery card.");
    } finally {
      setClaiming(false);
    }
  };

  const fmtRemaining = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <ScreenShell title="CCP Escrow Pouch" onClose={onClose}>
      <div className="flex flex-col items-center px-4 pb-6">
        <div className="w-16 h-16 rounded-2xl bg-[radial-gradient(ellipse_at_top,#2a2a35,#07070F)] border border-white/10 flex items-center justify-center mb-4 shadow-2xl shrink-0">
          {revealedCard ? (
            <Gift size={32} weight="duotone" className="text-amber animate-bounce" />
          ) : alreadyClaimed ? (
            <Clock size={32} weight="duotone" className="text-amber" />
          ) : (
            <Handshake size={32} weight="duotone" className="text-amber" />
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-cream mb-1 text-center">
          {revealedCard
            ? "Mystery Card Revealed!"
            : alreadyClaimed
            ? "24-Hour Cooldown Active"
            : "Daily Mystery One Piece Drop"}
        </h2>
        <p className="text-xs sm:text-sm text-cream/60 text-center max-w-md mb-5">
          {revealedCard
            ? "Your daily CVA-verified One Piece collectible slab has been minted and added to your showcase cabinet!"
            : alreadyClaimed
            ? `You've already claimed your Daily Mystery Drop! Next drop unlocks in ${fmtRemaining(remainingSecs)}.`
            : "A daily CVA-verified One Piece Mystery Pack is waiting inside your pouch! Unwrap to reveal if you pulled a Silver or Gold tier drop today."}
        </p>

        {/* Single Combined Dual-Pack Mystery Container */}
        {!revealedCard && (
          <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center mb-6 backdrop-blur-md relative overflow-hidden shadow-[0_0_35px_rgba(183,140,255,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-amber/10 to-purple-500/10 pointer-events-none" />

            {/* Floating Silver & Gold Booster Packs */}
            <div className="flex items-center justify-center gap-6 py-3 mb-2">
              {/* Silver Pack */}
              <div className="w-24 h-32 flex items-center justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/game/silvercard1.png"
                  alt="Silver Pack"
                  className={`w-full h-full object-contain transition-all duration-500 ${
                    previewPack === "silver"
                      ? "drop-shadow-[0_0_20px_rgba(148,163,184,0.9)] scale-110"
                      : "drop-shadow-[0_0_8px_rgba(148,163,184,0.3)] opacity-70 scale-95"
                  }`}
                />
              </div>

              {/* Gold Pack */}
              <div className="w-24 h-32 flex items-center justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/game/goldcard1.png"
                  alt="Gold Pack"
                  className={`w-full h-full object-contain transition-all duration-500 ${
                    previewPack === "gold"
                      ? "drop-shadow-[0_0_25px_rgba(255,198,90,0.95)] scale-110 animate-pulse"
                      : "drop-shadow-[0_0_8px_rgba(255,198,90,0.3)] opacity-70 scale-95"
                  }`}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-amber font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <LockKey size={13} />
                Silver & Gold Mystery Drops
              </div>
              <div className="text-sm font-bold text-cream mb-2.5">Graded One Piece Collectible Slab</div>
              
              <div className="flex items-center justify-center gap-2">
                {alreadyClaimed ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber bg-amber/15 px-3 py-1 rounded-full border border-amber/30">
                    <Clock size={13} weight="bold" />
                    Cooldown: {fmtRemaining(remainingSecs)}
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-600/40">
                      <ShieldCheck size={11} />
                      Silver Drop ($80 - $260)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber bg-amber/15 px-2.5 py-0.5 rounded-full border border-amber/30">
                      <Sparkle size={11} weight="fill" />
                      Gold Drop ($320 - $900)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Revealed Mystery Card Container */}
        {revealedCard && (
          <div className="w-full max-w-md bg-glass border border-amber/30 rounded-2xl p-5 flex flex-col items-center mb-6 backdrop-blur-md shadow-[0_0_40px_rgba(183,140,255,0.3)] animate-in fade-in zoom-in duration-500">
            <div className="relative w-56 h-76 sm:w-64 sm:h-88 rounded-2xl overflow-hidden mb-4 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={revealedCard.imageUrl}
                alt={revealedCard.name}
                className="w-full h-full object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] scale-110"
              />
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-purple-950/95 text-amber text-xs font-extrabold border border-amber/50 shadow-lg backdrop-blur-md">
                {revealedCard.grade}
              </div>
              <div
                className={`absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${
                  revealedCard.packType === "gold"
                    ? "bg-amber text-neutral-950 border border-amber/60"
                    : "bg-slate-300 text-slate-950 border border-slate-400"
                }`}
              >
                {revealedCard.packType === "gold" ? "Gold Drop" : "Silver Drop"}
              </div>
            </div>

            <div className="text-lg font-bold text-cream text-center mb-1 leading-snug px-2">{revealedCard.name}</div>
            <div className="text-sm font-bold text-amber font-mono mb-4">Est. FMV: ${revealedCard.priceUsd}</div>

            <div className="w-full pt-3.5 border-t border-white/10 flex flex-col gap-2 text-xs text-cream/70">
              <div className="flex justify-between items-center">
                <span className="font-medium">CVA Asset ID</span>
                <span className="font-mono text-cream font-semibold">{revealedCard.cvaAssetId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Traceability Hash</span>
                <span className="font-mono text-amber font-semibold flex items-center gap-1">
                  {revealedCard.traceabilityHash.slice(0, 8)}...{revealedCard.traceabilityHash.slice(-6)}
                  <LinkBreak size={12} className="ml-1 opacity-70" />
                </span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="w-full max-w-md mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Claim / Unwrap Button Logic */}
        {!claiming && !revealedCard ? (
          alreadyClaimed ? (
            <button
              disabled
              className="w-full max-w-md py-4 rounded-full bg-white/10 border border-white/15 text-cream/50 font-bold text-base tracking-wide cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Clock size={20} weight="bold" />
              Cooldown Active ({fmtRemaining(remainingSecs)})
            </button>
          ) : (
            <button
              onClick={handleUnwrap}
              disabled={checkingClaim}
              className="w-full max-w-md py-4 rounded-full bg-amber text-neutral-900 font-extrabold text-base tracking-wide shadow-[0_0_30px_rgba(255,198,90,0.45)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkle size={20} weight="fill" />
              {checkingClaim ? "Checking Cooldown Status..." : "Unwrap & Mint Daily Mystery Card"}
            </button>
          )
        ) : !revealedCard ? (
          <div className="w-full max-w-md">
            <h3 className="text-sm font-semibold text-cream mb-4 text-center">Unwrapping Daily Mystery Pack...</h3>
            <CleanverseStatus 
              steps={[
                { label: "CVI Identity & Daily Claim Verified", status: "active" },
                { label: "Unwrapping Mystery One Piece Slab", status: "active" },
                { label: "Minting Card to Showcase Cabinet", status: "active" }
              ]} 
            />
          </div>
        ) : (
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="flex items-center gap-2 text-green-400 text-base font-bold mb-3.5">
              <CheckCircle size={22} weight="fill" />
              <span>Added to Showcase Cabinet!</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-glass border border-glassline text-cream font-bold text-sm hover:border-amber hover:text-amber transition-colors cursor-pointer"
            >
              Close & View in Cabinet
            </button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
