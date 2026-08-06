"use client";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  SpeakerHigh,
  SpeakerSlash,
  ShieldCheck,
  ArrowSquareOut,
  X,
  Cards,
  Sparkle,
  MagnifyingGlassPlus,
  CaretLeft,
} from "@phosphor-icons/react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ScreenShell } from "./ScreenShell";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useRoom } from "../RoomContext";
import { supabase } from "@/lib/supabase";
import { CLEANVERSE_RWA_CARD_ABI, CLEANVERSE_RWA_CARD_ADDRESS } from "@/lib/contracts/CleanverseRWACardABI";

export interface MintedCardItem {
  id: string;
  name: string;
  grade: string;
  franchise: string;
  priceUsd: number;
  imageUrl: string;
  certNumber: string;
  origin: "physical";
  acquiredAt: string;
  tokenId?: string;
}

const LOUPE_SIZE = 130;
const LOUPE_ZOOM = 1.4;
// Renaiss onchain slab image crop parameters (crops out the outer studio canvas, stand, and Renaiss badge)
const OC_SCALE = 2.68;
const OC_OFF_X = 0.845;
const OC_OFF_Y = 0.68;

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
    const dispW = rect.width * OC_SCALE;
    const dispH = rect.width * OC_SCALE;
    const offX = rect.width * OC_OFF_X;
    const offY = rect.width * OC_OFF_Y;

    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW * LOUPE_ZOOM}px ${dispH * LOUPE_ZOOM}px`,
      bgPos: `${LOUPE_SIZE / 2 - (cx + offX) * LOUPE_ZOOM}px ${LOUPE_SIZE / 2 - (cy + offY) * LOUPE_ZOOM}px`,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = touch.clientX - rect.left;
    const cy = touch.clientY - rect.top;
    const dispW = rect.width * OC_SCALE;
    const dispH = rect.width * OC_SCALE;
    const offX = rect.width * OC_OFF_X;
    const offY = rect.width * OC_OFF_Y;

    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW * LOUPE_ZOOM}px ${dispH * LOUPE_ZOOM}px`,
      bgPos: `${LOUPE_SIZE / 2 - (cx + offX) * LOUPE_ZOOM}px ${LOUPE_SIZE / 2 - (cy + offY) * LOUPE_ZOOM}px`,
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
      {/* Cropped Card Image — only the card slab without studio canvas, stand, or Renaiss badge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        draggable={false}
        className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%] pointer-events-none select-none"
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

/**
*   ( —   ,  30 +  ).
* /   ,   . 30   .
*  : 1.png~3.png,  : character2.png, : background.png, : cloud1~3.png,
* : Obstacle1~2.png, : card.png(1~5) → card2.png(6) ( public/game/).
 */

// %(/)    —     .
// GROUND_Y = background.png  ( )  —    %. /       .
const GROUND_Y = 12.8;
const PLAYER_X = 8;
const PLAYER_WIDTH = 9;
const PLAYER_HEIGHT = 15;
// ,            (1= ,  )
const HIT_MARGIN_X = 0.55;
const HIT_MARGIN_Y = 0.7;

// 3  —        (1~3.png) .
const RUN_FRAMES = ["/game/1.png", "/game/2.png", "/game/3.png"];
const RUN_FRAMES_MAGNET = ["/game/1.1.png", "/game/1.2.png", "/game/1.3.png"];
const RUN_FRAMES_SKATEBOARD = ["/game/2.1.png", "/game/2.2.png", "/game/2.3.png"];
const RUN_FRAMES_GOMU = ["/game/3.1.png", "/game/3.2.png", "/game/3.3.png"];
const RUN_FRAME_MS = 100; // —

const JUMP_VELOCITY = 130; // %/s ()
const GRAVITY = 260; // %/s^2
const BASE_SPEED = 32; // %/s
const MAX_SPEED = 70;
const SPEED_RAMP = 1.4; //
const SPAWN_MIN = 1.5; // s —
const SPAWN_MAX = 3; // s —
const TOTAL_TIME = 60; // s —

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

const GAME_BGM_VOLUME = 0.4; // BGM
const BGM_FADE_MS = 1200; // BGM

// —     ,  x   .
// 5      card2( ) .
const CARD_SRC = "/game/card.png";
const CARD2_SRC = "/game/card2.png";
// 5  / 10(+15...)        —     (card/card2)
const CELEBRATION_SILVER_SRC = "/game/silvercard1.png";
const CELEBRATION_GOLD_SRC = "/game/goldcard1.png";
const CARD_WIDTH = 6;
const CARD_HEIGHT = 13.4; // card.png(422x699)
const CARD_FLOAT_MIN = 4; // (GROUND_Y)   (%) —
const CARD_FLOAT_MAX = 25; // (%) —  ( 32.5%)
const CARD_SPAWN_MIN = 1; // s — 30  10     ,
const CARD_SPAWN_MAX = 2; // s
const CARD_OBSTACLE_GAP = 12; // % —     x

// —       ( %,  ,  /,   )
// delay          (      ).
const FALLING_CARDS = [
  { left: 4, duration: 5.2, delay: -0.8, spin: 360, src: CARD_SRC },
  { left: 16, duration: 6.4, delay: -3.9, spin: -360, src: CARD2_SRC },
  { left: 29, duration: 4.8, delay: -1.6, spin: 360, src: CARD_SRC },
  { left: 43, duration: 7.1, delay: -5.2, spin: -320, src: CARD2_SRC },
  { left: 57, duration: 5.6, delay: -2.4, spin: 340, src: CARD_SRC },
  { left: 70, duration: 6.9, delay: -4.6, spin: -360, src: CARD2_SRC },
  { left: 83, duration: 5.0, delay: -0.3, spin: 300, src: CARD_SRC },
  { left: 93, duration: 6.2, delay: -3.1, spin: -340, src: CARD2_SRC },
];

// —     /(  %)  .
// yOffset           GROUND_Y    (%,  0).
const OBSTACLE_TYPES = [
  { src: "/game/Obstacle1.png", width: 16, height: 5, yOffset: 0, hitYOffset: 0 },
  { src: "/game/Obstacle2.png", width: 8, height: 13, yOffset: 0, hitYOffset: 0 },
  { src: "/game/Obstacle3.png", width: 10, height: 9, yOffset: 40, hitYOffset: 40, anim: "obstacle-flap 0.6s ease-in-out infinite" }, // Below clouds
  { src: "/game/Obstacle4.png", width: 9, height: 10, yOffset: 45, hitYOffset: 45, anim: "obstacle-flap 0.7s ease-in-out infinite alternate" }, // Below clouds
  { src: "/game/Obstacle5.png", width: 12, height: 12, yOffset: 0, hitYOffset: 0 }, // Static obstacle
  { src: "/game/Obstacle6.png", width: 12, height: 12, yOffset: 0, hitYOffset: 0, anim: "obstacle-roll 1.5s linear infinite" }, // Huge rock
];

// —   1/3   ()     .
const CLOUD_PARALLAX = 0.35; //
const CLOUDS = [
  { src: "/game/cloud1.png", top: 4, startX: 8, width: 14, height: 8 },
  { src: "/game/cloud2.png", top: 16, startX: 50, width: 14, height: 8 },
  { src: "/game/cloud3.png", top: 9, startX: 78, width: 13, height: 9 },
];

const wrap = (v: number, m: number) => ((v % m) + m) % m;

// — 10 5 (10, 15, 20, 25...)
const isGoldMilestone = (count: number) => count >= 10 && count % 5 === 0;

// 5  / 10(+15,  10 )     —  ,
type Celebration = "silver" | "gold" | null;
const CELEBRATION_MS: Record<"silver" | "gold", number> = { silver: 2400, gold: 3000 };
const CELEBRATION_COLORS = ["#EFEAFF", "#B78CFF", "#6FE8C8", "#FF8BA8", "#FFD54A"];

interface Particle {
  dx: number; // x (%)
  dy: number; // y (%)
  size: number; // px
  color: string;
  delay: number; // s
}

/**    (   )     */
function makeFireworkParticles(count: number, spread: number): Particle[] {
  return Array.from({ length: count }).map((_, i) => {
    const angle = ((360 / count) * i + (Math.random() * 20 - 10)) * (Math.PI / 180);
    const distance = spread * (0.65 + Math.random() * 0.35);
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 4 + Math.random() * 6,
      color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
      delay: Math.random() * 0.25,
    };
  });
}

