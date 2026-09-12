"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsDownUp,
  Cards,
  CaretDown,
  CaretLeft,
  CaretRight,
  GameController,
  MagnifyingGlassPlus,
  MonitorPlay,
  PencilSimple,
  Plus,
  ShieldCheck,
  Sparkle,
  Trash,
  TrendDown,
  TrendUp,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ROOM_IMG_BRIGHT, ROOM_IMG_NIGHT } from "@/lib/spots";
import { APITCG_GAMES } from "@/lib/api/apitcgGames";
import { Chip } from "@/components/ui/Chip";
import { ViewportScale } from "@/components/ui/ViewportScale";
import { fmtUsd } from "@/lib/mockCards";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { supabase } from "@/lib/supabase";
import { useAccount } from "wagmi";
import { useRoom } from "../RoomContext";
import { CREDITCOIN_RWA_VAULT_ABI, CREDITCOIN_RWA_VAULT_ADDRESS } from "@/lib/contracts/CreditcoinRWAVaultABI";
import { CabinetGallery } from "./CabinetGallery";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AttestcoinStatus } from "@/components/ui/AttestcoinStatus";

/**
*   .
* 👉     . onClose =  .
 *
*   (  ):
*  1.   — ShelfCard  + fetchOnchainCards/lookupCert.
*         API(lib/api/bscscan, lib/api/psa)  .
*  2.   —   Shelves/GradedSlab.
*         ( ).
 *
*  : card.imageUrl        .
*  emoji+tint . (    mockCards )
 */

/* =================   ================= */

type CardOrigin = "onchain" | "physical";

interface ShelfCard {
  id: string;
  name: string;
  grade: string;
  franchise: string;
  emoji: string; //
  tint: string;
  imageUrl?: string; // (: PSA imageUrlFront)
  priceUsd?: number;
/**    — =Renaiss  , =TCGplayer   .    . */
  priceUrl?: string;
  delta30d?: number;
  acquiredAt: string;
/**  (Supabase created_at) — Newest/Oldest  . acquiredAt       */
  createdAt?: string;
  origin: CardOrigin;
  certNumber?: string; // (PSA)
  tokenId?: string; // (Renaiss tokenId)
/** Supabase   ( ) —    /  */
  fromDb?: boolean;
}

/** Renaiss   .
*  /api/showcase =   favoritedCollectibles (   ).   .
*  (/)  fromFallback=true —         .
*  :  API "  "    ID   . */
async function fetchOnchainCards(
  opts: { user?: string; ids?: string[] } = {}
): Promise<{ cards: ShelfCard[]; fromFallback: boolean }> {
  try {
    const qs = opts.ids?.length
      ? `?ids=${opts.ids.map(encodeURIComponent).join(",")}`
      : opts.user
        ? `?user=${encodeURIComponent(opts.user)}`
        : "";
    const res = await fetch(`/api/showcase${qs}`);
    if (res.ok) {
      const { cards } = (await res.json()) as {
        cards: {
          tokenId: string;
          name: string;
          grade: string;
          franchise: string;
          priceUsd?: number;
          acquiredAt?: string;
          imageUrl?: string;
        }[];
      };
      return {
        fromFallback: false,
        cards: cards.map((c, i) => ({
          id: c.tokenId,
          name: c.name,
          grade: c.grade,
          franchise: c.franchise,
          emoji: "🎴",
          tint: TINTS[i % TINTS.length],
          imageUrl: sanitizePureCardUrl(c.imageUrl, c.name),
          priceUsd: c.priceUsd,
          tokenId: c.tokenId, // (/api/showcase?ids=) + Renaiss
          // → Renaiss ()
          priceUrl: c.tokenId ? `https://renaissos.com/card/${c.tokenId}` : undefined,
          acquiredAt: c.acquiredAt ?? "",
          origin: "onchain" as const,
        })),
      };
    }
  } catch {
    //
  }
  return { fromFallback: true, cards: [] };
}

function sanitizePureCardUrl(url?: string | null, name?: string): string | undefined {
  if (!url) return undefined;
  if (
    url.includes("standalone") ||
    url.includes("golden") ||
    url.includes("silver") ||
    url.includes("graded-cards-renders")
  ) {
    const n = (name || "").toLowerCase();
    if (n.includes("hancock")) return "/cards/boa-hancock-manga.png";
    if (n.includes("nami")) return "/cards/nami-op01-sp.png";
    if (n.includes("luffy") || n.includes("gear 5") || n.includes("monkey")) return "/cards/luffy-gear5-manga.png";
    if (n.includes("shanks")) return "/cards/shanks-manga.png";
    if (n.includes("zoro") || n.includes("roronoa")) return "/cards/zoro-manga.png";
    if (n.includes("ace") || n.includes("portgas")) return "/cards/ace-manga.png";
    if (n.includes("law") || n.includes("trafalgar")) return "/cards/law-leader-alt.png";
    const match = n.match(/(OP\d{2}[-\s]?\d{3}|ST\d{2}[-\s]?\d{3}|EB\d{2}[-\s]?\d{3}|P[-\s]?\d{3})/i);
    if (match) {
      const clean = match[1].replace(/[-\s]/g, "");
      const m = clean.match(/^([A-Z]{2,3}\d{2})(\d{3})$/);
      if (m) return `/api/img?url=${encodeURIComponent(`https://en.onepiece-cardgame.com/images/cardlist/card/${m[1]}-${m[2]}.png`)}`;
    }
    return "/cards/luffy-gear5-manga.png";
  }
  return url;
}

/** Supabase showcase_cards   —   (/)   */
interface SavedRow {
  id: string;
  name: string;
  grade: string;
  franchise: string | null;
  image_url: string | null;
  acquired_at: string;
  created_at?: string; // ( )
  origin?: CardOrigin | null; // null → physical
  token_id?: string | null;
}

function rowToCard(r: SavedRow, i: number): ShelfCard {
  return {
    id: r.id,
    name: r.name,
    grade: r.grade,
    franchise: r.franchise ?? "",
    emoji: "🃏",
    tint: TINTS[i % TINTS.length],
    imageUrl: sanitizePureCardUrl(r.image_url, r.name),
    acquiredAt: r.acquired_at,
    createdAt: r.created_at,
    origin: r.origin === "onchain" ? "onchain" : "physical",
    tokenId: r.token_id ?? undefined,
    // → Renaiss (token_id)
    priceUrl:
      r.origin === "onchain" && r.token_id ? `https://renaissos.com/card/${r.token_id}` : undefined,
    fromDb: true,
  };
}

async function fetchSavedCards(walletAddress?: string): Promise<ShelfCard[]> {
  if (!walletAddress || walletAddress === "home") return [];
  const target = walletAddress.toLowerCase();
  const { data, error } = await supabase
    .from("showcase_cards")
    .select("*")
    .or(`room_id.eq.${target},wallet_address.eq.${target}`)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as SavedRow[]).map(rowToCard);
}

/**     — /api/showcase?ids=   */
interface OnchainCardDto {
  tokenId: string;
  name: string;
  grade: string;
  franchise: string;
  priceUsd?: number;
  acquiredAt?: string;
  imageUrl?: string;
}

/**     (apitcg  /api/opcard  ).       . */
interface OpSearchCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity?: string;
  type?: string;
  setName?: string;
/**        / ( ) */
  game?: string;
  franchise?: string;
}

const TINTS = ["#38284A", "#22314A", "#1E3A38", "#46341E", "#1F3D2C"];
const today = () => new Date().toISOString().slice(0, 10).replaceAll("-", ".");

