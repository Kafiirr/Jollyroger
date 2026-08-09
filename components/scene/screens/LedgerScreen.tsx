"use client";
import { useState, useEffect } from "react";
import { ScreenShell } from "./ScreenShell";
import { FileText, LinkBreak, Stamp } from "@phosphor-icons/react";
import { useRoom } from "../RoomContext";
import { keccak256, toHex } from "viem";

import { useAccount } from "wagmi";

interface ShowcaseCardDto {
  tokenId: string;
  name: string;
  grade: string;
  franchise: string;
  acquiredAt?: string;
}

export function LedgerScreen({ onClose }: { onClose: () => void }) {
  const { room, isOwnRoom } = useRoom();
  const { address } = useAccount();
  const [cards, setCards] = useState<ShowcaseCardDto[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const target = (address || (room.walletAddress && room.walletAddress.startsWith("0x") ? room.walletAddress : "") || "").toLowerCase();
      if (!target || !target.startsWith("0x")) {
        setCards([]);
        return;
      }
      try {
        const res = await fetch(`/api/showcase?user=${encodeURIComponent(target)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.cards) {
          setCards(data.cards);
        }
      } catch (err) {
        console.error("Failed to fetch ledger cards", err);
      }
    })();
    return () => { alive = false; };
  }, [room.walletAddress, address]);

  const ledgerItems = cards.map((card) => {
    const cvaAssetId = `cva_${card.tokenId.slice(0, 10)}`;
    const hashData = `${cvaAssetId}:${card.name}:${card.acquiredAt}`;
    const traceabilityHash = keccak256(toHex(hashData));
    
    return {
      id: `tx-${card.tokenId}`,
      date: card.acquiredAt || new Date().toISOString().slice(0, 10),
      action: "RWA Asset Minted",
      asset: card.name,
      cvaAssetId,
      hash: `${traceabilityHash.slice(0, 6)}...${traceabilityHash.slice(-4)}`,
      status: "Verified",
    };
  });
  return (
    <ScreenShell title="Provenance Ledger" onClose={onClose}>
      <div className="w-[min(92vw,600px)] max-h-[80vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent rounded-xl px-2 pb-4">
        <div className="flex flex-col gap-4">
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4 backdrop-blur-md">
            <h3 className="text-lg font-bold text-cream flex items-center gap-2 mb-2">
              <FileText size={24} className="text-amber" />
              Traceability Archive
            </h3>
            <p className="text-sm text-cream/70">
              This ledger contains the immutable chain of custody for all RWA assets in this room, secured by Monad Testnet and audited by Cleanverse CCP.
            </p>
          </div>

          <div className="relative pl-6 ml-8 border-l-2 border-white/10 space-y-8">
            {ledgerItems.length === 0 && <div className="text-cream/50 text-sm">No assets found in ledger.</div>}
            {ledgerItems.map((tx, idx) => (
              <div key={tx.id} className="relative pr-2">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-glass border-2 border-amber shadow-[0_0_10px_rgba(255,198,90,0.5)] z-10" />
                
                <div className="bg-glass border border-glassline rounded-lg p-4 backdrop-blur-sm transition-colors hover:bg-white/10 cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[10px] text-amber font-mono font-bold uppercase tracking-wider mb-1">
                        {tx.date}
                      </div>
                      <h4 className="text-cream font-bold">{tx.action}</h4>
                    </div>
                    <div className="px-2 py-1 rounded bg-green-400/20 text-green-400 text-[10px] font-bold uppercase flex items-center gap-1 border border-green-400/30">
                      <Stamp size={12} />
                      {tx.status}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-cream/80 flex items-center gap-2">
                    <span className="font-semibold">{tx.asset}</span>
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-[10px] text-cream/50">
                      <span>CVA Asset ID</span>
                      <span className="font-mono text-cream/80">{tx.cvaAssetId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-cream/50">
                      <span>Traceability Hash</span>
                      <span className="font-mono text-amber flex items-center gap-1">
                        {tx.hash}
                        <LinkBreak size={10} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </ScreenShell>
  );
}