interface Obstacle {
  id: number;
  type: number;
  /**      —    , (   -  )    . */
  spawnDistance: number;
}

interface Card {
  id: number;
  spawnDistance: number;
  /** (GROUND_Y)   (%) —     . */
  floatY: number;
  /**   5   card2,   card */
  src: string;
  itemType?: "magnet" | "skateboard" | "gomu";
  isPulling?: boolean;
  currentX?: number;
  currentY?: number;
}

type GameState = "ready" | "playing" | "over";

export function ComputerScreen({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsCollected, setCardsCollected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [worldDistance, setWorldDistance] = useState(0);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const [celebrationParticles, setCelebrationParticles] = useState<Particle[]>([]);
  const [runFrame, setRunFrame] = useState(0);
  const [startRunFrame, setStartRunFrame] = useState(0);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [skateboardActive, setSkateboardActive] = useState(false);
  const [gomuActive, setGomuActive] = useState(false);
  const [tiredActive, setTiredActive] = useState(false);

  // ref ,    state  (     )
  const playerYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cardsRef = useRef<Card[]>([]);
  const cardSpawnTimerRef = useRef(CARD_SPAWN_MIN);
  const timeLeftRef = useRef(TOTAL_TIME);
  const cloudOffsetRef = useRef(0);
  // runSpeed =    =    . /      (   ).
  const runSpeedRef = useRef(BASE_SPEED);
  const worldDistanceRef = useRef(0);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(SPAWN_MIN);
  const nextIdRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const cardsCollectedRef = useRef(0);
  const magnetTimerRef = useRef(0);
  const skateboardTimerRef = useRef(0);
  const gomuTimerRef = useRef(0);
  const tiredTimerRef = useRef(0);
  const celebrationRef = useRef<Celebration>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silverShownRef = useRef(false);
  const bonusScoreRef = useRef(0);
  const runFrameRef = useRef(0);
  const runFrameTimerRef = useRef(0);
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameBgmRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const bgmFadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { room } = useRoom();

  const [pendingRewards, setPendingRewards] = useState<{ score: number; count: number } | null>(null);
  const [web3Error, setWeb3Error] = useState<string | null>(null);
  const [mintedRwa, setMintedRwa] = useState<{
    cards: Array<{
      id: string;
      name: string;
      grade: string;
      franchise: string;
      priceUsd: number;
      imageUrl: string;
      certNumber: string;
      origin: "physical";
      acquiredAt: string;
      tokenId?: string;
    }>;
    txHash: string;
    monadExplorerUrl: string;
    cvaAssetId: string;
    traceabilityHash: string;
  } | null>(null);
  const [inspectedCard, setInspectedCard] = useState<any | null>(null);
  const [isMintingRwa, setIsMintingRwa] = useState(false);
  const [mintProgress, setMintProgress] = useState("");
  const [unclaimedId, setUnclaimedId] = useState<string | null>(null);

  // ── Load unclaimed rewards from Supabase on mount ──
  useEffect(() => {
    if (!address) return;
    const wallet = address.toLowerCase();
    supabase
      .from("unclaimed_rewards")
      .select("id, score, card_count")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const row = data[0];
          setPendingRewards({ score: row.score, count: row.card_count });
          setUnclaimedId(row.id);
          setGameState("over");
        }
      });
  }, [address]);

  const handleClaimWeb3Mint = useCallback(async () => {
    if (!pendingRewards || pendingRewards.count <= 0 || !address) return;
    setWeb3Error(null);
    setIsMintingRwa(true);
    setMintProgress("Minting on Monad Testnet (Please wait)...");

    try {
      // Step 1: Get prepared card data + mint parameters from backend
      const res = await fetch("/api/cleanverse/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          roomId: room.id,
          score: pendingRewards.score,
          count: pendingRewards.count,
        }),
      });

      if (!res.ok) {
        setWeb3Error("Failed to prepare mint data.");
        setIsMintingRwa(false);
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
        mintArgs: {
          uri: string;
          cvaAssetId: string;
          traceabilityHash: `0x${string}`;
        };
      }>;

      // Step 2: The backend has already minted the cards using its own wallet.
      // We just extract the txHash returned from the API.
      const lastTxHash = data.txHash || "0x";

      // Save all minted cards to Supabase DB
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

      setMintedRwa({
        cards: cardsToMint,
        txHash: lastTxHash,
        monadExplorerUrl: `https://testnet.monadscan.com/tx/${lastTxHash}`,
        cvaAssetId: cardsToMint[0].mintArgs.cvaAssetId,
        traceabilityHash: cardsToMint[0].mintArgs.traceabilityHash,
      });

      setPendingRewards(null);

      // Delete unclaimed reward from Supabase
      if (unclaimedId) {
        supabase.from("unclaimed_rewards").delete().eq("id", unclaimedId).then(() => setUnclaimedId(null));
      } else if (address) {
        supabase.from("unclaimed_rewards").delete().eq("wallet_address", address.toLowerCase());
      }
    } catch (err) {
      console.warn("Minting error:", err);
      setWeb3Error("Failed minting cards.");
    } finally {
      setIsMintingRwa(false);
      setMintProgress("");
    }
  }, [address, pendingRewards, room.id, writeContractAsync, publicClient, unclaimedId]);

  // BGM 0     (   )
  const fadeInBgm = useCallback((audio: HTMLAudioElement) => {
    if (bgmFadeRef.current) clearInterval(bgmFadeRef.current);
    const target = GAME_BGM_VOLUME;
    const steps = 20;
    const stepMs = BGM_FADE_MS / steps;
    let i = 0;
    audio.volume = 0;
    bgmFadeRef.current = setInterval(() => {
      i += 1;
      audio.volume = Math.min(target, (target * i) / steps);
      if (i >= steps && bgmFadeRef.current) {
        clearInterval(bgmFadeRef.current);
        bgmFadeRef.current = null;
      }
    }, stepMs);
  }, []);

  // —        .
  // —           .
  useEffect(() => {
    if (!jumpSoundRef.current) {
      const audio = new Audio("/sounds/jump.mp3");
      audio.volume = 0.5;
      jumpSoundRef.current = audio;
    }
  }, []);

  // —  ,
  useEffect(() => {
    if (!gameOverSoundRef.current) {
      const audio = new Audio("/sounds/gameover.mp3");
      audio.volume = 0.6;
      gameOverSoundRef.current = audio;
    }
  }, []);

  // —  ready      →
  useEffect(() => {
    if (gameState !== "ready") return;
    const id = setInterval(() => {
      setStartRunFrame((f) => (f + 1) % RUN_FRAMES.length);
    }, RUN_FRAME_MS);
    return () => clearInterval(id);
  }, [gameState]);

  // BGM —     ,    (   BGM)
  useEffect(() => {
    if (!gameBgmRef.current) {
      const audio = new Audio("/sounds/gamebgm.mp3");
      audio.loop = true;
      audio.volume = 0;
      gameBgmRef.current = audio;
    }
    const audio = gameBgmRef.current;
    audio.play().catch(() => {
      const retry = () => audio.play().catch(() => { });
      document.addEventListener("pointerdown", retry, { once: true });
    });
    fadeInBgm(audio);
    window.dispatchEvent(new CustomEvent("suppress-room-bgm", { detail: true }));
    return () => {
      if (bgmFadeRef.current) clearInterval(bgmFadeRef.current);
      audio.pause();
      window.dispatchEvent(new CustomEvent("suppress-room-bgm", { detail: false }));
    };
  }, []);

  // —    muted
  useEffect(() => {
    if (gameBgmRef.current) gameBgmRef.current.muted = bgmMuted;
  }, [bgmMuted]);

  const jump = useCallback(() => {
    if (playerYRef.current !== 0 || tiredTimerRef.current > 0) return;
    velocityRef.current = (skateboardTimerRef.current > 0 || gomuTimerRef.current > 0) ? JUMP_VELOCITY * 1.35 : JUMP_VELOCITY;
    const sound = jumpSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => { });
    }
  }, []);

  // 5/10   —    +
  const triggerCelebration = useCallback((tier: "silver" | "gold") => {
    celebrationRef.current = tier;
    setCelebration(tier);
    setCelebrationParticles(makeFireworkParticles(tier === "gold" ? 32 : 26, tier === "gold" ? 58 : 50));
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      celebrationRef.current = null;
      setCelebration(null);
    }, CELEBRATION_MS[tier]);
  }, []);

  const start = useCallback(() => {
    playerYRef.current = 0;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    cardsRef.current = [];
    cardSpawnTimerRef.current = CARD_SPAWN_MIN + Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN);
    timeLeftRef.current = TOTAL_TIME;
    cloudOffsetRef.current = 0;
    runSpeedRef.current = BASE_SPEED;
    worldDistanceRef.current = 0;
    elapsedRef.current = 0;
    spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    lastTimeRef.current = null;
    runFrameRef.current = 0;
    runFrameTimerRef.current = 0;
    cardsCollectedRef.current = 0;
    silverShownRef.current = false;
    bonusScoreRef.current = 0;
    celebrationRef.current = null;
    setMintedRwa(null);
    setPendingRewards(null);
    setWeb3Error(null);
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    gameOverSoundRef.current?.pause();
    if (gameOverSoundRef.current) gameOverSoundRef.current.currentTime = 0;
    const bgm = gameBgmRef.current;
    if (bgm) {
      bgm.currentTime = 0;
      bgm.play().catch(() => { });
    }
    magnetTimerRef.current = 0;
    setMagnetActive(false);
    skateboardTimerRef.current = 0;
    setSkateboardActive(false);
    gomuTimerRef.current = 0;
    setGomuActive(false);
    tiredTimerRef.current = 0;
    setTiredActive(false);
    setPlayerY(0);
    setObstacles([]);
    setCards([]);
    setCardsCollected(0);
    setCelebration(null);
    setTimeLeft(TOTAL_TIME);
    setCloudOffset(0);
    setRunFrame(0);
    setWorldDistance(0);
    setScore(0);
    setGameState("playing");
  }, []);

  const handleInput = useCallback(() => {
    if (gameState === "playing") { jump(); return; }
    // Block restart when unclaimed rewards exist — user must mint first
    if (gameState === "over" && pendingRewards) return;
    start();
  }, [gameState, jump, start, pendingRewards]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      e.preventDefault();
      handleInput();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleInput]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // (      )
      if (celebrationRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      velocityRef.current -= GRAVITY * dt;
      playerYRef.current = Math.max(0, playerYRef.current + velocityRef.current * dt);
      if (playerYRef.current === 0) velocityRef.current = 0;

      // —      (    )
      if (playerYRef.current === 0) {
        runFrameTimerRef.current += dt * 1000;
        if (runFrameTimerRef.current >= RUN_FRAME_MS) {
          runFrameTimerRef.current -= RUN_FRAME_MS;
          runFrameRef.current = (runFrameRef.current + 1) % RUN_FRAMES.length;
          setRunFrame(runFrameRef.current);
        }
      }

      if (magnetTimerRef.current > 0) {
        magnetTimerRef.current -= dt;
        if (magnetTimerRef.current <= 0) {
          setMagnetActive(false);
        } else if (!magnetActive) {
          setMagnetActive(true);
        }
      }
      if (skateboardTimerRef.current > 0) {
        skateboardTimerRef.current -= dt;
        if (skateboardTimerRef.current <= 0) {
          setSkateboardActive(false);
        } else if (!skateboardActive) {
          setSkateboardActive(true);
        }
      }
      if (gomuTimerRef.current > 0) {
        gomuTimerRef.current -= dt;
        if (gomuTimerRef.current <= 0) {
          setGomuActive(false);
          // Enter tired state when Gomu expires
          tiredTimerRef.current = 5;
          setTiredActive(true);
        } else if (!gomuActive) {
          setGomuActive(true);
        }
      }
      if (tiredTimerRef.current > 0) {
        tiredTimerRef.current -= dt;
        if (tiredTimerRef.current <= 0) {
          setTiredActive(false);
        } else if (!tiredActive) {
          setTiredActive(true);
        }
      }

      elapsedRef.current += dt;

      let currentRunSpeed = Math.min(MAX_SPEED, BASE_SPEED + elapsedRef.current * SPEED_RAMP);
      if (tiredTimerRef.current > 0) {
        currentRunSpeed = 0; // Stunned
      } else if (gomuTimerRef.current > 0) {
        currentRunSpeed *= 1.8; // Gear 5: 80% faster
      } else if (skateboardTimerRef.current > 0 || magnetTimerRef.current > 0) {
        currentRunSpeed *= 1.4; // 40% faster
      }
      runSpeedRef.current = currentRunSpeed;

      // —       ,      .
      worldDistanceRef.current += runSpeedRef.current * dt;
      cloudOffsetRef.current += runSpeedRef.current * CLOUD_PARALLAX * dt;

      // — 0   ( )
      timeLeftRef.current = Math.max(0, timeLeftRef.current - dt);
      setTimeLeft(timeLeftRef.current);

      let next = obstaclesRef.current.filter(
        (o) => worldDistanceRef.current - o.spawnDistance < 100 + OBSTACLE_TYPES[o.type].width
      );

      // —   .       ( ).
      let nextCards = cardsRef.current.filter((c) => worldDistanceRef.current - c.spawnDistance < 100 + CARD_WIDTH);

      if (runSpeedRef.current > 0) {
        cardSpawnTimerRef.current -= dt;
        spawnTimerRef.current -= dt;
      }

      if (cardSpawnTimerRef.current <= 0) {
        cardSpawnTimerRef.current = CARD_SPAWN_MIN + Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN);
        const floatY = CARD_FLOAT_MIN + Math.random() * (CARD_FLOAT_MAX - CARD_FLOAT_MIN);

        const spawnItem = Math.random() < 0.20 && magnetTimerRef.current <= 0 && skateboardTimerRef.current <= 0 && gomuTimerRef.current <= 0;
        if (spawnItem) {
          const rand = Math.random();
          if (rand < 0.33) {
            nextCards = [...nextCards, { id: nextIdRef.current++, spawnDistance: worldDistanceRef.current, floatY, src: "/game/magnet.png", itemType: "magnet" }];
          } else if (rand < 0.66) {
            nextCards = [...nextCards, { id: nextIdRef.current++, spawnDistance: worldDistanceRef.current, floatY: 0, src: "/game/skateboard.png", itemType: "skateboard" }];
          } else {
            nextCards = [...nextCards, { id: nextIdRef.current++, spawnDistance: worldDistanceRef.current, floatY, src: "/game/gomu.png", itemType: "gomu" }];
          }
        } else {
          const src = cardsCollectedRef.current >= 5 ? CARD2_SRC : CARD_SRC;
          nextCards = [...nextCards, { id: nextIdRef.current++, spawnDistance: worldDistanceRef.current, floatY, src }];
        }
      }

      // —       ( ,   ).
      if (spawnTimerRef.current <= 0 && next.length === 0) {
        const type = Math.floor(Math.random() * OBSTACLE_TYPES.length);
        const width = OBSTACLE_TYPES[type].width;
        const spawnX = 100;
        const overlapsCard = nextCards.some((c) => {
          const cx = 100 - (worldDistanceRef.current - c.spawnDistance);
          return spawnX < cx + CARD_WIDTH + CARD_OBSTACLE_GAP && spawnX + width > cx - CARD_OBSTACLE_GAP;
        });
        if (!overlapsCard) {
          spawnTimerRef.current = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
          next = [...next, { id: nextIdRef.current++, type, spawnDistance: worldDistanceRef.current }];
        }
      }
      obstaclesRef.current = next;

      // ,         .
      const px1 = PLAYER_X + (PLAYER_WIDTH * (1 - HIT_MARGIN_X)) / 2;
      const pWidth = PLAYER_WIDTH * HIT_MARGIN_X;
      const collided = next.some((o) => {
        if (gomuTimerRef.current > 0) return false; // Immune to obstacles
        const t = OBSTACLE_TYPES[o.type];
        const ox = 100 - (worldDistanceRef.current - o.spawnDistance) + (t.width * (1 - HIT_MARGIN_X)) / 2;
        const oWidth = t.width * HIT_MARGIN_X;
        const oBottom = t.hitYOffset || 0;
        const oTop = oBottom + t.height * HIT_MARGIN_Y;
        return ox < px1 + pWidth && ox + oWidth > px1 && playerYRef.current + PLAYER_HEIGHT * HIT_MARGIN_Y > oBottom && playerYRef.current < oTop;
      });

      //
      let eaten = 0;
      nextCards = nextCards.filter((c) => {
        let x = c.isPulling && c.currentX !== undefined ? c.currentX : 100 - (worldDistanceRef.current - c.spawnDistance);
        let y = c.isPulling && c.currentY !== undefined ? c.currentY : c.floatY;

        if (c.isPulling) {
          const targetX = PLAYER_X + PLAYER_WIDTH / 2 - CARD_WIDTH / 2;
          const targetY = playerYRef.current + PLAYER_HEIGHT / 2 - CARD_HEIGHT / 2;
          const dx = targetX - x;
          const dy = targetY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 250 * dt; // move 250% of screen per second

          if (dist < speed || dist < 4) {
            eaten++;
            return false;
          }
          c.currentX = x + (dx / dist) * speed;
          c.currentY = y + (dy / dist) * speed;
          return true;
        }

        let hit = false;
        if (c.itemType) {
          hit = x < PLAYER_X + PLAYER_WIDTH &&
            x + CARD_WIDTH > PLAYER_X &&
            playerYRef.current < c.floatY + CARD_HEIGHT &&
            playerYRef.current + PLAYER_HEIGHT > c.floatY;
        } else {
          if (magnetTimerRef.current > 0 || gomuTimerRef.current > 0) {
            // Start pulling if within screen range
            if (x < PLAYER_X + 60 && x > PLAYER_X - 10) {
              c.isPulling = true;
              c.currentX = x;
              c.currentY = y;
              return true;
            }
          }
          // Normal collision
          hit = x < PLAYER_X + PLAYER_WIDTH &&
            x + CARD_WIDTH > PLAYER_X &&
            playerYRef.current < c.floatY + CARD_HEIGHT &&
            playerYRef.current + PLAYER_HEIGHT > c.floatY;
        }

        if (hit) {
          if (c.itemType === "magnet") {
            magnetTimerRef.current = 5;
            setMagnetActive(true);
            timeLeftRef.current = Math.max(0, timeLeftRef.current - 3); // Nerf: subtract 3 seconds
          } else if (c.itemType === "skateboard") {
            skateboardTimerRef.current = 5;
            setSkateboardActive(true);
            timeLeftRef.current += 10; // Add 10 seconds to game duration
          } else if (c.itemType === "gomu") {
            gomuTimerRef.current = 15; // Duration increased to 15s
            setGomuActive(true);
            timeLeftRef.current += 15; // Add 15 seconds for Gomu
          } else {
            eaten++;
          }
        }
        return !hit;
      });
      if (eaten > 0) {
        cardsCollectedRef.current += eaten;
        setCardsCollected(cardsCollectedRef.current);
        // (5)     (+100). (10 5 ) (+200).
        if (cardsCollectedRef.current >= 5 && !silverShownRef.current) {
          silverShownRef.current = true;
          bonusScoreRef.current += 100;
          triggerCelebration("silver");
        }
        if (isGoldMilestone(cardsCollectedRef.current)) {
          bonusScoreRef.current += 200;
          triggerCelebration("gold");
        }
      }
      cardsRef.current = nextCards;

      setPlayerY(playerYRef.current);
      setObstacles(next);
      setCards(nextCards);
      setCloudOffset(cloudOffsetRef.current);
      setWorldDistance(worldDistanceRef.current);
      // Score is strictly equal to the number of in-game cards collected
      const currentScore = cardsCollectedRef.current;
      setScore(currentScore);

      if (collided || timeLeftRef.current <= 0) {
        gameBgmRef.current?.pause();
        const overSound = gameOverSoundRef.current;
        if (overSound) {
          overSound.currentTime = 0;
          overSound.play().catch(() => { });
        }
        setGameState("over");
        const cardsToEarn = Math.floor(currentScore / 5);
        if (cardsToEarn > 0) {
          const reward = { score: currentScore, count: cardsToEarn };
          setPendingRewards(reward);
          // Persist unclaimed reward to Supabase
          if (address) {
            supabase
              .from("unclaimed_rewards")
              .insert({ wallet_address: address.toLowerCase(), score: currentScore, card_count: cardsToEarn })
              .select("id")
              .then(({ data: rows, error }) => {
                if (error) console.error("Error saving unclaimed reward to Supabase:", error);
                if (rows && rows.length > 0) setUnclaimedId(rows[0].id);
              });
          }
        } else {
          setPendingRewards(null);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  return (
    <ScreenShell title="Computer" onClose={onClose}>
      <div
        style={{ backgroundImage: "url(/game/background.png)" }}
        className="relative w-[min(92vw,640px)] aspect-[1456/1080] rounded-2xl border-2 border-glassline overflow-hidden bg-inkdark bg-cover bg-center select-none"
      >
        <style>{`
          @keyframes obstacle-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8%); }
          }
          @keyframes obstacle-squish {
            0%, 100% { transform: scale(1, 1); }
            50% { transform: scale(1.04, 0.96) translateY(2%); }
          }
          @keyframes obstacle-flap {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15%) rotate(4deg); }
          }
          @keyframes obstacle-roll {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
        `}</style>
        {/* info info — info info info info, info info info info info(info) */}
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              left: `${wrap(c.startX - cloudOffset, 100 + c.width) - c.width}%`,
              top: `${c.top}%`,
              width: `${c.width}%`,
              height: `${c.height}%`,
              backgroundImage: `url(${c.src})`,
            }}
            className="absolute bg-contain bg-no-repeat bg-center"
          />
        ))}

        {/* info BGM info info — info info/info info info info stopPropagation */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBgmMuted((m) => !m);
          }}
          aria-label={bgmMuted ? "Unmute game music" : "Mute game music"}
          className="absolute right-3 bottom-3 z-30 grid h-8 w-8 place-items-center rounded-full bg-glass border border-glassline text-creamdim hover:text-cream transition-colors"
        >
          {bgmMuted ? (
            <SpeakerSlash className="w-4 h-4" weight="bold" aria-hidden />
          ) : (
            <SpeakerHigh className="w-4 h-4" weight="bold" aria-hidden />
          )}
        </button>

        {/* info + info info */}
        <div className="absolute top-3 right-4 text-cream font-mono text-sm tabular-nums drop-shadow text-right">
          <div>{score}</div>
          <div className="text-down font-black text-3xl leading-none mt-1 drop-shadow-[0_2px_6px_rgba(255,139,168,0.6)]">
            {Math.ceil(timeLeft)}s
          </div>
        </div>

        {/* info info info — info info, info info 1info + ×N */}
        {cardsCollected > 0 && (
          <div className="absolute top-3 left-4 flex items-center gap-1.5">
            <div
              aria-hidden
              style={{ backgroundImage: "url(/game/card.png)" }}
              className="w-6 h-8 bg-contain bg-no-repeat bg-center shrink-0"
            />
            <span className="text-cream font-black text-2xl drop-shadow">×{cardsCollected}</span>
          </div>
        )}

        {/* info — info info(ready)info info info(info info info info info info), info info/info info */}
        {gameState !== "ready" && (
          <div
            aria-hidden
            style={{
              left: `${PLAYER_X}%`,
              bottom: `${GROUND_Y + playerY - (tiredActive ? 3 : 0)}%`,
              width: `${PLAYER_WIDTH}%`,
              height: `${PLAYER_HEIGHT}%`,
              backgroundImage: `url(${gameState === "over" ? "/game/character2.png" : (tiredActive ? "/game/tired.png" : (gomuActive ? RUN_FRAMES_GOMU[runFrame] : (skateboardActive ? RUN_FRAMES_SKATEBOARD[runFrame] : (magnetActive ? RUN_FRAMES_MAGNET[runFrame] : RUN_FRAMES[runFrame]))))})`,
            }}
            className={`absolute bg-contain bg-no-repeat bg-center ${gomuActive ? "drop-shadow-[0_0_15px_rgba(255,213,74,0.8)] animate-pulse" : ""}`}
          />
        )}

        {/* info — info info info, info worldDistanceinfo info info info info info info */}
        {obstacles.map((o) => {
          const t = OBSTACLE_TYPES[o.type];
          const x = 100 - (worldDistance - o.spawnDistance);
          return (
            <div
              key={o.id}
              aria-hidden
              style={{
                left: `${x}%`,
                bottom: `${GROUND_Y + t.yOffset}%`,
                width: `${t.width}%`,
                height: `${t.height}%`,
                backgroundImage: `url(${t.src})`,
                animation: t.anim,
              }}
              className="absolute bg-contain bg-no-repeat bg-bottom"
            />
          );
        })}

        {/* info info — info info info info info */}
        {cards.map((c) => {
          const x = c.isPulling && c.currentX !== undefined ? c.currentX : 100 - (worldDistance - c.spawnDistance);
          const y = c.isPulling && c.currentY !== undefined ? c.currentY : c.floatY;
          return (
            <div
              key={c.id}
              aria-hidden
              style={{
                left: `${x}%`,
                bottom: `${GROUND_Y + y}%`,
                width: `${CARD_WIDTH}%`,
                height: `${CARD_HEIGHT}%`,
                backgroundImage: `url(${c.src})`,
              }}
              className={`absolute bg-contain bg-no-repeat bg-center ${c.isPulling ? "animate-[spin_0.3s_linear_infinite]" : ""}`}
            />
          );
        })}

        {/* info info — info info info info info info PLAY info */}
        {gameState === "ready" && (
          <div className="absolute inset-0 bg-bg/60">
            {FALLING_CARDS.map((c, i) => (
              <div
                key={i}
                aria-hidden
                style={
                  {
                    left: `${c.left}%`,
                    backgroundImage: `url(${c.src})`,
                    animationDuration: `${c.duration}s`,
                    animationDelay: `${c.delay}s`,
                    "--card-spin": `${c.spin}deg`,
                  } as CSSProperties
                }
                className="absolute w-8 sm:w-10 aspect-[422/699] bg-contain bg-no-repeat bg-center animate-card-fall pointer-events-none"
              />
            ))}
            {/* Running character animation */}
            <div
              aria-hidden
              style={{ backgroundImage: `url(${RUN_FRAMES[startRunFrame]})` }}
              className="absolute bottom-[10%] w-10 sm:w-12 aspect-[422/699] bg-contain bg-no-repeat bg-center animate-run-across pointer-events-none"
            />
            <button
              type="button"
              onClick={handleInput}
              aria-label="Play"
              style={{ backgroundImage: "url(/game/play.png)" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[42vw] max-w-[220px] aspect-[860/340] bg-contain bg-no-repeat bg-center transition-transform hover:scale-110 hover:brightness-110"
            />
            <p className="absolute left-1/2 -translate-x-1/2 top-[62%] text-cream/90 text-[10px] sm:text-xs font-medium bg-inkdark/70 backdrop-blur-sm px-3 py-1 rounded-full border border-cream/15 whitespace-nowrap pointer-events-none">
              Press <span className="text-amber font-bold">Space</span> or <span className="text-amber font-bold">Arrow Up</span> to jump
            </p>
          </div>
        )}

        {/* Game over screen with Web3 wallet transaction trigger */}
        {gameState === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/85 backdrop-blur-sm text-center px-4 z-40">
            <div
              aria-hidden
              style={{ backgroundImage: "url(/game/gameover.png)" }}
              className="w-[52vw] max-w-[220px] aspect-[1404/491] bg-contain bg-no-repeat bg-center animate-card-pop"
            />

            {/* Score HUD */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ambersoft/50 border border-glassline text-xs font-bold text-cream">
              <Cards size={16} weight="duotone" className="text-amber" />
              <span>Cards Collected: <strong className="text-amber font-mono text-sm">{score}</strong></span>
            </div>

            {pendingRewards && pendingRewards.count > 0 ? (
              <div className="flex flex-col items-center gap-2.5 my-1 z-50 w-full max-w-[280px]">
                <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-up/10 border border-up/30 text-xs font-bold text-up">
                  <Sparkle size={14} weight="fill" />
                  <span>{pendingRewards.count} One Piece Card Drop Unlocked!</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaimWeb3Mint();
                  }}
                  disabled={isMintingRwa}
                  className="w-full bg-amber hover:bg-amber/90 text-inkdark font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(183,140,255,0.45)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={16} weight="bold" />
                  <span>{isMintingRwa ? (mintProgress || "Minting...") : `Mint ${pendingRewards.count} Card${pendingRewards.count > 1 ? "s" : ""} on Monad`}</span>
                </button>

                <span className="text-[10px] text-creamdim/70 font-mono">
                  Monad Testnet · Seamless Minting
                </span>

                {web3Error && (
                  <p className="text-down text-[11px] font-medium max-w-[260px] bg-down/10 px-3 py-1.5 rounded-lg border border-down/30">{web3Error}</p>
                )}
              </div>
            ) : (
              <p className="text-creamdim text-xs font-medium max-w-[260px]">
                Collect at least 5 cards to earn an on-chain collectible drop!
              </p>
            )}

            {pendingRewards ? (
              <p className="text-amber/70 text-xs mt-1 font-semibold">
                Claim your rewards before retrying
              </p>
            ) : (
              <p className="text-creamdim/80 text-xs mt-1">
                Press <span className="text-amber font-bold">Space</span> or{" "}
                <span className="text-amber font-bold">Arrow Up</span> to retry
              </p>
            )}
          </div>
        )}

        {celebration && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none">
            {celebrationParticles.map((p, i) => (
              <span
                key={i}
                aria-hidden
                style={
                  {
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    animationDelay: `${p.delay}s`,
                    "--fw-left": `${50 + p.dx}%`,
                    "--fw-top": `${50 + p.dy}%`,
                  } as CSSProperties
                }
                className="absolute rounded-full animate-firework"
              />
            ))}

            {(() => {
              const sparkleCount = celebration === "gold" ? 10 : 6;
              const sparkleRadius = celebration === "gold" ? 32 : 26;
              return Array.from({ length: sparkleCount }).map((_, i) => (
                <span
                  key={`sparkle-${i}`}
                  aria-hidden
                  style={{
                    left: `${50 + Math.cos((i / sparkleCount) * Math.PI * 2) * sparkleRadius}%`,
                    top: `${50 + Math.sin((i / sparkleCount) * Math.PI * 2) * sparkleRadius}%`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                  className={`absolute w-3 h-3 animate-sparkle ${celebration === "gold" ? "bg-[#FFD54A]" : "bg-cream"
                    }`}
                />
              ));
            })()}

            <div className="relative flex flex-col items-center gap-1.5">
              <div
                aria-hidden
                className={`absolute inset-0 rounded-full blur-2xl animate-celebration-glow ${celebration === "gold" ? "bg-[#FFD54A]/50 scale-[2.2]" : "bg-cream/40 scale-[1.7]"
                  }`}
              />

              <div
                className={`relative w-[34vw] max-w-[210px] animate-card-pop ${celebration === "gold" ? "aspect-[586/789]" : "aspect-[592/775]"
                  }`}
              >
                <div
                  style={{
                    backgroundImage: `url(${celebration === "gold" ? CELEBRATION_GOLD_SRC : CELEBRATION_SILVER_SRC})`,
                  }}
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monad Testnet On-Chain Minted Modal */}
      {(isMintingRwa || mintedRwa) && (
        <div
          className="fixed inset-0 z-[70] bg-bg/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            setInspectedCard(null);
            setMintedRwa(null);
          }}
        >
          <div
            className="relative w-full max-w-[580px] max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cream/20 hover:[&::-webkit-scrollbar-thumb]:bg-cream/40 rounded-panel bg-glass border border-glassline p-6 text-cream shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-5 text-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isMintingRwa ? (
              <div className="py-10 space-y-3 flex flex-col items-center">
                <span className="w-12 h-12 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
                <p className="text-sm text-amber font-bold animate-pulse">{mintProgress || "Minting card(s) on Monad Testnet..."}</p>
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
                      <span className="text-cream font-medium">Monad Testnet</span>
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
                        onClose();
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
                    <Eyebrow>Cleanverse Drop</Eyebrow>
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

                        {/* Slab Image — Cropped to card only */}
                        <div className="w-full aspect-[5/7] relative rounded-xl overflow-hidden border border-cream/15 bg-inkdark/80 select-none shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            draggable={false}
                            className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%] group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
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
                      <span className="font-semibold text-cream">Monad Testnet</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-up/10 text-up border border-up/25 font-bold">
                        VERIFIED ON-CHAIN
                      </span>
                    </div>

                    {mintedRwa.monadExplorerUrl && (
                      <a
                        href={mintedRwa.monadExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:text-amber/80 transition-colors"
                      >
                        <span>Monadscan</span>
                        <ArrowSquareOut size={13} weight="bold" />
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => {
                      setInspectedCard(null);
                      setMintedRwa(null);
                      onClose();
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
    </ScreenShell>
  );
}