/**  ("YYYY.MM.DD"  ISO)  ("Jul 8, 2026"). UI   .
*   Date(,,)     .     . */
function fmtDate(s: string): string {
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**     —    ( ).   .
*      imageUrl   imageUrl  .
*  - /api/img?url=<>   URL ,   .
*  -    (OP01-016 / ST03-017_p1 / P-061)  (· ).
*  -  ( )  URL  .     null(  ). */
function artKey(imageUrl?: string): string | null {
  if (!imageUrl) return null;
  const m = imageUrl.match(/[?&]url=([^&]+)/);
  const raw = (m ? decodeURIComponent(m[1]) : imageUrl).replace(/\?.*$/, "");
  const code =
    raw.match(/\/([A-Za-z]{1,3}\d{2}-\d{3}(?:_p\d+)?)\.(?:png|jpe?g|webp)/i)?.[1] ??
    raw.match(/\/(P-\d{3}(?:_p\d+)?)\.(?:png|jpe?g|webp)/i)?.[1];
  return code ? code.toUpperCase() : raw;
}

/** Extracts the direct high-res image link from a card (resolving proxied /api/img?url= links). */
function getCardImageLink(card: ShelfCard): string | undefined {
  const url = card.imageUrl || card.priceUrl;
  if (!url) return undefined;
  const m = url.match(/[?&]url=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return url;
    }
  }
  return url;
}

/* =================   ================= */

type SortKey = "newest" | "oldest" | "priceHigh" | "priceLow";
type ModalState = null | { edit: ShelfCard };

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  priceHigh: "Price high",
  priceLow: "Price low",
};

// Newest/Oldest   — created_at( ) ,  acquiredAt().
// acquiredAt         .
const orderKey = (c: ShelfCard) => c.createdAt ?? c.acquiredAt;

/** .  ( )      */
function sortCards(cards: ShelfCard[], sort: SortKey): ShelfCard[] {
  const arr = [...cards];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => orderKey(b).localeCompare(orderKey(a)));
    case "oldest":
      return arr.sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
    case "priceHigh":
      return arr.sort((a, b) => (b.priceUsd ?? -1) - (a.priceUsd ?? -1));
    case "priceLow":
      return arr.sort(
        (a, b) => (a.priceUsd ?? Number.MAX_SAFE_INTEGER) - (b.priceUsd ?? Number.MAX_SAFE_INTEGER)
      );
  }
}

interface PhysicalInput {
  name: string;
  grade: string;
  franchise: string;
  certNumber?: string;
  imageUrl?: string;
}

export function CabinetScreen({ onClose }: { onClose: () => void }) {
  const { room, isOwnRoom } = useRoom(); // —   isOwnRoom=false( )
  const { address } = useAccount();

  const [cards, setCards] = useState<ShelfCard[]>([]);
  const [mintedRwa, setMintedRwa] = useState<{
    cards: Array<{
      id: string;
      name: string;
      grade: string;
      franchise: string;
      priceUsd: number;
      imageUrl: string;
      certNumber: string;
      tokenId: string;
    }>;
    txHash: string;
    creditcoinExplorerUrl?: string;
  } | null>(null);
  const [inspectedCard, setInspectedCard] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState(false); // →
  const [sort, setSort] = useState<SortKey>("newest");
  const [modal, setModal] = useState<ModalState>(null);
  // — (//) + ().     .
  const [originFilter, setOriginFilter] = useState<"all" | "onchain" | "physical">("all");
  const [collection, setCollection] = useState<string | null>(null); // null =
  const [collectionOpen, setCollectionOpen] = useState(false);
  const collRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false); //
  const sortRef = useRef<HTMLDivElement>(null);
  // id  — (visible)  /
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false); // ()  —

  const [unclaimedRewards, setUnclaimedRewards] = useState<{ id: string; score: number; card_count: number } | null>(null);
  const [isMintingUnclaimed, setIsMintingUnclaimed] = useState(false);
  const [mintProgress, setMintProgress] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnRoom || !address) {
      setUnclaimedRewards(null);
      return;
    }
    const wallet = address.toLowerCase();
    supabase
      .from("unclaimed_rewards")
      .select("id, score, card_count")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setUnclaimedRewards(data[0]);
        } else {
          setUnclaimedRewards(null);
        }
      });
  }, [address, isOwnRoom]);

  const handleClaimUnclaimed = async () => {
    if (!unclaimedRewards || !address) return;
    setClaimError(null);
    setIsMintingUnclaimed(true);
    setMintProgress("Preparing cards...");

    try {
      const res = await fetch("/api/attestcoin/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          roomId: room.id,
          score: unclaimedRewards.score,
          count: unclaimedRewards.card_count,
        }),
      });

      if (!res.ok) {
        setClaimError("Failed to prepare mint data.");
        setIsMintingUnclaimed(false);
        return;
      }

      const data = await res.json();
      const cardsToMint = data.cards as Array<{
        id: string;
        name: string;
        grade: string;
        franchise: string;
        priceUsd: number;
        imageUrl: string;
        certNumber: string;
        tokenId: string;
        origin: "physical";
        acquiredAt: string;
      }>;

      setMintProgress(`Seamlessly minting ${cardsToMint.length} card${cardsToMint.length > 1 ? "s" : ""} on Creditcoin CC3 Testnet...`);

      const userRoomId = address.toLowerCase();
      for (const card of cardsToMint) {
        try {
          await supabase.from("showcase_cards").insert({
            name: card.name,
            grade: card.grade,
            franchise: card.franchise,
            image_url: card.imageUrl,
            acquired_at: card.acquiredAt || new Date().toISOString().slice(0, 10),
            origin: "onchain",
            token_id: card.tokenId,
            room_id: userRoomId,
            wallet_address: address.toLowerCase(),
          });
        } catch (dbErr) {
          console.warn("Failed saving card to Supabase DB:", dbErr);
        }
      }

      await supabase.from("unclaimed_rewards").delete().eq("id", unclaimedRewards.id);
      setUnclaimedRewards(null);
      await loadSaved();

      // Show the success modal
      setMintedRwa({
        cards: cardsToMint,
        txHash: data.txHash || "0x",
        creditcoinExplorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${data.txHash || "0x"}`,
      });
    } catch (err) {
      console.warn("Claim error:", err);
      setClaimError("Failed minting cards.");
    } finally {
      setIsMintingUnclaimed(false);
      setMintProgress("");
    }
  };

  const targetWallet = isOwnRoom
    ? (address ? address.toLowerCase() : "")
    : (room.walletAddress ? room.walletAddress.toLowerCase() : room.id.toLowerCase());

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWallet]);

  async function syncWallet() {
    if (!targetWallet) {
      setCards([]);
      return;
    }
    setSyncing(true);
    const dbCards = await fetchSavedCards(targetWallet);
    setCards(dbCards);
    setSyncing(false);
    setSynced(true);
  }

  /** Supabase DB cards loader — loads strictly for the target room/wallet */
  async function loadSaved() {
    if (!targetWallet) {
      setCards([]);
      return;
    }
    const dbCards = await fetchSavedCards(targetWallet);
    setCards(dbCards);
  }

  /** Save card directly into Supabase showcase_cards table */
  async function saveCard(
    input: PhysicalInput & { origin: CardOrigin; tokenId?: string; priceUsd?: number },
    acquiredAt: string
  ) {
    const activeAddress = address ? address.toLowerCase() : targetWallet;
    if (!activeAddress) return;

    let id = `p${Date.now()}`;
    const base = {
      name: input.name,
      grade: input.grade,
      franchise: input.franchise,
      image_url: input.imageUrl ?? null,
      acquired_at: acquiredAt,
      origin: input.origin,
      token_id: input.tokenId ?? null,
      room_id: activeAddress,
      wallet_address: activeAddress,
    };
    const { data } = await supabase
      .from("showcase_cards")
      .insert(base)
      .select("id")
      .single();

    if (data) id = (data as { id: string }).id;
    setCards((prev) => [
      ...prev,
      {
        ...input,
        id,
        acquiredAt,
        emoji: "🃏",
        tint: TINTS[prev.length % TINTS.length],
        priceUrl:
          input.origin === "onchain" && input.tokenId
            ? `https://renaissos.com/card/${input.tokenId}`
            : undefined,
        fromDb: true,
      },
    ]);
    setModal(null);
  }

  async function addPhysical(card: PhysicalInput) {
    // —  /   ,  (  )
    const k = artKey(card.imageUrl);
    if (k && shelfArtKeys.has(k)) {
      setModal(null);
      return;
    }
    await saveCard({ ...card, origin: "physical" }, today());
  }

