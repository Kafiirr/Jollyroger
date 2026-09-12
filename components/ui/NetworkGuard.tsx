"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { WarningCircle, ArrowRight, X } from "@phosphor-icons/react";

export const CREDITCOIN_CHAIN_ID = 102031;
export const SEPOLIA_CHAIN_ID = 11155111;

export function NetworkGuard() {
  const { isConnected, address, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);
  const promptedRef = useRef<number | null>(null);

  const isUnsupported = Boolean(
    isConnected &&
    address &&
    chainId &&
    chainId !== CREDITCOIN_CHAIN_ID &&
    chainId !== SEPOLIA_CHAIN_ID
  );

  // Auto-prompt wallet switch once when user connects on an unsupported network (e.g. Arbitrum, Mainnet)
  useEffect(() => {
    if (!isUnsupported || !switchChainAsync) return;
    if (promptedRef.current === chainId) return; // Only auto-prompt once per network change

    promptedRef.current = chainId ?? null;
    const timer = setTimeout(async () => {
      try {
        await switchChainAsync({ chainId: CREDITCOIN_CHAIN_ID });
      } catch (err) {
        console.warn("Auto-switch to Creditcoin CC3 declined or canceled:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isUnsupported, chainId, switchChainAsync]);

  // Reset dismissed state whenever chainId changes
  useEffect(() => {
    setDismissed(false);
  }, [chainId]);

  if (!isUnsupported || dismissed) return null;

  const handleSwitch = async () => {
    if (!switchChainAsync) return;
    try {
      await switchChainAsync({ chainId: CREDITCOIN_CHAIN_ID });
    } catch (err: any) {
      console.warn("Manual switch declined:", err);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[94vw] sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#1b122c]/95 border border-amber/40 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(183,140,255,0.25)] text-cream">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber/20 border border-amber/40 flex items-center justify-center shrink-0 text-amber">
            <WarningCircle size={18} weight="fill" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-cream">Wrong Network Detected</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-down/20 text-down border border-down/30">
                Chain {chainId}
              </span>
            </div>
            <p className="text-[11px] text-creamdim truncate">
              Switch to Creditcoin CC3 Testnet to interact
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSwitch}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber to-amber/90 hover:from-amber hover:to-amber text-inkdark font-bold text-xs shadow-[0_0_15px_rgba(183,140,255,0.3)] transition active:scale-95 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-inkdark/40 border-t-inkdark rounded-full animate-spin" />
            ) : (
              <>
                <span>Switch</span>
                <ArrowRight size={12} weight="bold" />
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss warning"
            className="w-7 h-7 rounded-xl flex items-center justify-center text-creamdim/60 hover:text-cream hover:bg-white/5 transition cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
