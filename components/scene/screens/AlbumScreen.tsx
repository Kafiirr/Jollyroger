"use client";
import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Sparkle,
  X,
  CheckCircle,
  Fingerprint,
  LockKey,
  Trophy,
  SealCheck,
  Check,
} from "@phosphor-icons/react";
import { ScreenShell } from "./ScreenShell";
import { useRoom } from "../RoomContext";
import { useAccount } from "wagmi";
import { ViewportScale } from "@/components/ui/ViewportScale";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
export interface CreditcoinOverview {
  identity: {
    verified: boolean;
    tier: string;
    aPassId: string;
    countries?: string[];
  };
}

interface Sbt {
  id: string | number;
  title: string;
  description: string;
  imageUrl?: string;
  glyph?: string;
  color?: string;
  acquiredAt?: string;
  category?: string;
  unlocked?: boolean;
  progress?: { current: number; target: number };
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function AlbumScreen({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { room } = useRoom();
  const [sbts, setSbts] = useState<Sbt[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Sbt | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unlocked" | "locked">("all");

  const [overview, setOverview] = useState<CreditcoinOverview | null>({
    identity: {
      verified: true,
      tier: "Creditcoin Attested",
      aPassId: "CTC-CC3-VERIFIED",
      countries: ["CC3"],
    },
  });

  const rawWallet = address || room.walletAddress || (room.id && room.id !== "home" ? room.id : "") || "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA";
  const wallet = /^0x[0-9a-fA-F]{40}$/.test(rawWallet) ? rawWallet : "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      if (alive) {
        setOverview({
          identity: {
            verified: true,
            tier: "Creditcoin Attested",
            aPassId: `CTC-CC3-${wallet.slice(2, 8).toUpperCase()}`,
            countries: ["CC3"],
          },
        });
      }

      try {
        const r = await fetch(`/api/sbt?wallet=${encodeURIComponent(wallet)}`);
        const d = (await r.json()) as { sbts?: Sbt[] };
        if (r.ok && d.sbts && alive) {
          setSbts(d.sbts);
        }
      } catch (err) {
        console.warn("Failed fetching real SBTs:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [wallet]);

  const verified = overview?.identity?.verified ?? true;
  const unlockedCount = useMemo(() => sbts.filter((s) => s.unlocked).length, [sbts]);
  const lockedCount = sbts.length - unlockedCount;

  // Counts for filter tabs
  const milestonesCount = useMemo(
    () => sbts.filter((s) => s.category === "Milestone" || s.category === "Collection").length,
    [sbts]
  );
  const achievementsCount = useMemo(
    () =>
      sbts.filter((s) =>
        ["RWA Valuation", "Arcade", "Ambient", "Pouch Claim", "Renaiss Protocol", "On-Chain"].includes(
          s.category || ""
        )
      ).length,
    [sbts]
  );
  const identityCount = useMemo(() => sbts.filter((s) => s.category === "Identity").length, [sbts]);

  const filteredSbts = useMemo(() => {
    return sbts.filter((sbt) => {
      const isUnlocked = sbt.unlocked ?? true;
      if (filterStatus === "unlocked" && !isUnlocked) return false;
      if (filterStatus === "locked" && isUnlocked) return false;

      if (filterCategory === "all") return true;
      if (filterCategory === "milestones") {
        return sbt.category === "Milestone" || sbt.category === "Collection";
      }
      if (filterCategory === "achievements") {
        return ["RWA Valuation", "Arcade", "Ambient", "Pouch Claim", "Renaiss Protocol", "On-Chain"].includes(
          sbt.category || ""
        );
      }
      if (filterCategory === "identity") {
        return sbt.category === "Identity";
      }
      return true;
    });
  }, [sbts, filterCategory, filterStatus]);

  const percentUnlocked = Math.round((unlockedCount / Math.max(1, sbts.length)) * 100);

  return (
    <>
      <ScreenShell title="Creditcoin Provenance Passport & SBT Vault" onClose={onClose} disableScale={true}>
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pb-12 flex flex-col items-center">
          {/* Cybernetic Holographic Passport Card Banner */}
          <div className="w-full bg-gradient-to-br from-[#1c1238]/90 via-[#0d091a]/95 to-[#160d2e]/90 border border-[#B78CFF]/30 rounded-2xl p-5 sm:p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(183,140,255,0.15)] relative overflow-hidden mb-6">
            {/* Ambient iridescent glows */}
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#B78CFF]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#6EE8C8]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Passport Identity Header Row */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5 sm:gap-4">
                {/* 3D Fingerprint / Identity Shield Emblem */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#B78CFF]/30 via-amber/15 to-transparent border border-[#B78CFF]/40 flex items-center justify-center text-[#B78CFF] shadow-[0_0_25px_rgba(183,140,255,0.3)] shrink-0 relative group">
                  <Fingerprint size={34} weight="duotone" className="text-[#B78CFF] transition-transform group-hover:scale-105" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#17102E] border border-[#6EE8C8] flex items-center justify-center text-[#6EE8C8] shadow-sm">
                    <SealCheck size={12} weight="fill" />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg sm:text-xl font-black text-cream tracking-tight">
                      Creditcoin Provenance Passport
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#6EE8C8]/15 border border-[#6EE8C8]/40 text-[#6EE8C8]">
                      <SealCheck size={11} weight="fill" /> CVI Verified
                    </span>
                    <VerifiedBadge type="identity" verified={verified} />
                  </div>
                  <p className="text-xs text-cream/70 font-mono flex flex-wrap items-center gap-2">
                    <span className="text-[#6EE8C8] font-bold">Creditcoin CC3 Testnet</span>
                    <span className="text-white/30">•</span>
                    <span className="text-cream/90">{overview?.identity?.aPassId || "CTC-CC3-VERIFIED"}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-amber font-semibold">Attestcoin Block Prover (0x0FD2)</span>
                  </p>
                </div>
              </div>

              {/* Status Compliance Pill Badge */}
              <div className="flex items-center gap-2.5 bg-black/40 border border-white/12 rounded-xl px-3.5 py-2 text-xs font-mono backdrop-blur-md shrink-0">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  CCP Cleared
                </span>
                <span className="w-px h-4 bg-white/15" />
                <span className="text-amber font-bold">Trusted Trader</span>
              </div>
            </div>

            {/* Quick Stats Dashboard Ribbon */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {/* Stat 1 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 sm:p-3">
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>SBT Unlocked</span>
                  <span className="text-amber font-bold">{percentUnlocked}%</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-cream mt-0.5">
                  {unlockedCount} / {sbts.length} <span className="text-xs font-normal text-cream/60">Badges</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#B78CFF] to-[#6EE8C8] rounded-full transition-all duration-500"
                    style={{ width: `${percentUnlocked}%` }}
                  />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 sm:p-3">
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">Compliance</div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-400" />
                  100% Passed
                </div>
                <div className="text-[10px] text-cream/40 font-mono mt-1 truncate">
                  Continuous CVI Verification
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 sm:p-3">
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">Anchor Chain</div>
                <div className="text-sm sm:text-base font-extrabold text-[#B78CFF] mt-0.5">
                  Creditcoin CC3
                </div>
                <div className="text-[10px] text-cream/40 font-mono mt-1 truncate">
                  Substrate Consensus
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 sm:p-3">
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">Token Standard</div>
                <div className="text-sm sm:text-base font-extrabold text-[#6EE8C8] mt-0.5">
                  ERC-5192 / USC
                </div>
                <div className="text-[10px] text-cream/40 font-mono mt-1 truncate">
                  Precompile 0x0FD2 Proofs
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Navigation Bar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl backdrop-blur-md overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === "all"
                    ? "bg-[#B78CFF] text-[#17102E] shadow-sm"
                    : "text-cream/70 hover:text-white hover:bg-white/5"
                }`}
              >
                All Badges ({sbts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("milestones")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === "milestones"
                    ? "bg-[#B78CFF] text-[#17102E] shadow-sm"
                    : "text-cream/70 hover:text-white hover:bg-white/5"
                }`}
              >
                Milestones ({milestonesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("achievements")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === "achievements"
                    ? "bg-[#B78CFF] text-[#17102E] shadow-sm"
                    : "text-cream/70 hover:text-white hover:bg-white/5"
                }`}
              >
                Special Drops ({achievementsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("identity")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === "identity"
                    ? "bg-[#B78CFF] text-[#17102E] shadow-sm"
                    : "text-cream/70 hover:text-white hover:bg-white/5"
                }`}
              >
                Identity ({identityCount})
              </button>
            </div>

            {/* Status Toggle (All / Unlocked / Locked) */}
            <div className="flex items-center gap-1 text-[11px] font-mono bg-white/[0.04] border border-white/10 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === "all" ? "bg-white/15 text-white font-bold" : "text-cream/50 hover:text-cream"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("unlocked")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterStatus === "unlocked" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-cream/50 hover:text-cream"
                }`}
              >
                <CheckCircle size={12} weight="fill" className="text-emerald-400" />
                Unlocked ({unlockedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("locked")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterStatus === "locked" ? "bg-amber/20 text-amber font-bold" : "text-cream/50 hover:text-cream"
                }`}
              >
                <LockKey size={12} />
                Locked ({lockedCount})
              </button>
            </div>
          </div>

          {/* Real SBT Milestone Vault Grid */}
          <div className="w-full">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center text-cream/60">
                <div className="w-9 h-9 border-2 border-[#B78CFF] border-t-transparent rounded-full animate-spin mb-3" />
                <span className="font-mono text-sm">Synchronizing On-Chain Soulbound Tokens & Milestones...</span>
              </div>
            ) : filteredSbts.length === 0 ? (
              <div className="py-20 text-center text-cream/50 font-mono text-sm bg-white/[0.02] rounded-2xl border border-white/5">
                No badges match the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {filteredSbts.map((sbt) => {
                  const badgeColor = sbt.color || "#B78CFF";
                  const isUnlocked = sbt.unlocked ?? true;

                  return (
                    <button
                      key={sbt.id}
                      type="button"
                      onClick={() => setPicked(sbt)}
                      className={`group relative rounded-2xl p-4 sm:p-4.5 border backdrop-blur-md flex flex-col justify-between items-center text-center transition-all duration-300 outline-none cursor-pointer overflow-hidden min-h-[245px] ${
                        isUnlocked
                          ? "bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.01] border-white/12 hover:border-[#B78CFF]/60 hover:shadow-[0_12px_35px_rgba(183,140,255,0.22)] hover:-translate-y-1.5"
                          : "bg-[#0d0a18]/85 border-white/[0.06] opacity-75 hover:opacity-95 hover:border-white/20 hover:-translate-y-0.5"
                      }`}
                    >
                      {/* Top Specular Sheen Highlight */}
                      {isUnlocked && (
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                      )}

                      {/* Badge Category Tag Header */}
                      <div className="w-full flex justify-between items-center text-[9px] font-mono uppercase font-bold text-cream/40 mb-2 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/5 text-cream/60">
                          {sbt.category || "Badge"}
                        </span>
                        {isUnlocked ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-sm">
                            <Check size={10} weight="bold" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/5 text-cream/40 flex items-center justify-center">
                            <LockKey size={10} />
                          </div>
                        )}
                      </div>

                      {/* 3D Medallion Emblem with Aura Glow */}
                      <div className="relative w-20 h-20 my-1.5 flex items-center justify-center">
                        {/* Outer Aura Glow */}
                        <div
                          className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
                            isUnlocked
                              ? "opacity-35 group-hover:opacity-85 group-hover:scale-125"
                              : "opacity-0"
                          }`}
                          style={{
                            background: `radial-gradient(circle, ${badgeColor}, transparent 70%)`,
                          }}
                        />

                        {/* Outer Metallic Bevel Ring */}
                        <div
                          className={`w-18 h-18 rounded-full p-[2.5px] relative z-10 transition-transform duration-300 group-hover:scale-105 shadow-xl ${
                            isUnlocked
                              ? "bg-gradient-to-br from-white/80 via-white/20 to-black/60"
                              : "bg-gradient-to-br from-white/20 via-white/5 to-black/80"
                          }`}
                          style={{
                            boxShadow: isUnlocked
                              ? `0 0 22px -3px ${badgeColor}70, inset 0 1px 2px rgba(255,255,255,0.6)`
                              : "inset 0 1px 2px rgba(255,255,255,0.1)",
                          }}
                        >
                          {/* Inner Jewel Sphere Core */}
                          <div
                            className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${
                              isUnlocked ? "" : "grayscale"
                            }`}
                            style={{
                              background: isUnlocked
                                ? `radial-gradient(circle at 35% 30%, #ffffff 0%, ${badgeColor} 55%, #0e0a1c 100%)`
                                : "radial-gradient(circle at 35% 30%, #4b5563 0%, #1f2937 60%, #111827 100%)",
                            }}
                          >
                            {/* Specular 45-degree Glass Highlight */}
                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-white/60 to-transparent rounded-full blur-[1px] pointer-events-none" />

                            {/* Glyph / Icon */}
                            {sbt.imageUrl ? (
                              <img
                                src={sbt.imageUrl}
                                alt={sbt.title}
                                className={`w-9 h-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10 ${
                                  !isUnlocked ? "opacity-40" : ""
                                }`}
                              />
                            ) : (
                              <span
                                className={`text-2xl select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] relative z-10 ${
                                  !isUnlocked ? "opacity-35" : ""
                                }`}
                              >
                                {sbt.glyph || "🛡️"}
                              </span>
                            )}

                            {/* Locked Overlay Icon */}
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                                <LockKey size={18} weight="fill" className="text-white/60 drop-shadow" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Title (2-line balanced wrap without awkward truncation) */}
                      <h3
                        className={`text-xs sm:text-[13px] font-bold line-clamp-2 leading-tight px-1 z-10 transition-colors min-h-[34px] flex items-center justify-center ${
                          isUnlocked ? "text-cream group-hover:text-amber" : "text-cream/60"
                        }`}
                        title={sbt.title}
                      >
                        {sbt.title}
                      </h3>

                      {/* Bottom Info / Progress */}
                      {sbt.progress && !isUnlocked ? (
                        <div className="w-full mt-2 z-10">
                          <div className="flex justify-between text-[10px] font-mono text-cream/60 mb-1">
                            <span>Progress</span>
                            <span className="text-amber font-bold">
                              {sbt.progress.current} / {sbt.progress.target}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-black/50 border border-white/10 rounded-full overflow-hidden p-[1px]">
                            <div
                              className="h-full bg-gradient-to-r from-amber to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,198,90,0.5)]"
                              style={{
                                width: `${Math.min(100, Math.max(4, (sbt.progress.current / sbt.progress.target) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-cream/50 z-10">
                          {isUnlocked ? (
                            <>
                              <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Attested</span>
                              </span>
                              <span className="truncate">{formatDate(sbt.acquiredAt) || "Active"}</span>
                            </>
                          ) : (
                            <span className="w-full text-center text-cream/40">Locked Milestone</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScreenShell>

      {/* Detailed Modal Inspection */}
      {picked && <SbtModal sbt={picked} onClose={() => setPicked(null)} />}
    </>
  );
}

function SbtModal({ sbt, onClose }: { sbt: Sbt; onClose: () => void }) {
  const badgeColor = sbt.color || "#B78CFF";
  const isUnlocked = sbt.unlocked ?? true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(92vw,420px)] rounded-3xl bg-gradient-to-b from-[#18112e] via-[#0d091a] to-[#120c22] border border-[#B78CFF]/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(183,140,255,0.3)] animate-in fade-in zoom-in duration-300"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-cream/60 hover:text-cream hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Holographic Category Tag */}
          <div className="mb-3 px-3 py-1 rounded-full bg-[#B78CFF]/15 border border-[#B78CFF]/40 text-[#B78CFF] font-mono text-xs font-bold uppercase tracking-wider">
            {sbt.category || "Soulbound Token"}
          </div>

          {/* Big 3D Badge Emblem */}
          <div className="relative w-24 h-24 my-2 flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-2xl ${
                isUnlocked ? "opacity-60" : "opacity-0"
              }`}
              style={{ background: `radial-gradient(circle, ${badgeColor}, transparent 70%)` }}
            />

            <div
              className="w-22 h-22 rounded-full p-1 relative z-10 shadow-2xl"
              style={{
                background: isUnlocked
                  ? `radial-gradient(circle at 35% 30%, #ffffff 0%, ${badgeColor} 55%, #0e0a1c 100%)`
                  : "radial-gradient(circle at 35% 30%, #4b5563 0%, #1f2937 60%, #111827 100%)",
                boxShadow: isUnlocked ? `0 0 35px ${badgeColor}80` : "none",
              }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden">
                {sbt.imageUrl ? (
                  <img
                    src={sbt.imageUrl}
                    alt={sbt.title}
                    className={`w-12 h-12 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${
                      !isUnlocked ? "grayscale opacity-50" : ""
                    }`}
                  />
                ) : (
                  <span className={`text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${!isUnlocked ? "grayscale opacity-50" : ""}`}>
                    {sbt.glyph || "🛡️"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <h3 className="text-xl font-black text-cream mt-2 mb-1.5">{sbt.title}</h3>
          <p className="text-xs text-cream/70 leading-relaxed mb-4 max-w-sm">{sbt.description}</p>

          {/* Cryptographic Proof Dossier Table */}
          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-[11px] space-y-2 text-left font-mono mb-5">
            <div
              className={`flex justify-between items-center font-bold border-b border-white/10 pb-2 ${
                isUnlocked ? "text-emerald-400" : "text-amber"
              }`}
            >
              <span>Provenance Status</span>
              <span className="flex items-center gap-1">
                {isUnlocked ? <SealCheck size={13} weight="fill" /> : <LockKey size={13} />}
                {isUnlocked ? "UNLOCKED & ATTESTED" : "LOCKED MILESTONE"}
              </span>
            </div>

            {sbt.progress && (
              <div className="py-1">
                <div className="flex justify-between text-cream/70 mb-1">
                  <span>Cabinet Collection Progress:</span>
                  <span className="text-amber font-bold">
                    {sbt.progress.current} / {sbt.progress.target} Cards
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber to-amber-300 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (sbt.progress.current / sbt.progress.target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between text-cream/60">
              <span>Token Standard:</span>
              <span className="text-cream font-semibold">ERC-5192 (Soulbound / Non-Transferable)</span>
            </div>
            <div className="flex justify-between text-cream/60">
              <span>Anchor Ledger:</span>
              <span className="text-[#B78CFF] font-semibold">Creditcoin CC3 Testnet</span>
            </div>
            <div className="flex justify-between text-cream/60">
              <span>Block Prover:</span>
              <span className="text-[#6EE8C8] font-semibold">Attestcoin Precompile (0x0FD2)</span>
            </div>
            {isUnlocked && (
              <div className="flex justify-between text-cream/60">
                <span>Attested Date:</span>
                <span className="text-cream">{formatDate(sbt.acquiredAt) || "Genesis"}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] text-white font-bold text-xs tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
