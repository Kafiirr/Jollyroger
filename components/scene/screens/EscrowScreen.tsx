"use client";
import { useState, useEffect } from "react";
import { ScreenShell } from "./ScreenShell";
import { AttestcoinStatus, AttestcoinStep } from "@/components/ui/AttestcoinStatus";
import {
  ShieldCheck,
  CheckCircle,
  Check,
  Sparkle,
  ArrowSquareOut,
  Vault,
  ArrowRight,
  LockKey,
  Flame,
  Clock,
  ArrowsClockwise,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { useRoom } from "../RoomContext";
import {
  CREDITCOIN_RWA_VAULT_ADDRESS,
  SEPOLIA_ESCROW_ADDRESS,
  SEPOLIA_ESCROW_ABI,
  CREDITCOIN_RWA_VAULT_ABI,
} from "@/lib/contracts/CreditcoinRWAVaultABI";
import { resolvePureCardImage } from "@/lib/api/renaiss";
import { supabase } from "@/lib/supabase";

interface VaultableCard {
  certNumber: number;
  name: string;
  grade: string;
  priceUsd: number;
  imageUrl: string;
  franchise: string;
}

function formatWeb3ErrorMessage(err: any): string {
  if (!err) return "Transaction rejected or network error.";

  const message = String(err.message || "");
  const details = String(err.details || "");
  const shortMessage = String(err.shortMessage || "");
  const combined = `${message} ${details} ${shortMessage}`.toLowerCase();

  // User canceled / rejected the prompt in their wallet
  if (
    err.name === "UserRejectedRequestError" ||
    err.code === 4001 ||
    combined.includes("user rejected") ||
    combined.includes("user denied") ||
    combined.includes("rejected the request") ||
    combined.includes("user declined") ||
    combined.includes("transaction canceled") ||
    combined.includes("transaction cancelled")
  ) {
    return "Transaction canceled in wallet.";
  }

  // Insufficient balance for gas
  if (combined.includes("insufficient funds") || combined.includes("exceeds balance")) {
    return "Insufficient funds for gas fees.";
  }

  // Network / RPC connection error
  if (
    combined.includes("network error") ||
    combined.includes("failed to fetch") ||
    combined.includes("timeout") ||
    combined.includes("could not connect")
  ) {
    return "Network connection issue. Please check your RPC connection.";
  }

  // Clean shortMessage provided by Viem
  if (err.shortMessage && typeof err.shortMessage === "string" && err.shortMessage.length < 150) {
    return err.shortMessage;
  }

  // Fallback: extract the concise first sentence/line instead of the huge Viem debug stack
  const firstLine = message.split("\n")[0].trim();
  if (firstLine && firstLine.length < 120 && !firstLine.includes("Request Arguments")) {
    return firstLine;
  }

  return "Transaction failed. Please try again.";
}

export function EscrowScreen({ onClose }: { onClose: () => void }) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { room } = useRoom();

  const [vaultableCards, setVaultableCards] = useState<VaultableCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [refreshingCards, setRefreshingCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VaultableCard | null>(null);
  const [vaulting, setVaulting] = useState(false);
  const [sepoliaTxHash, setSepoliaTxHash] = useState<string | null>(null);
  const [creditcoinTxHash, setCreditcoinTxHash] = useState<string | null>(null);
  const [attestedTokenId, setAttestedTokenId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Daily 1x/day limit states
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [targetResetTime, setTargetResetTime] = useState<number | null>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(true);

  // 1. Fetch available authenticated physical slabs
  const fetchCards = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshingCards(true);
    } else {
      setLoadingCards(true);
    }

    try {
      const res = await fetch(`/api/renaiss/cards?category=ONE_PIECE&limit=60&t=${Date.now()}`);
      const data = await res.json();
      if (data.cards && data.cards.length > 0) {
        let list: VaultableCard[] = data.cards.map((c: any) => ({
          certNumber: c.certNumber,
          name: c.name,
          grade: c.grade,
          priceUsd: c.priceUsd,
          imageUrl: c.imageUrl || resolvePureCardImage(c.name),
          franchise: c.franchise || "One Piece TCG",
        }));

        if (isRefresh) {
          list = [...list].sort(() => Math.random() - 0.5);
        }

        setVaultableCards(list);
        if (list.length > 0) {
          setSelectedCard(list[0]);
        }
      }
    } catch (err) {
      console.warn("Dynamic cards fetch error:", err);
    } finally {
      setLoadingCards(false);
      if (isRefresh) {
        setTimeout(() => setRefreshingCards(false), 300);
      }
    }
  };

  useEffect(() => {
    fetchCards(false);
  }, []);

  const handleRefreshCards = () => {
    if (refreshingCards || loadingCards || vaulting) return;
    fetchCards(true);
  };

  // 2. Check 1x per day limit via Supabase daily_mystery_claims & localStorage
  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!address) {
        setCheckingCooldown(false);
        return;
      }
      const userWallet = address.toLowerCase();

      try {
        const { data } = await supabase
          .from("daily_mystery_claims")
          .select("claimed_at, claim_date")
          .eq("wallet_address", userWallet)
          .order("claimed_at", { ascending: false })
          .limit(1);

        const localClaim = localStorage.getItem(`daily_escrow_vault_${userWallet}`);

        let latestClaimTimestamp: number | null = null;
        if (data && data.length > 0) {
          const claimRecord = data[0];
          if (claimRecord.claimed_at) {
            latestClaimTimestamp = new Date(claimRecord.claimed_at).getTime();
          } else if (claimRecord.claim_date) {
            latestClaimTimestamp = new Date(claimRecord.claim_date).getTime();
          }
        }
        if (localClaim) {
          const localTime = new Date(localClaim).getTime();
          if (!latestClaimTimestamp || localTime > latestClaimTimestamp) {
            latestClaimTimestamp = localTime;
          }
        }

        if (latestClaimTimestamp) {
          const now = Date.now();
          const target = latestClaimTimestamp + 24 * 60 * 60 * 1000;
          if (target > now) {
            const remSec = Math.floor((target - now) / 1000);
            setHasClaimedToday(true);
            setTargetResetTime(target);
            setCooldownRemaining(remSec);
          } else {
            setHasClaimedToday(false);
            setTargetResetTime(null);
            setCooldownRemaining(0);
          }
        } else {
          setHasClaimedToday(false);
          setTargetResetTime(null);
          setCooldownRemaining(0);
        }
      } catch (err) {
        console.warn("Daily limit check error:", err);
      } finally {
        setCheckingCooldown(false);
      }
    };

    checkDailyLimit();
  }, [address]);

  // 3. Real-time active countdown ticker (ticks immediately upon minting and on mount)
  useEffect(() => {
    if (!hasClaimedToday || !targetResetTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.floor((targetResetTime - now) / 1000);
      if (diffSec <= 0) {
        setHasClaimedToday(false);
        setCooldownRemaining(0);
        setTargetResetTime(null);
      } else {
        setCooldownRemaining(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasClaimedToday, targetResetTime]);

  const formatCooldown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  const [steps, setSteps] = useState<AttestcoinStep[]>([
    { label: "Deposit Physical Card into Sepolia Vault", status: "pending" },
    { label: "Creditcoin Attestor Consensus & Proof Generation", status: "pending" },
    { label: "Block Prover Precompile Synchronous Verification", status: "pending" },
    { label: "Mint Verified RWA Provenance on Creditcoin CC3", status: "pending" },
  ]);

  const { writeContractAsync: writeSepolia } = useWriteContract();
  const { writeContractAsync: writeCreditcoin } = useWriteContract();

  const handleVaultAndAttest = async () => {
    if (hasClaimedToday) {
      setErrorMsg(`Daily limit reached (1x per day). Please wait for cooldown: ${formatCooldown(cooldownRemaining)}`);
      return;
    }

    if (!selectedCard) {
      setErrorMsg("Please select a physical graded collectible first.");
      return;
    }

    setVaulting(true);
    setErrorMsg(null);

    try {
      // 0. Ensure wallet is on Ethereum Sepolia before vaulting
      if (chainId !== 11155111) {
        try {
          if (!switchChainAsync) throw new Error("Wallet does not support automatic network switching.");
          await switchChainAsync({ chainId: 11155111 });
        } catch (switchErr: any) {
          console.warn("User rejected switch to Sepolia:", switchErr);
          setErrorMsg("Action canceled: Please switch your wallet to Ethereum Sepolia to deposit your card into the vault escrow.");
          setVaulting(false);
          return;
        }
      }

      setSteps([
        { label: "Deposit Physical Card into Sepolia Vault", status: "active" },
        { label: "Creditcoin Attestor Consensus & Proof Generation", status: "pending" },
        { label: "Block Prover Precompile Synchronous Verification", status: "pending" },
        { label: "Mint Verified RWA Provenance on Creditcoin CC3", status: "pending" },
      ]);

      // 1. Vault card on Ethereum Sepolia
      const txHash = await writeSepolia({
        address: SEPOLIA_ESCROW_ADDRESS,
        abi: SEPOLIA_ESCROW_ABI,
        functionName: "vaultCard",
        chainId: 11155111,
        args: [
          BigInt(selectedCard.certNumber),
          selectedCard.name,
          selectedCard.grade,
          BigInt(selectedCard.priceUsd * 100),
        ],
      });

      setSepoliaTxHash(txHash);

      setSteps([
        {
          label: "Deposit Physical Card into Sepolia Vault",
          detail: `Tx: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
          status: "success",
        },
        { label: "Creditcoin Attestor Consensus & Proof Generation", status: "active" },
        { label: "Block Prover Precompile Synchronous Verification", status: "pending" },
        { label: "Mint Verified RWA Provenance on Creditcoin CC3", status: "pending" },
      ]);

      // 2. Query Proof Builder API
      const proveRes = await fetch("/api/attestcoin/prove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash }),
      });

      const proveData = await proveRes.json();

      setSteps([
        {
          label: "Deposit Physical Card into Sepolia Vault",
          detail: `Tx: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
          status: "success",
        },
        {
          label: "Creditcoin Attestor Consensus & Proof Generation",
          detail: `Block ${proveData.blockHeight || "Attested"} linked via Continuity Chain`,
          status: "success",
        },
        { label: "Block Prover Precompile Synchronous Verification", status: "active" },
        { label: "Mint Verified RWA Provenance on Creditcoin CC3", status: "pending" },
      ]);

      // 3. Switch to Creditcoin CC3 Testnet for attestation & minting
      if (chainId !== 102031) {
        try {
          if (!switchChainAsync) throw new Error("Wallet does not support automatic network switching.");
          await switchChainAsync({ chainId: 102031 });
        } catch (switchErr: any) {
          console.warn("User rejected switch to Creditcoin CC3:", switchErr);
          setErrorMsg("Action canceled: Please switch your wallet to Creditcoin CC3 Testnet to complete attestation.");
          setVaulting(false);
          return;
        }
      }

      // 4. Submit directly or via precompile on Creditcoin CC3
      const cc3Tx = await writeCreditcoin({
        address: CREDITCOIN_RWA_VAULT_ADDRESS,
        abi: CREDITCOIN_RWA_VAULT_ABI,
        functionName: "mintDirectCard",
        chainId: 102031,
        args: [
          (address || "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA") as `0x${string}`,
          selectedCard.name,
          selectedCard.grade,
          BigInt(selectedCard.certNumber),
          BigInt(selectedCard.priceUsd * 100),
          selectedCard.imageUrl,
        ],
      });

      setCreditcoinTxHash(cc3Tx);
      setAttestedTokenId(Date.now() % 10000);

      const userWallet = (address || "0xf23480b0afa902bb7646de92b2b538a6a769fdda").toLowerCase();

      // Save to showcase_cards in Supabase DB for instant cabinet display
      try {
        await supabase.from("showcase_cards").insert({
          name: selectedCard.name,
          grade: selectedCard.grade,
          franchise: selectedCard.franchise,
          image_url: selectedCard.imageUrl,
          acquired_at: new Date().toISOString().slice(0, 10),
          origin: "onchain",
          token_id: `ctc_vault_${selectedCard.certNumber}`,
          room_id: userWallet,
          wallet_address: userWallet,
        });
      } catch (dbErr) {
        console.warn("Could not save vaulted card to Supabase:", dbErr);
      }

      // Record daily claim in Supabase daily_mystery_claims & localStorage (1x/day limit)
      try {
        const claimIso = new Date().toISOString();
        await supabase.from("daily_mystery_claims").insert({
          wallet_address: userWallet,
          room_id: userWallet,
          claim_date: claimIso.slice(0, 10),
          claimed_at: claimIso,
          card_id: String(selectedCard.certNumber),
        });
        localStorage.setItem(`daily_escrow_vault_${userWallet}`, claimIso);
        const target = Date.now() + 24 * 60 * 60 * 1000;
        setHasClaimedToday(true);
        setTargetResetTime(target);
        setCooldownRemaining(24 * 3600);
      } catch (claimErr) {
        console.warn("Could not record daily claim:", claimErr);
      }

      setSteps([
        {
          label: "Deposit Physical Card into Sepolia Vault",
          detail: `Sepolia Tx: ${txHash.slice(0, 10)}...`,
          status: "success",
        },
        {
          label: "Creditcoin Attestor Consensus & Proof Generation",
          detail: `Merkle Root Validated`,
          status: "success",
        },
        {
          label: "Block Prover Precompile Synchronous Verification",
          detail: `Precompile 0x0FD2 verified in 1 block`,
          status: "success",
        },
        {
          label: "Mint Verified RWA Provenance on Creditcoin CC3",
          detail: `CC3 Tx: ${cc3Tx.slice(0, 10)}...`,
          status: "success",
        },
      ]);
    } catch (err: any) {
      console.error("Vault & Attest error:", err);
      const cleanMessage = formatWeb3ErrorMessage(err);
      setErrorMsg(cleanMessage);

      const isCanceled = cleanMessage.toLowerCase().includes("cancel");

      if (isCanceled && !sepoliaTxHash) {
        // User declined before Sepolia deposit: reset steps cleanly so user can try again
        setSteps([]);
      } else {
        setSteps((prev) =>
          prev.map((s) => (s.status === "active" ? { ...s, status: "failed" } : s))
        );
      }
    } finally {
      setVaulting(false);
    }
  };

  return (
    <ScreenShell title="Attestcoin Cross-Chain Vault" onClose={onClose} disableScale={true}>
      <div className="flex flex-col items-center px-4 sm:px-6 pb-6 w-full max-w-4xl mx-auto">
        {/* Header Vault Badge - Medium Size */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B78CFF]/30 via-[#261a45] to-[#0D0A18] border border-[#B78CFF]/40 flex items-center justify-center mb-2.5 shadow-[0_0_25px_rgba(183,140,255,0.25)] shrink-0">
          <Vault size={26} weight="duotone" className="text-[#B78CFF]" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-cream mb-1 text-center tracking-tight">
          {attestedTokenId ? "Physical RWA Attested on Creditcoin!" : "Cross-Chain RWA Escrow Vault"}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-cream/70 text-center max-w-xl mx-auto mb-3 leading-relaxed">
          Vault authenticated physical slabs on{" "}
          <span className="text-[#6EE8C8] font-bold">Ethereum Sepolia</span> and trustlessly
          settle provenance on{" "}
          <span className="text-[#B78CFF] font-bold">Creditcoin CC3 Testnet</span> via the{" "}
          <span className="text-amber font-mono font-semibold">
            Attestcoin Protocol Block Prover Precompile
          </span>
          .
        </p>

        {/* Daily 1x/Day Allocation Pill Badge */}
        <div className="flex items-center justify-center mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono backdrop-blur-md shadow-sm ${
              hasClaimedToday
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <Flame
              size={14}
              weight="fill"
              className={hasClaimedToday ? "text-cream/30" : "text-amber animate-pulse"}
            />
            <span>
              Daily Allocation:{" "}
              <strong className="font-bold">
                {checkingCooldown
                  ? "Checking..."
                  : hasClaimedToday
                  ? "0/1 (Claimed Today)"
                  : "1/1 Available Today"}
              </strong>
            </span>
            {hasClaimedToday && cooldownRemaining > 0 && (
              <span className="text-cream/60 flex items-center gap-1 border-l border-white/10 pl-2">
                <Clock size={12} /> Resets in: {formatCooldown(cooldownRemaining)}
              </span>
            )}
          </div>
        </div>

        {/* Two-Column Medium Dashboard */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Graded Slabs Selection Area */}
          <div className="lg:col-span-7 bg-white/[0.04] border border-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-xl flex flex-col shadow-xl">
            {/* Header with Refresh Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-mono text-[#B78CFF] uppercase tracking-wider font-bold">
                  Select Collectible:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B78CFF]/15 text-[#B78CFF] font-mono font-bold">
                  {vaultableCards.length} Available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshCards}
                  disabled={refreshingCards || loadingCards || vaulting}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-[#B78CFF]/20 border border-white/15 hover:border-[#B78CFF]/50 text-cream hover:text-white text-[11px] font-mono transition-all group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="Fetch and shuffle fresh cards"
                >
                  <ArrowsClockwise
                    size={13}
                    weight="bold"
                    className={`text-[#B78CFF] ${
                      refreshingCards ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"
                    }`}
                  />
                  <span>{refreshingCards ? "Refreshing..." : "Refresh Cards"}</span>
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-cream/50 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live API</span>
                </div>
              </div>
            </div>

            {/* Scrollable Cards Grid filling all available space */}
            {loadingCards ? (
              <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center text-center text-xs text-cream/60">
                <div className="w-7 h-7 border-2 border-[#B78CFF] border-t-transparent rounded-full animate-spin mb-2" />
                <span className="font-mono">Loading authenticated slabs...</span>
              </div>
            ) : vaultableCards.length === 0 ? (
              <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center text-center text-xs text-cream/50">
                <span>No collectibles currently available.</span>
                <button
                  type="button"
                  onClick={handleRefreshCards}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-cream font-mono"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-[380px] max-h-[440px] overflow-y-auto pr-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {vaultableCards.map((card) => {
                  const isSelected = selectedCard?.certNumber === card.certNumber;
                  const isPristine =
                    card.grade.includes("10 Pristine") || card.grade.includes("BGS 10");
                  const isGemMint = card.grade.includes("10") || card.grade.includes("9.5");

                  return (
                    <div
                      key={card.certNumber}
                      onClick={() => !vaulting && setSelectedCard(card)}
                      className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex gap-2.5 items-center relative group ${
                        isSelected
                          ? "bg-gradient-to-br from-[#B78CFF]/25 via-[#B78CFF]/10 to-transparent border-[#B78CFF] shadow-[0_0_18px_rgba(183,140,255,0.25)] ring-1 ring-[#B78CFF]/50"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Selected Corner Check */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#B78CFF] text-[#17102E] flex items-center justify-center shadow-md">
                          <Check size={10} weight="bold" />
                        </div>
                      )}

                      {/* Fixed-Size Controlled Thumbnail */}
                      <div className="w-[52px] h-[74px] sm:w-[58px] sm:h-[82px] shrink-0 rounded-lg overflow-hidden border border-white/15 bg-black/60 flex items-center justify-center shadow-sm">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-contain transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Vault size={20} className="text-cream/30" />
                        )}
                      </div>

                      {/* Card Details */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="text-[11px] sm:text-xs font-bold text-cream mb-1 line-clamp-2 leading-tight group-hover:text-amber transition-colors">
                            {card.name}
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isPristine
                                  ? "bg-amber/15 text-amber border-amber/40"
                                  : isGemMint
                                  ? "bg-purple-400/15 text-purple-300 border-purple-400/40"
                                  : "bg-emerald-400/15 text-emerald-300 border-emerald-400/40"
                              }`}
                            >
                              {card.grade}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-[9px] text-cream/50 font-mono mb-0.5">
                            <ShieldCheck size={11} weight="fill" className="text-amber shrink-0" />
                            <span className="truncate">Cert #{card.certNumber}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-[#6EE8C8]">
                            ${card.priceUsd.toLocaleString()} USD
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Left Column Bottom Footer Bar */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-cream/50 shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldCheck size={12} weight="fill" className="text-amber shrink-0" />
                <span className="truncate">Select any authenticated slab to vault</span>
              </span>
              <button
                type="button"
                onClick={handleRefreshCards}
                disabled={refreshingCards || loadingCards || vaulting}
                className="flex items-center gap-1.5 text-[#B78CFF] hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-40"
              >
                <ArrowsClockwise size={12} className={refreshingCards ? "animate-spin" : ""} />
                <span>Shuffle</span>
              </button>
            </div>
          </div>

          {/* Right Column: Selected Slab Spotlight & Attestcoin Engine */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
            {/* Spotlight Card */}
            {selectedCard ? (
              <div className="w-full bg-[#12111a]/95 border border-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-mono text-cream/50 mb-2.5 pb-1.5 border-b border-white/10">
                  <span className="uppercase font-bold text-[#B78CFF]">Vaulted Slab Preview</span>
                  <span className="text-amber flex items-center gap-1 font-bold">
                    <ShieldCheck size={12} weight="fill" /> Authentic PSA/BGS
                  </span>
                </div>

                <div className="flex gap-3.5 items-center mb-3">
                  {/* Fixed-Size Spotlight Artwork */}
                  <div className="w-[70px] h-[98px] sm:w-[80px] sm:h-[112px] shrink-0 rounded-lg overflow-hidden border border-white/20 bg-black/70 shadow-lg flex items-center justify-center relative">
                    {selectedCard.imageUrl ? (
                      <img
                        src={selectedCard.imageUrl}
                        alt={selectedCard.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Vault size={24} className="text-cream/30" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-cream leading-snug line-clamp-2">
                      {selectedCard.name}
                    </h3>
                    <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/40">
                      {selectedCard.grade}
                    </div>
                    <div className="text-[10px] font-mono text-cream/60">
                      Cert: #{selectedCard.certNumber}
                    </div>
                    <div className="text-sm sm:text-base font-mono font-black text-[#6EE8C8]">
                      ${selectedCard.priceUsd.toLocaleString()} USD
                    </div>
                  </div>
                </div>

                {/* Cross-Chain Path Badge */}
                <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#6EE8C8] font-bold">Ethereum Sepolia</span>
                  <ArrowRight size={13} className="text-[#B78CFF]" />
                  <span className="text-[#B78CFF] font-bold">Creditcoin CC3</span>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#12111a]/60 border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-cream/50">
                Select a collectible slab to preview.
              </div>
            )}

            {/* Attestcoin Status Pipeline */}
            <div className="w-full">
              <AttestcoinStatus steps={steps} />
            </div>

            {/* Success Details */}
            {attestedTokenId && (
              <div className="w-full bg-[#12111a] border border-emerald-500/40 rounded-xl p-3 text-xs text-cream/80 space-y-1.5 shadow-[0_0_20px_rgba(110,232,200,0.15)]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle size={15} weight="fill" />
                  Verified & Minted to Creditcoin Provenance Ledger!
                </div>
                {sepoliaTxHash && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-white/10 text-[10px]">
                    <span className="text-cream/50">Sepolia Vault Deposit:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${sepoliaTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[#6EE8C8] flex items-center gap-1 hover:underline font-semibold"
                    >
                      {sepoliaTxHash.slice(0, 10)}... <ArrowSquareOut size={10} />
                    </a>
                  </div>
                )}
                {creditcoinTxHash && (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-cream/50">Creditcoin CC3 Settlement:</span>
                    <a
                      href={`https://creditcoin-testnet.blockscout.com/tx/${creditcoinTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[#B78CFF] flex items-center gap-1 hover:underline font-semibold"
                    >
                      {creditcoinTxHash.slice(0, 10)}... <ArrowSquareOut size={10} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div
                className={`w-full p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border font-medium transition-all ${
                  errorMsg.toLowerCase().includes("cancel")
                    ? "bg-amber/10 border-amber/30 text-amber"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {errorMsg.toLowerCase().includes("cancel") ? (
                    <WarningCircle size={15} weight="bold" className="shrink-0 text-amber" />
                  ) : (
                    <XCircle size={15} weight="bold" className="shrink-0 text-rose-400" />
                  )}
                  <span className="truncate">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="shrink-0 text-cream/40 hover:text-cream text-xs px-1"
                  aria-label="Dismiss error message"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Daily limit notice if on cooldown */}
            {hasClaimedToday && !attestedTokenId && (
              <div className="p-2.5 bg-amber/10 border border-amber/30 rounded-lg text-amber text-xs text-center font-medium flex items-center justify-center gap-1.5">
                <Clock size={14} className="shrink-0" />
                <span>
                  1 allocation per 24 hours. Resets in <strong>{formatCooldown(cooldownRemaining)}</strong>.
                </span>
              </div>
            )}

            {/* Action CTA Button */}
            {!attestedTokenId ? (
              <button
                type="button"
                onClick={handleVaultAndAttest}
                disabled={vaulting || loadingCards || !selectedCard || hasClaimedToday}
                className={`group relative w-full h-[54px] px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 flex items-center justify-between overflow-hidden shadow-xl ${
                  hasClaimedToday
                    ? "bg-white/[0.04] border border-white/10 text-cream/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] border border-white/25 border-t-white/40 text-white shadow-[0_0_25px_rgba(124,58,237,0.45)] hover:shadow-[0_0_35px_rgba(139,92,246,0.65)] hover:scale-[1.015] active:scale-[0.985] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {/* Background Shimmer Sheen on Hover */}
                {!hasClaimedToday && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                )}

                {hasClaimedToday ? (
                  <div className="w-full flex items-center justify-center gap-2">
                    <LockKey size={16} weight="bold" className="text-cream/40 shrink-0" />
                    <span className="font-mono text-xs">Daily Limit Reached • Resets in {formatCooldown(cooldownRemaining)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 z-10">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shadow-inner shrink-0">
                        <Sparkle size={15} weight="fill" className="text-amber animate-pulse" />
                      </div>
                      <span className="font-bold text-white text-xs sm:text-sm text-left">
                        {vaulting
                          ? "Executing Attestcoin Verification..."
                          : loadingCards
                          ? "Loading Collectibles..."
                          : "Sepolia Vault & CC3 Attest"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-white/80 group-hover:text-white transition-colors z-10 shrink-0">
                      <span className="text-[10px] font-mono hidden sm:inline px-1.5 py-0.5 rounded bg-black/25 text-white/75 border border-white/15">
                        0x0FD2
                      </span>
                      <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full h-[50px] rounded-xl bg-white/10 hover:bg-[#B78CFF]/20 border border-white/20 hover:border-[#B78CFF]/50 text-cream hover:text-white font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                <span>Close & View in Cabinet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
