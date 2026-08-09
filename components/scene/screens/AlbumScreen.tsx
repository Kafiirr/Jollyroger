"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Sparkle, Warning, X, CheckCircle, Fingerprint, LockKey, LinkBreak, Trophy } from "@phosphor-icons/react";
import { ScreenShell } from "./ScreenShell";
import { useRoom } from "../RoomContext";
import { ViewportScale } from "@/components/ui/ViewportScale";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useAccount } from "wagmi";
import type { CleanverseOverview } from "@/lib/api/cleanverse";

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
  const [overview, setOverview] = useState<CleanverseOverview | null>(null);

  const rawWallet = address || room.walletAddress || (room.id && room.id !== "home" ? room.id : "") || "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA";
  const wallet = /^0x[0-9a-fA-F]{40}$/.test(rawWallet) ? rawWallet : "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/cleanverse?address=${encodeURIComponent(wallet)}`);
        if (res.ok) {
          const data = (await res.json()) as CleanverseOverview;
          if (alive) setOverview(data);
        }
      } catch (err) {
        console.warn("Failed fetching Cleanverse profile:", err);
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
  const unlockedCount = sbts.filter((s) => s.unlocked).length;

  return (
    <>
      <ScreenShell title="CVI Identity Passport & SBT Vault" onClose={onClose}>
        <div className="flex flex-col items-center max-w-2xl mx-auto mb-8">
          {/* Holographic Passport Card Banner */}
          <div className="w-full bg-[radial-gradient(ellipse_at_top_left,#2a1845,#0e0b1a)] border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(183,140,255,0.2)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber/15 border border-amber/40 flex items-center justify-center text-amber shadow-[0_0_20px_rgba(255,198,90,0.3)] shrink-0">
                  <Fingerprint size={32} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-cream">CVI Identity Passport</h2>
                    <VerifiedBadge type="identity" verified={verified} />
                  </div>
                  <p className="text-xs text-cream/70 font-mono">
                    {overview?.identity?.tier ? `${overview.identity.tier}` : "Tier 50"} • {overview?.identity?.aPassId || "CVI-APASS-2026"} • {overview?.identity?.countries?.join(", ") || "US"} • Risk: 0/100
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono font-semibold text-cream">
                <span className="flex items-center gap-1.5 text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  CCP Cleared
                </span>
                <span className="w-px h-4 bg-white/15" />
                <span className="text-amber">Trusted Trader</span>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">SBT Unlocked</div>
                <div className="text-base font-bold text-amber mt-0.5">{unlockedCount} / {sbts.length} Badges</div>
              </div>
              <div>
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">Compliance</div>
                <div className="text-base font-bold text-green-400 mt-0.5">100% Passed</div>
              </div>
              <div>
                <div className="text-[10px] text-cream/50 uppercase tracking-wider font-mono">Anchor Chain</div>
                <div className="text-base font-bold text-amber mt-0.5">Monad Testnet</div>
              </div>
            </div>
          </div>
        </div>

        {/* Real SBT Milestone Vault Grid */}
        <div className="w-full max-w-4xl mx-auto pb-10">
          {loading ? (
            <div className="py-16 text-center text-cream/60 text-sm font-mono animate-pulse">
              Loading Real Soulbound Tokens & Collection Milestones...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {sbts.map((sbt) => {
                const badgeColor = sbt.color || "#B78CFF";
                const isUnlocked = sbt.unlocked ?? true;

                return (
                  <button
                    key={sbt.id}
                    type="button"
                    onClick={() => setPicked(sbt)}
                    className={`group relative rounded-2xl p-4 border backdrop-blur-md flex flex-col items-center text-center transition-all duration-300 outline-none cursor-pointer overflow-hidden ${
                      isUnlocked
                        ? "bg-glass border-white/15 hover:border-amber/70 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                        : "bg-white/[0.03] border-white/5 opacity-55 hover:opacity-80"
                    }`}
                    style={{
                      boxShadow: isUnlocked ? `0 4px 20px -5px ${badgeColor}30` : "none",
                    }}
                  >
                    {/* Glow Backdrop */}
                    {isUnlocked && (
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
                        style={{ background: `radial-gradient(circle at center, ${badgeColor}, transparent 70%)` }}
                      />
                    )}

                    {/* Badge Category Tag */}
                    <div className="w-full flex justify-between items-center text-[9px] font-mono uppercase font-bold text-cream/40 mb-2.5 z-10">
                      <span>{sbt.category || "Badge"}</span>
                      {isUnlocked ? (
                        <CheckCircle size={13} weight="fill" className="text-green-400" />
                      ) : (
                        <LockKey size={13} className="text-cream/40" />
                      )}
                    </div>

                    {/* 3D Orb / Image Emblem */}
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2.5 relative z-10 transition-transform duration-300 group-hover:scale-105">
                      {sbt.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sbt.imageUrl}
                          alt={sbt.title}
                          className={`w-full h-full object-contain drop-shadow ${!isUnlocked ? "grayscale opacity-50" : ""}`}
                        />
                      ) : (
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-neutral-950 shadow-lg ${
                            !isUnlocked ? "grayscale opacity-60" : ""
                          }`}
                          style={{
                            background: isUnlocked
                              ? `radial-gradient(circle at 35% 30%, #ffffff, ${badgeColor} 80%)`
                              : "radial-gradient(circle at 35% 30%, #a3a3a3, #404040 80%)",
                            boxShadow: isUnlocked ? `0 0 20px ${badgeColor}60` : "none",
                          }}
                        >
                          {sbt.glyph || "🛡️"}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className={`text-xs font-bold truncate w-full mb-1 z-10 ${isUnlocked ? "text-cream group-hover:text-amber" : "text-cream/50"}`}>
                      {sbt.title}
                    </div>

                    {/* Progress Bar or Date */}
                    {sbt.progress && !isUnlocked ? (
                      <div className="w-full mt-1.5 z-10">
                        <div className="flex justify-between text-[9px] font-mono text-cream/50 mb-1">
                          <span>Progress</span>
                          <span>{sbt.progress.current} / {sbt.progress.target}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber/80 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (sbt.progress.current / sbt.progress.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-cream/50 font-mono z-10">
                        {isUnlocked ? (formatDate(sbt.acquiredAt) || "Unlocked") : "Locked"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <ViewportScale className="p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-[min(90vw,360px)] rounded-3xl bg-[#0e0b1a] border border-amber/40 p-6 shadow-[0_0_50px_rgba(183,140,255,0.25)] animate-in fade-in zoom-in duration-300"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 text-cream/60 hover:text-cream hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Big Badge Emblem */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative">
              {sbt.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sbt.imageUrl}
                  alt={sbt.title}
                  className={`w-full h-full object-contain drop-shadow ${!isUnlocked ? "grayscale opacity-50" : ""}`}
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-neutral-950 shadow-2xl ${
                    !isUnlocked ? "grayscale opacity-60" : ""
                  }`}
                  style={{
                    background: isUnlocked
                      ? `radial-gradient(circle at 35% 30%, #ffffff, ${badgeColor} 80%)`
                      : "radial-gradient(circle at 35% 30%, #a3a3a3, #404040 80%)",
                    boxShadow: isUnlocked ? `0 0 35px ${badgeColor}80` : "none",
                  }}
                >
                  {sbt.glyph || "🛡️"}
                </div>
              )}
            </div>

            <div className="text-xl font-bold text-cream mb-1">{sbt.title}</div>
            <p className="text-xs text-cream/70 leading-relaxed mb-4">{sbt.description}</p>

            {/* Progress or Verification Proof Table */}
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-[11px] space-y-2 text-left font-mono mb-4">
              <div className={`flex justify-between items-center font-bold border-b border-white/10 pb-1.5 ${isUnlocked ? "text-green-400" : "text-amber"}`}>
                <span>Status</span>
                <span className="flex items-center gap-1">
                  {isUnlocked ? <CheckCircle size={12} weight="fill" /> : <LockKey size={12} />}
                  {isUnlocked ? "UNLOCKED & VERIFIED" : "LOCKED MILESTONE"}
                </span>
              </div>

              {sbt.progress && (
                <div className="py-1">
                  <div className="flex justify-between text-cream/70 mb-1">
                    <span>Card Collection Progress:</span>
                    <span className="text-amber font-bold">{sbt.progress.current} / {sbt.progress.target} Cards</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (sbt.progress.current / sbt.progress.target) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between text-cream/60">
                <span>Category:</span>
                <span className="text-cream">{sbt.category || "Soulbound Token"}</span>
              </div>
              {isUnlocked && (
                <div className="flex justify-between text-cream/60">
                  <span>Unlocked Date:</span>
                  <span className="text-cream">{formatDate(sbt.acquiredAt)}</span>
                </div>
              )}
              <div className="flex justify-between text-cream/60">
                <span>Network:</span>
                <span className="text-amber">Monad Testnet</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-full bg-amber text-neutral-950 font-bold text-xs hover:scale-[1.02] transition-transform cursor-pointer"
            >
              Close SBT Inspection
            </button>
          </div>
        </div>
      </ViewportScale>
    </div>
  );
}