/**     — ID Renaiss    */
  async function addOnchain(dto: OnchainCardDto) {
    //
    if (cards.some((c) => c.tokenId === dto.tokenId || c.id === dto.tokenId)) {
      setModal(null);
      return;
    }
    await saveCard(
      {
        name: dto.name,
        grade: dto.grade || "Raw",
        franchise: dto.franchise,
        imageUrl: dto.imageUrl,
        origin: "onchain",
        tokenId: dto.tokenId,
        priceUsd: dto.priceUsd,
      },
      dto.acquiredAt ?? today()
    );
  }

/**     —       */
  function updatePhysical(id: string, input: PhysicalInput) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    setModal(null);
    void supabase
      .from("showcase_cards")
      .update({
        name: input.name,
        grade: input.grade,
        franchise: input.franchise,
        image_url: input.imageUrl ?? null,
      })
      .eq("id", id)
      .then();
  }

  // → ·
  function removeCard(id: string) {
    const target = cards.find((c) => c.id === id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    setModal(null);
    if (target?.fromDb) {
      void supabase.from("showcase_cards").delete().eq("id", id).then();
    }
  }

  // —   (  'On shelf'  +  ,   )
  const shelfArtKeys = useMemo(
    () => new Set(cards.map((c) => artKey(c.imageUrl)).filter((k): k is string => !!k)),
    [cards]
  );
  // tokenId   (ID   )
  const shelfTokenIds = useMemo(
    () => new Set(cards.map((c) => c.tokenId).filter((t): t is string => !!t)),
    [cards]
  );

  // ()  —
  const collections = useMemo(
    () => Array.from(new Set(cards.map((c) => c.franchise).filter(Boolean))).sort(),
    [cards]
  );
  // /   (   )
  const hasOnchain = useMemo(() => cards.some((c) => c.origin === "onchain"), [cards]);
  const hasPhysical = useMemo(() => cards.some((c) => c.origin === "physical"), [cards]);

  const visible = useMemo(() => {
    let arr = cards;
    if (originFilter !== "all") arr = arr.filter((c) => c.origin === originFilter);
    if (collection) arr = arr.filter((c) => c.franchise === collection);
    return sortCards(arr, sort);
  }, [cards, sort, originFilter, collection]);

  // (·)
  useEffect(() => {
    if (!collectionOpen && !sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (collRef.current && !collRef.current.contains(t)) setCollectionOpen(false);
      if (sortRef.current && !sortRef.current.contains(t)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [collectionOpen, sortOpen]);

  // —  /
  const selectedIndex = selectedId ? visible.findIndex((c) => c.id === selectedId) : -1;
  const selectedCard = selectedIndex >= 0 ? visible[selectedIndex] : null;

  //
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-bg">
      {/* info = info info. info info "info info(info info) + info info info"
          info, info info info info (info info = info info info info).
          info info info info info info info(ROOM_IMG)info info —
          info info info info spots.tsinfo info info info info. */}
      <RoomBackdrop />

      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Back to room
      </button>

      {/* info(info) info info — info info info. info info info */}
      {visible.length > 0 && (
        <button
          onClick={() => setGallery(true)}
          // : . ( 16:9) Back
          className="fixed top-6 right-6 lg:right-auto lg:left-[152px] z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
        >
          <MonitorPlay size={14} weight="bold" aria-hidden />
          Gallery
        </button>
      )}

      <div
        className={`relative h-full flex flex-col transition-all duration-500 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {/* info — info info info (info info). info info Back·Gallery info info info info
            info info info info info info (info info) */}
        <div className="shrink-0 relative z-20 flex flex-col items-center gap-3 pt-[72px] pb-2 px-6">
          <div className="flex items-center gap-2 flex-wrap justify-center bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3 py-2">
            {/* info — info info (Newest / Oldest / Price high / Price low) */}
            <div ref={sortRef} className="relative">
              <Chip active={sortOpen} onClick={() => setSortOpen((o) => !o)}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowsDownUp size={12} weight="bold" aria-hidden />
                  {SORT_LABELS[sort]}
                  <CaretDown
                    size={11}
                    weight="bold"
                    aria-hidden
                    className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </Chip>
              {sortOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 min-w-[140px] rounded-xl bg-[#0e0b1a]/95 border border-glassline p-1 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
                  {(["newest", "oldest", "priceHigh", "priceLow"] as SortKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setSort(k);
                        setSortOpen(false);
                      }}
                      className={`block w-full text-left text-[12px] rounded-lg px-3 py-1.5 transition ${
                        sort === k ? "bg-amber text-inkdark font-bold" : "text-cream hover:bg-cream/10"
                      }`}
                    >
                      {SORT_LABELS[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* info info — info/info (info info info info) */}
            {synced && hasOnchain && hasPhysical && (
              <>
                <span className="w-px h-4 bg-glassline" aria-hidden />
                <div
                  aria-label="Filter by origin"
                  className="inline-flex items-center rounded-full bg-inkdark/40 border border-glassline p-0.5"
                >
                  {(
                    [
                      ["all", "All"],
                      ["onchain", "On-chain"],
                      ["physical", "Physical"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setOriginFilter(k)}
                      className={`px-2.5 py-1 rounded-full text-[12px] font-bold transition-colors ${
                        originFilter === k
                          ? "bg-amber text-inkdark"
                          : "text-creamdim hover:text-cream"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* info — info info info */}
            {synced && collections.length > 1 && (
              <>
                <span className="w-px h-4 bg-glassline" aria-hidden />
                <div ref={collRef} className="relative">
                  <Chip
                    active={!!collection || collectionOpen}
                    onClick={() => setCollectionOpen((o) => !o)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {collection ?? "Collection"}
                      <CaretDown
                        size={11}
                        weight="bold"
                        aria-hidden
                        className={`transition-transform ${collectionOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </Chip>
                  {collectionOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 min-w-[150px] rounded-xl bg-[#0e0b1a]/95 border border-glassline p-1 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
                      <button
                        onClick={() => {
                          setCollection(null);
                          setCollectionOpen(false);
                        }}
                        className={`block w-full text-left text-[12px] rounded-lg px-3 py-1.5 transition ${
                          !collection ? "bg-amber text-inkdark font-bold" : "text-cream hover:bg-cream/10"
                        }`}
                      >
                        All collections
                      </button>
                      {collections.map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            setCollection(col);
                            setCollectionOpen(false);
                          }}
                          className={`block w-full text-left text-[12px] rounded-lg px-3 py-1.5 transition ${
                            collection === col
                              ? "bg-amber text-inkdark font-bold"
                              : "text-cream hover:bg-cream/10"
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <span className="w-px h-4 bg-glassline" aria-hidden />
            {/* info info info (info info) */}
            <span className="text-[12px] text-creamdim font-semibold px-1">
              {syncing ? "Loading…" : synced ? `${visible.length} cards` : ""}
            </span>
          </div>

          {syncError && (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-creamdim bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3.5 py-1.5">
              <Warning size={13} weight="fill" className="shrink-0 text-down" aria-hidden />
              <span>Couldn&apos;t reach Renaiss. Your registered cards are still shown.</span>
              <button
                onClick={syncWallet}
                disabled={syncing}
                className="text-amber hover:brightness-110 transition disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* info info — info info. info info info info info info info info. info info info info */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 pt-5 pb-10">
          {/* Unclaimed Runner Rewards Banner */}
          {isOwnRoom && unclaimedRewards && (
            <div className="mb-5 p-4 rounded-2xl bg-amber/10 border border-amber/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-[0_0_25px_rgba(183,140,255,0.2)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber/20 flex items-center justify-center text-amber shrink-0 border border-amber/40">
                  <Sparkle size={22} weight="fill" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber">Unclaimed Runner Drop</div>
                  <div className="text-xs sm:text-sm font-medium text-cream mt-0.5">
                    You have <strong className="text-amber font-bold">{unclaimedRewards.card_count}</strong> unminted card drop{unclaimedRewards.card_count > 1 ? "s" : ""} from your game score ({unclaimedRewards.score} cards)!
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-1 shrink-0">
                <button
                  onClick={handleClaimUnclaimed}
                  disabled={isMintingUnclaimed}
                  className="w-full sm:w-auto bg-amber hover:bg-amber/90 text-inkdark font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(183,140,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={16} weight="bold" />
                  <span>{isMintingUnclaimed ? (mintProgress || "Minting...") : `Mint ${unclaimedRewards.card_count} Card${unclaimedRewards.card_count > 1 ? "s" : ""} on Creditcoin CC3`}</span>
                </button>
                {claimError && (
                  <p className="text-[11px] text-down font-medium text-right mt-0.5">{claimError}</p>
                )}
              </div>
            </div>
          )}
          {syncing && cards.length === 0 ? (
            <Shelves
              cards={Array.from({ length: SHELF_MAX * 2 }, () => null)}
              skeleton
              onSelect={() => {}}
            />
          ) : visible.length === 0 ? (
            <div className="h-[52vh] flex flex-col items-center justify-center gap-3 text-creamdim text-sm">
              <Cards size={42} weight="duotone" className="text-amber/80" aria-hidden />
              <p>{isOwnRoom ? "This shelf is empty." : `${room.ownerName} hasn't added any cards yet.`}</p>
              {isOwnRoom && (
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-amber/20 bg-amber/5 px-4 py-2.5">
                  <GameController size={18} weight="fill" className="text-amber shrink-0" aria-hidden />
                  <span className="text-[12px] text-cream/80">
                    Play the game on the <span className="font-bold text-amber">computer</span> to collect cards!
                  </span>
                </div>
              )}
            </div>
          ) : (
            <Shelves
              cards={visible}
              onSelect={(c) => setSelectedId(c.id)}
            />
          )}
        </div>
      </div>

      {/* info info info — info info info info */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,theme(colors.cream/4%)_36%,transparent_44%,transparent_58%,theme(colors.cream/3%)_64%,transparent_70%)]"
      />

      {modal !== null && (
        <RegisterModal
          initial={modal.edit}
          onSubmit={(c) => updatePhysical(modal.edit.id, c)}
          onAddOnchain={addOnchain}
          onSync={syncWallet}
          onRemove={removeCard}
          existingArtKeys={shelfArtKeys}
          existingTokenIds={shelfTokenIds}
          onClose={() => setModal(null)}
        />
      )}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          readOnly={!isOwnRoom}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < visible.length - 1}
          onPrev={() => selectedIndex > 0 && setSelectedId(visible[selectedIndex - 1].id)}
          onNext={() =>
            selectedIndex < visible.length - 1 && setSelectedId(visible[selectedIndex + 1].id)
          }
          onEdit={(c) => {
            setSelectedId(null);
            setModal({ edit: c });
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* gallery (fullscreen) — top level over everything */}
      {gallery && <CabinetGallery cards={visible} onExit={() => setGallery(false)} />}

      {/* Web3 Minted RWA Success Modal */}
      {(isMintingUnclaimed || mintedRwa) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-inkdark/80 backdrop-blur-md p-4">
          <div
            className="relative w-full max-w-[580px] max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cream/20 hover:[&::-webkit-scrollbar-thumb]:bg-cream/40 rounded-panel bg-glass border border-glassline p-6 text-cream shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-5 text-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isMintingUnclaimed ? (
              <div className="py-10 space-y-3 flex flex-col items-center">
                <span className="w-12 h-12 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
                <p className="text-sm text-amber font-bold animate-pulse">{mintProgress || "Minting card(s) on Creditcoin CC3 Testnet..."}</p>
                <p className="text-xs text-creamdim">Transaction initiated...</p>
              </div>
            ) : mintedRwa ? (
              inspectedCard ? (
                /* Detail / Loupe Inspector View */
                <div className="space-y-4 pt-1">
                  {/* Inspector Header */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setInspectedCard(null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cream/5 hover:bg-cream/15 text-cream text-xs font-bold transition-colors"
                    >
                      <CaretLeft size={14} weight="bold" />
                      <span>All Cards</span>
                    </button>

                    {inspectedCard.franchise && (
                      <span className="text-amber text-xs font-bold uppercase tracking-[0.2em]">
                        {inspectedCard.franchise}
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setInspectedCard(null);
                        setMintedRwa(null);
                      }}
                      aria-label="Close"
                      className="w-7 h-7 rounded-full bg-cream/5 hover:bg-cream/15 text-creamdim hover:text-cream flex items-center justify-center transition-colors"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>

                  {/* Card Title & Badges */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-cream px-2">
                      {formatCardTitle(inspectedCard.name)}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber text-inkdark font-extrabold text-xs">
                        {formatGradeShort(inspectedCard.grade)}
                      </span>
                      {inspectedCard.priceUsd ? (
                        <span className="text-sm font-mono font-bold text-up">
                          ${inspectedCard.priceUsd.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Interactive Loupe Hero */}
                  <div className="space-y-2">
                    <CardLoupeInspector imageUrl={inspectedCard.imageUrl} name={inspectedCard.name} />
                    <p className="text-[11px] text-creamdim/80 flex items-center justify-center gap-1.5">
                      <MagnifyingGlassPlus size={13} weight="bold" className="text-amber animate-pulse" />
                      <span>Hover or touch to magnify slab details (2.2× zoom)</span>
                    </p>
                  </div>

                  {/* On-Chain Provenance */}
                  <div className="bg-ambersoft/40 rounded-xl p-3 border border-glassline text-xs font-mono space-y-1.5 text-left text-creamdim">
                    <div className="flex justify-between items-center">
                      <span>Network:</span>
                      <span className="text-cream font-medium">Creditcoin CC3 Testnet</span>
                    </div>
                    {inspectedCard.tokenId && (
                      <div className="flex justify-between items-center">
                        <span>Token ID:</span>
                        <span className="text-amber font-medium truncate max-w-[180px]" title={inspectedCard.tokenId}>
                          #{inspectedCard.tokenId.length > 10 ? `${inspectedCard.tokenId.slice(0, 6)}...${inspectedCard.tokenId.slice(-4)}` : inspectedCard.tokenId}
                        </span>
                      </div>
                    )}
                    {inspectedCard.certNumber && (
                      <div className="flex justify-between items-center">
                        <span>Authentication Cert:</span>
                        <span className="text-cream font-medium">#{inspectedCard.certNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>Provenance Status:</span>
                      <span className="text-up font-bold">VERIFIED ON-CHAIN</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => setInspectedCard(null)}
                      className="flex-1 py-3 rounded-xl border border-glassline hover:bg-cream/5 text-xs font-bold text-cream transition-colors"
                    >
                      All Minted Cards
                    </button>
                    <button
                      onClick={() => {
                        setInspectedCard(null);
                        setMintedRwa(null);
                      }}
                      className="flex-1 bg-amber hover:bg-amber/90 text-inkdark font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(183,140,255,0.4)] active:scale-[0.98]"
                    >
                      View in Cabinet
                    </button>
                  </div>
                </div>
              ) : (
                /* Gallery View */
                <div className="space-y-5 pt-1">
                  <button
                    onClick={() => {
                      setInspectedCard(null);
                      setMintedRwa(null);
                    }}
                    aria-label="Close"
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream/5 hover:bg-cream/15 text-creamdim hover:text-cream flex items-center justify-center transition-colors"
                  >
                    <X size={15} weight="bold" />
                  </button>

                  <div className="text-center">
                    <Eyebrow>Attestcoin RWA Drop</Eyebrow>
                    <h2 className="text-xl font-bold text-cream">Cards Minted On-Chain!</h2>
                    <p className="text-xs text-creamdim mt-0.5">
                      {mintedRwa.cards.length} collectible slab{mintedRwa.cards.length > 1 ? "s" : ""} added to your cabinet
                    </p>
                  </div>

                  {/* Minted Cards Gallery */}
                  <div className={`w-full flex ${mintedRwa.cards.length > 3 ? 'justify-start' : 'justify-center'} items-stretch gap-3.5 overflow-x-auto py-6 px-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-cream/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cream/20 hover:[&::-webkit-scrollbar-thumb]:bg-cream/40 transition-colors`}>
                    {mintedRwa.cards.map((c, i) => (
                      <button
                        key={c.id || i}
                        type="button"
                        onClick={() => setInspectedCard(c)}
                        className="shrink-0 flex-1 min-w-[140px] max-w-[165px] bg-gradient-to-b from-cream/[0.08] to-cream/[0.02] border border-glassline hover:border-amber/60 rounded-2xl p-3 flex flex-col items-center gap-2.5 transition-all duration-200 shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_30px_rgba(183,140,255,0.25)] group text-left relative cursor-pointer active:scale-95"
                      >
                        {/* Inspect hover badge */}
                        <span className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded-full bg-inkdark/90 text-amber text-[9px] font-bold border border-amber/40 flex items-center gap-1 backdrop-blur-sm shadow-md">
                          <MagnifyingGlassPlus size={10} weight="bold" /> Inspect
                        </span>

                        {/* Slab Image */}
                        <div className="w-full aspect-[5/7] relative rounded-xl overflow-hidden border border-cream/15 bg-inkdark/80 select-none shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            draggable={false}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                          />
                        </div>

                        {/* Card Details */}
                        <div className="w-full space-y-1.5 text-center">
                          <p
                            className="text-xs font-bold text-cream truncate w-full group-hover:text-amber transition-colors"
                            title={c.name}
                          >
                            {formatCardTitle(c.name)}
                          </p>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber text-inkdark font-extrabold text-[10px] tracking-wide whitespace-nowrap">
                              {formatGradeShort(c.grade)}
                            </span>
                            {c.priceUsd ? (
                              <span className="text-[11px] font-mono font-bold text-up whitespace-nowrap">
                                ${c.priceUsd.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-creamdim/70 flex items-center justify-center gap-1">
                    <MagnifyingGlassPlus size={13} weight="bold" className="text-amber" />
                    <span>Click any card to inspect slab details with magnifying loupe</span>
                  </p>

                  {/* Provenance Banner */}
                  <div className="w-full bg-ambersoft/40 border border-glassline rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-cream">
                      <span className="w-2 h-2 rounded-full bg-up shadow-[0_0_8px_rgba(110,232,200,0.8)]" />
                      <span className="font-semibold text-cream">Creditcoin CC3 Testnet</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-up/10 text-up border border-up/25 font-bold">
                        VERIFIED ON-CHAIN
                      </span>
                    </div>

                    {mintedRwa.creditcoinExplorerUrl && mintedRwa.txHash && mintedRwa.txHash !== "0x" ? (
                      <a
                        href={mintedRwa.creditcoinExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:text-amber/80 transition-colors"
                      >
                        <span>Creditcoin Explorer</span>
                        <ArrowSquareOut size={13} weight="bold" />
                      </a>
                    ) : (
                      <span className="text-xs text-creamdim">Minted to Showcase</span>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => {
                      setInspectedCard(null);
                      setMintedRwa(null);
                    }}
                    className="w-full bg-amber hover:bg-amber/90 text-inkdark font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(183,140,255,0.4)] active:scale-[0.98]"
                  >
                    View in Cabinet Showcase
                  </button>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

const LOUPE_SIZE = 130;
const MODAL_LOUPE_ZOOM = 1.4;

function CardLoupeInspector({
  imageUrl,
  name,
}: {
  imageUrl: string;
  name: string;
}) {
  const [lens, setLens] = useState<{ x: number; y: number; bgSize: string; bgPos: string } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const zoom = 2.0;
    const dispW = rect.width * zoom;
    const dispH = rect.height * zoom;

    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW}px ${dispH}px`,
      bgPos: `${LOUPE_SIZE / 2 - cx * zoom}px ${LOUPE_SIZE / 2 - cy * zoom}px`,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = touch.clientX - rect.left;
    const cy = touch.clientY - rect.top;
    const zoom = 2.0;
    const dispW = rect.width * zoom;
    const dispH = rect.height * zoom;

    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW}px ${dispH}px`,
      bgPos: `${LOUPE_SIZE / 2 - cx * zoom}px ${LOUPE_SIZE / 2 - cy * zoom}px`,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens(null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setLens(null)}
      className="relative w-[210px] sm:w-[230px] aspect-[5/7] rounded-2xl overflow-hidden cursor-crosshair select-none bg-inkdark/90 border border-cream/20 drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] mx-auto group shadow-[inset_0_1px_0_theme(colors.cream/20%)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        draggable={false}
        className="w-full h-full object-cover pointer-events-none select-none"
      />

      {/* Magnifying Glass Loupe Lens */}
      {lens && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-30 rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.8),0_0_20px_rgba(183,140,255,0.5)] ring-2 ring-white/30"
          style={{
            width: LOUPE_SIZE,
            height: LOUPE_SIZE,
            left: lens.x - LOUPE_SIZE / 2,
            top: lens.y - LOUPE_SIZE / 2,
            backgroundImage: `url(${imageUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: lens.bgSize,
            backgroundPosition: lens.bgPos,
          }}
        />
      )}

      {/* Subtle shine glass effect */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.08)_45%,transparent_55%)] pointer-events-none"
      />
    </div>
  );
}

function formatCardTitle(name: string): string {
  if (!name) return "Collectible Card";
  const cleaned = name
    .replace(/^(?:BGS|PSA|CGC|SGC)\s+\d+(?:\.\d+)?\s*(?:Pristine|Gem Mint|Mint|Near Mint|Authentic)?\s*(?:\d{4})?\s*/i, "")
    .trim();
  return cleaned || name;
}

function formatGradeShort(grade: string): string {
  if (!grade) return "GRADED";
  const match = grade.match(/^(?:PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?/i);
  return match ? match[0] : grade;
}

function useCurrentRoomBg(): string {
  const [bg, setBg] = useState(ROOM_IMG_BRIGHT);

  useEffect(() => {
    const update = () => {
      const forced = new URLSearchParams(window.location.search).get("hour");
      const h = forced !== null && forced !== "" ? Number(forced) : new Date().getHours();
      setBg(h >= 6 && h < 18 ? ROOM_IMG_BRIGHT : ROOM_IMG_NIGHT);
    };
    update();
  }, []);

  return bg;
}

/** Room backdrop component — dynamically matches the active time of day */
function RoomBackdrop() {
  const roomBg = useCurrentRoomBg();

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={roomBg}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03] transition-all duration-500"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
    </div>
  );
}

/* =================   ================= */

function RegisterModal({
  initial,
  onSubmit,
  onAddOnchain,
  onSync,
  onRemove,
  existingArtKeys,
  existingTokenIds,
  onClose,
}: {
/**    —      ,      */
  initial?: ShelfCard;
  onSubmit: (c: PhysicalInput) => void;
  onAddOnchain: (c: OnchainCardDto) => void;
  onSync: () => void;
/**      (    ) */
  onRemove?: (id: string) => void;
/**       —   'On shelf' ·   */
  existingArtKeys: Set<string>;
/**      tokenId — ID     */
  existingTokenIds: Set<string>;
  onClose: () => void;
}) {
  const editing = initial !== undefined;
  const [mode, setMode] = useState<CardOrigin>(editing ? "physical" : "onchain");
  const [name, setName] = useState(initial?.name ?? "");
  // PSA 10 ( 10      ).    .
  const [grade, setGrade] = useState(initial?.grade ?? "PSA 10");
  const [franchise, setFranchise] = useState(initial?.franchise ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  // TCG   (apitcg  /api/opcard) —   ,
  const [gameId, setGameId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpSearchCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // DB()  (  ) —
  const [showImageInput, setShowImageInput] = useState(false);
  // ID
  const [tokenId, setTokenId] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [tokenDup, setTokenDup] = useState(false); //
  // (     )
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetch(
        `/api/opcard?name=${encodeURIComponent(query.trim())}&game=${encodeURIComponent(gameId)}`
      );
      const d = (await res.json()) as { cards?: OpSearchCard[] };
      setResults(res.ok && d.cards ? d.cards : []);
    } catch {
      setResults([]);
    }
    setSearching(false);
    setSearched(true);
  }

/** ID    →  (Renaiss  API /v0/cards/{tokenId}) */
  async function handleAddByTokenId() {
    const id = tokenId.trim();
    if (!id) return;
    // ID
    if (existingTokenIds.has(id)) {
      setTokenDup(true);
      return;
    }
    setTokenLoading(true);
    setTokenError(false);
    setTokenDup(false);
    try {
      const res = await fetch(`/api/showcase?ids=${encodeURIComponent(id)}`);
      const d = (await res.json()) as { cards?: OnchainCardDto[] };
      if (res.ok && d.cards && d.cards.length > 0) {
        // tokenId     (        )
        if (existingTokenIds.has(d.cards[0].tokenId)) {
          setTokenDup(true);
        } else {
          onAddOnchain(d.cards[0]);
        }
      } else {
        setTokenError(true);
      }
    } catch {
      setTokenError(true);
    }
    setTokenLoading(false);
  }

/**   —    /  */
  function switchGame(id: string) {
    setGameId(id);
    setResults([]);
    setSearched(false);
    setPickedId(null);
  }

/**     → ··   ( ) */
  function pickCard(c: OpSearchCard) {
    setPickedId(c.id);
    setName(c.name);
    setImageUrl(c.imageUrl);
    setFranchise(c.franchise ?? APITCG_GAMES.find((g) => g.id === gameId)?.franchise ?? "");
  }

  const inputCls =
    "w-full bg-cream/[0.05] border border-glassline rounded-xl px-3.5 py-2.5 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";

  // ( ).     .
  // ,    URL      .
  const physicalDup =
    !editing && !!artKey(imageUrl.trim() || undefined) &&
    existingArtKeys.has(artKey(imageUrl.trim() || undefined) as string);

  return (
    <div className="fixed inset-0 z-[60] bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <ViewportScale className="p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit card" : "Add a card"}
          tabIndex={-1}
          className="w-[min(92vw,420px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
          onClick={(e) => e.stopPropagation()}
        >
        <h3 className="text-cream font-bold text-lg">{editing ? "Edit card" : "Add a card"}</h3>
        {!editing && (
          <div className="flex gap-2">
            <Chip active={mode === "onchain"} onClick={() => setMode("onchain")}>From Renaiss</Chip>
            <Chip active={mode === "physical"} onClick={() => setMode("physical")}>Physical card</Chip>
          </div>
        )}

        {mode === "onchain" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-creamdim leading-relaxed">
              Cards you showcase on your Renaiss profile load here automatically. Refresh to pull the latest.
            </p>
            <button
              onClick={() => { onSync(); onClose(); }}
              className="inline-flex items-center justify-center gap-1.5 bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition"
            >
              <ArrowsClockwise size={14} weight="bold" aria-hidden />
              Refresh from Renaiss
            </button>
            {/* info info info info — Renaiss tokenIdinfo info info */}
            <div className="flex items-center gap-2" aria-hidden>
              <span className="flex-1 h-px bg-glassline" />
              <span className="text-[10px] font-bold text-creamdim/70 uppercase tracking-wider">
                or add one card
              </span>
              <span className="flex-1 h-px bg-glassline" />
            </div>
            <p className="text-[12px] text-creamdim leading-relaxed -mb-1">
              Paste a token ID from any Renaiss card page to pin that card to your shelf.
            </p>
            <div className="flex gap-2">
              <input
                value={tokenId}
                onChange={(e) => { setTokenId(e.target.value); setTokenError(false); setTokenDup(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddByTokenId()}
                placeholder="Token ID"
                className={inputCls}
              />
              <button
                onClick={handleAddByTokenId}
                disabled={tokenLoading || !tokenId.trim()}
                className="shrink-0 text-[12px] font-bold px-3.5 rounded-xl border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
              >
                {tokenLoading ? "…" : "Add"}
              </button>
            </div>
            {tokenError && (
              <p className="flex items-start gap-1.5 text-[11px] text-creamdim leading-relaxed -mt-1">
                <Warning size={13} weight="fill" className="shrink-0 mt-px text-down" aria-hidden />
                Couldn&apos;t find a card with that token ID.
              </p>
            )}
            {tokenDup && (
              <p className="flex items-start gap-1.5 text-[11px] text-creamdim leading-relaxed -mt-1">
                <Warning size={13} weight="fill" className="shrink-0 mt-px text-amber" aria-hidden />
                This card is already on your shelf.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* info info — info info info, info info info info info */}
            <div className="flex gap-2">
              <GameSelect value={gameId} onChange={switchGame} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={
                  gameId === "all" || APITCG_GAMES.find((g) => g.id === gameId)?.codeSearch
                    ? "Card name or code (e.g. OP01-016)"
                    : "Card name"
                }
                className={inputCls}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="shrink-0 text-[12px] font-bold px-3.5 rounded-xl border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
              >
                {searching ? "…" : "Search"}
              </button>
            </div>

            {/* info info info — info info info info·info info info */}
            {results.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-[188px] overflow-y-auto pr-1">
                {results.map((c) => {
                  // ( ) —     'On shelf'
                  const onShelf = existingArtKeys.has(artKey(c.imageUrl) ?? "");
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => !onShelf && pickCard(c)}
                      disabled={onShelf}
                      aria-disabled={onShelf}
                      title={
                        onShelf
                          ? `${c.name} · already on your shelf`
                          : `${c.name}${c.setName ? ` · ${c.setName}` : ""}`
                      }
                      className={`relative rounded-md overflow-hidden border transition ${
                        onShelf
                          ? "border-glassline opacity-60 cursor-not-allowed"
                          : pickedId === c.id
                            ? "border-amber ring-2 ring-amber"
                            : "border-glassline hover:border-cream/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        draggable={false}
                        className={`w-full aspect-[5/7] object-cover ${onShelf ? "grayscale" : ""}`}
                      />
                      {onShelf && (
                        <span className="absolute inset-x-0 top-0 bg-amber/90 text-inkdark text-[8px] font-bold text-center py-0.5 tracking-wide">
                          On shelf
                        </span>
                      )}
                      {/* info info — info info info info info info info info.
                          info info id info info(SM8b info)info info info info info */}
                      <span className="block text-center text-[9px] font-bold text-creamdim py-0.5 truncate">
                        {c.id.startsWith("jp-") && c.setName ? c.setName : c.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {searched && !searching && results.length === 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-creamdim leading-relaxed -mt-1">
                <Warning size={13} weight="fill" className="shrink-0 mt-px text-down" aria-hidden />
                No cards found. You can still fill in the details manually below.
              </p>
            )}

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Card name" className={inputCls} />
            <div className="flex gap-2">
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade (PSA 10)" className={inputCls} />
              <input value={franchise} onChange={(e) => setFranchise(e.target.value)} placeholder="Franchise" className={inputCls} />
            </div>
            {/* info URLinfo info info info info info.
                info DBinfo info info(info info info)info info URLinfo info info info info info */}
            {showImageInput ? (
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Card image URL"
                className={inputCls}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowImageInput(true)}
                className="self-start text-[11px] font-semibold text-creamdim hover:text-cream transition-colors"
              >
                Can&apos;t find your card? Paste an image URL
              </button>
            )}
            <button
              onClick={() =>
                name.trim() &&
                !physicalDup &&
                onSubmit({
                  name: name.trim(),
                  grade: grade.trim() || "Raw",
                  franchise: franchise.trim(),
                  imageUrl: imageUrl.trim() || undefined,
                })
              }
              disabled={!name.trim() || physicalDup}
              className="bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition disabled:opacity-40"
            >
              {editing ? "Save changes" : physicalDup ? "Already on shelf" : "Add to showcase"}
            </button>
            {/* info — info info. info info info info info info. info info info info info info */}
            {editing && onRemove && initial && (
              <div className="flex items-center justify-center pt-1">
                {confirmingRemove ? (
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="text-creamdim">Remove this card?</span>
                    <button
                      onClick={() => onRemove(initial.id)}
                      className="inline-flex items-center gap-1 text-down hover:brightness-110 transition"
                    >
                      <Trash size={12} weight="bold" aria-hidden />
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmingRemove(false)}
                      className="text-creamdim hover:text-cream transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingRemove(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-down/80 hover:text-down transition-colors"
                  >
                    <Trash size={12} weight="bold" aria-hidden />
                    Remove from showcase
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </ViewportScale>
    </div>
  );
}

/**    —  All games.   ,  .
*    lib/api/apitcgGames.ts (     ) */
function GameSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  //
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const label = value === "all" ? "All games" : APITCG_GAMES.find((g) => g.id === value)?.label;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-full inline-flex items-center gap-1.5 text-[12px] font-bold px-3 rounded-xl bg-cream/[0.05] border border-glassline text-creamdim hover:text-cream transition-colors"
      >
        {label}
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Search game"
          className="absolute left-0 top-[calc(100%+6px)] z-10 w-max min-w-full max-h-[220px] overflow-y-auto bg-inkdark border border-glassline rounded-xl p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          {[{ id: "all", label: "All games" }, ...APITCG_GAMES].map((g) => (
            <li key={g.id} role="option" aria-selected={g.id === value}>
              <button
                type="button"
                onClick={() => { onChange(g.id); setOpen(false); }}
                className={`w-full text-left text-[12px] font-bold px-3 py-2 rounded-lg transition-colors ${
                  g.id === value ? "text-amber bg-ambersoft" : "text-creamdim hover:text-cream hover:bg-cream/[0.05]"
                }`}
              >
                {g.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =================   ================= */

function CardDetail({
  card,
  readOnly = false,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onEdit,
  onClose,
}: {
  card: ShelfCard;
/**  ( ) — ·  */
  readOnly?: boolean;
/**  /    —     */
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
/**    —    (    ) */
  onEdit: (c: ShelfCard) => void;
  onClose: () => void;
}) {
  const up = (card.delta30d ?? 0) >= 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const cardImageLink = getCardImageLink(card);

  useEscapeToClose(onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // ←/→
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext]);

  // (/  ) · .  (readOnly)
  const editable = !readOnly && (card.origin === "physical" || card.fromDb);

  return (
    <div className="fixed inset-0 z-[60] bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <ViewportScale className="p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${card.name} details`}
          tabIndex={-1}
          className="relative w-[min(92vw,400px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col items-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
          onClick={(e) => e.stopPropagation()}
        >
        {/* info info — info info(info info info)info info info info info. info info info */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          disabled={!hasPrev}
          aria-label="Previous card"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-inkdark/60 border border-glassline text-cream backdrop-blur-md transition-colors hover:border-amber hover:text-amber disabled:opacity-20 disabled:pointer-events-none"
        >
          <CaretLeft size={18} weight="bold" aria-hidden />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          disabled={!hasNext}
          aria-label="Next card"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-inkdark/60 border border-glassline text-cream backdrop-blur-md transition-colors hover:border-amber hover:text-amber disabled:opacity-20 disabled:pointer-events-none"
        >
          <CaretRight size={18} weight="bold" aria-hidden />
        </button>

        {/* info info info — info(info) · info(info, info info) · info(info). info info info info info info */}
        <div className="relative w-full flex items-center justify-center min-h-8">
          {/* info(info/info) — info, info info info. info info info */}
          <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-cream/[0.06] border border-glassline text-creamdim">
            {card.origin === "onchain"
              ? "On-chain"
              : `Physical${card.certNumber ? ` · #${card.certNumber}` : ""}`}
          </span>
          {/* info(info) — info, info info info info info */}
          {card.franchise && (
            <span className="px-14 text-center text-amber text-[13px] font-bold uppercase tracking-[0.2em]">
              {card.franchise}
            </span>
          )}
          {/* info(info info) — info info info. info info info */}
          {editable && (
            <button
              onClick={() => onEdit(card)}
              aria-label="Edit card"
              className="absolute right-0 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-creamdim hover:text-amber hover:bg-cream/[0.06] transition-colors"
            >
              <PencilSimple size={15} weight="bold" aria-hidden />
            </button>
          )}
        </div>

        {/* info — info·info info info info info info info info.
            zoomable: info info info info info info info info info info */}
        <div className="w-[210px] drop-shadow-[0_0_35px_theme(colors.amber/30%)]">
          <GradedSlab card={card} large zoomable />
        </div>

        {/* On-Chain & Physical Collectible Provenance */}
        <div className="w-full bg-ambersoft/40 border border-glassline rounded-xl p-3 text-left space-y-2 text-[11px]">
          <div className="flex items-center justify-between font-bold text-cream">
            <span className="flex items-center gap-1.5 text-cream">
              <ShieldCheck size={16} weight="bold" className="text-up" />
              {card.origin === "onchain" ? "On-Chain Provenance" : "Physical Vault Verification"}
            </span>
            <div className="flex items-center gap-1">
              <VerifiedBadge type="asset" verified={true} size="sm" detail={card.tokenId ? `Creditcoin Token: #${card.tokenId}` : "Attestcoin Verified [0x0FD2]"} />
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-[10px] text-creamdim/80 pt-1.5 border-t border-glassline">
            <div className="flex justify-between items-center">
              <span>Network / Layer:</span>
              <span className="text-cream font-medium">Creditcoin CC3 Testnet</span>
            </div>
            {card.tokenId && (
              <div className="flex justify-between items-center">
                <span>Token ID:</span>
                <span className="text-amber font-medium truncate max-w-[140px]" title={card.tokenId}>
                  #{card.tokenId.length > 10 ? `${card.tokenId.slice(0, 6)}...${card.tokenId.slice(-4)}` : card.tokenId}
                </span>
              </div>
            )}
            {card.certNumber && (
              <div className="flex justify-between items-center">
                <span>Authentication Cert:</span>
                <span className="text-cream font-medium">#{card.certNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span>Custody Status:</span>
              <span className="text-up font-semibold">Verified Slab</span>
            </div>
          </div>
        </div>

        {/* info info — info info (info info) */}
        {card.acquiredAt && (
          <div className="text-[12px] text-creamdim font-semibold">{fmtDate(card.acquiredAt)}</div>
        )}

        {(card.priceUsd !== undefined || cardImageLink) && (
          <div className="text-center flex flex-col items-center gap-1.5">
            {card.priceUsd !== undefined && (
              <div className="text-cream text-xl font-extrabold">{fmtUsd(card.priceUsd)}</div>
            )}
            {cardImageLink && (
              <a
                href={cardImageLink}
                target="_blank"
                rel="noopener noreferrer"
                title="View the Card"
                className="text-creamdim text-[13px] font-bold inline-flex items-center gap-1 hover:text-amber transition-colors"
              >
                View the Card
                <ArrowSquareOut size={13} weight="bold" aria-hidden className="opacity-60" />
              </a>
            )}
            {card.delta30d !== undefined && (
              <div
                className={`inline-flex items-center gap-1 text-[12px] font-bold ${up ? "text-up" : "text-down"}`}
              >
                {up ? (
                  <TrendUp size={12} weight="bold" aria-hidden />
                ) : (
                  <TrendDown size={12} weight="bold" aria-hidden />
                )}
                {Math.abs(card.delta30d).toFixed(1)}% · 30d
              </div>
            )}
          </div>
        )}

        </div>
      </ViewportScale>
    </div>
  );
}

/* =================   =================
*       .
*   /    . */

// —       (     )
const SHELF_MAX = 8; // (16:9    —    SHELF_MIN   )
const SHELF_MIN = 3; //
const CARD_TARGET = 108; // (px) —
const SHELF_GAP = 12; // (gap-3)
const ROW_PAD = 8; // (px-2) —

/**  (  +    )       .
*   grid          .
*  ResizeObserver  window resize  —   /  . */
function useFitColumns() {
  const ref = useRef<HTMLDivElement>(null);
  // cols =     , cardW =       (px).
  // cardW     ,    .
  const [dims, setDims] = useState<{ cols: number; cardW: number }>({
    cols: SHELF_MAX,
    cardW: CARD_TARGET,
  });
  useEffect(() => {
    const calc = () => {
      const w = ref.current?.clientWidth ?? 0;
      if (!w) return;
      const cols = Math.max(
        SHELF_MIN,
        Math.min(SHELF_MAX, Math.floor((w + SHELF_GAP) / (CARD_TARGET + SHELF_GAP)))
      );
      // +   gap    cols   →
      // . floor       .
      const cardW = Math.floor((w - ROW_PAD * 2 - (cols - 1) * SHELF_GAP) / cols);
      setDims({ cols, cardW });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return [ref, dims.cols, dims.cardW] as const;
}

// (loupe) —          ( PhotoScreen  )
const LOUPE = 116; // (px)
const LOUPE_ZOOM = 1.2; //
// —  GradedSlab  className(w-268% / -ml-84.5% / -mt-68%)
const OC_SCALE = 2.68;
const OC_OFF_X = 0.845;
const OC_OFF_Y = 0.68;

/**      —         .
*  :    +  .
*           . */
function Shelves({
  cards,
  onSelect,
  skeleton = false,
}: {
  cards: (ShelfCard | null)[];
  onSelect: (c: ShelfCard) => void;
  skeleton?: boolean;
}) {
  const [rootRef, cols, cardW] = useFitColumns();
  const items: (ShelfCard | null)[] = cards;
  const rows: (ShelfCard | null)[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

  return (
    <div ref={rootRef} className="w-full max-w-[1120px] mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {rows.map((row, r) => (
          <div key={r}>
            <div className="flex items-end justify-start gap-3 px-2 mb-1.5">
                {row.map((card, i) => (
                  <div
                    key={card ? card.id : `s${i}`}
                    style={{ width: cardW }}
                    className="shrink-0"
                  >
                    {card && !skeleton ? (
                      <button
                        onClick={() => onSelect(card)}
                        className="group relative w-full rounded-[10px] transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        {/* info */}
                        <span
                          aria-hidden
                          className="absolute -inset-x-2 -top-3 -bottom-1 bg-[radial-gradient(ellipse_at_bottom,theme(colors.amber/14%),transparent_68%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        />
                        <GradedSlab card={card} />
                      </button>
                    ) : (
                      <div
                        className={`w-full aspect-[5/7] rounded-[6px] ${
                          skeleton ? "bg-cream/[0.04] border border-glassline animate-pulse" : ""
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* info info (info info) — info info + info + info info info */}
              <div className="h-[3px] rounded-t-[2px] bg-glassline" />
              {/* info info — info "13 cards" info info glass info(info info + info) */}
              <div className="h-[9px] rounded-b-[3px] bg-glass/70 border-x border-b border-glassline backdrop-blur-md shadow-[0_14px_32px_-6px_rgba(0,0,0,0.5)]" />
              {/* info info info info info */}
              <div className="h-2 bg-[linear-gradient(180deg,theme(colors.cream/8%),theme(colors.bg/55%)_45%,transparent)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** PSA    —    +(·) .
*  -  :  (  )
*  - (Renaiss) :         (  PSA
*       )
*  -  : emoji+tint  */
function GradedSlab({
  card,
  large = false,
  zoomable = false,
}: {
  card: ShelfCard;
  large?: boolean;
/**   —       */
  zoomable?: boolean;
}) {
  // Renaiss  "PSA 10 Gem Mint 2025 ... #132 Mienshao"  —
  const label =
    card.origin === "onchain" ? (card.name.match(/#\d+\s+(.+)$/)?.[1] ?? card.name) : card.name;
  // "PSA 10" (  )
  const gradeShort = card.grade.match(/^(?:PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?/i)?.[0] ?? card.grade;

  const [lens, setLens] = useState<{ x: number; y: number; bgSize: string; bgPos: string } | null>(
    null
  );
  const canZoom = zoomable && !!card.imageUrl;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!canZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const zoom = 1.8;
    const dispW = rect.width * zoom;
    const dispH = rect.height * zoom;
    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW}px ${dispH}px`,
      bgPos: `${LOUPE / 2 - cx * zoom}px ${LOUPE / 2 - cy * zoom}px`,
    });
  }

  return (
    <div className="relative rounded-[10px] border border-cream/25 bg-gradient-to-b from-cream/[0.10] to-cream/[0.03] p-[5%] shadow-[inset_0_1px_0_theme(colors.cream/20%),0_6px_18px_rgba(0,0,0,0.45)]">
      {/* info — info + info */}
      <div className="flex items-center justify-between gap-1 rounded-[5px] bg-inkdark border border-glassline px-[7%] py-[4%] mb-[5%]">
        <span className={`font-bold text-cream truncate ${large ? "text-[12px]" : "text-[10px]"}`}>
          {label}
        </span>
        <span
          className={`shrink-0 font-extrabold rounded-[3px] bg-amber text-inkdark px-1 ${large ? "text-[12px]" : "text-[10px]"}`}
        >
          {gradeShort}
        </span>
      </div>
      {/* info info — info info(overflow-hidden)info info. zoomableinfo info info info.
          info info / info info info / info info info info info info info info */}
      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setLens(null)}
        className={`relative w-full aspect-[5/7] rounded-[6px] overflow-hidden border border-cream/10 select-none ${
          canZoom ? "cursor-none" : ""
        }`}
        style={card.imageUrl ? undefined : { background: card.tint }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            draggable={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Cards size={large ? 56 : 30} weight="duotone" className="text-cream/50" aria-hidden />
          </div>
        )}

        {/* info info — info info info info info. overflow-hiddeninfo info info info */}
        {lens && card.imageUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-20 rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
            style={{
              width: LOUPE,
              height: LOUPE,
              left: lens.x - LOUPE / 2,
              top: lens.y - LOUPE / 2,
              backgroundImage: `url(${card.imageUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: lens.bgSize,
              backgroundPosition: lens.bgPos,
            }}
          />
        )}
      </div>
      {/* info info info */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,transparent_35%,theme(colors.cream/7%)_45%,transparent_55%)] pointer-events-none"
      />
    </div>
  );
}
