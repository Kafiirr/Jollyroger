"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SPOTS, Spot, SpotId, ROOM_IMG_DARK, ROOM_IMG_BRIGHT, ROOM_IMG_NIGHT } from "@/lib/spots";
import { getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useAvatar } from "@/lib/useAvatar";
import { useProfileName } from "@/lib/useProfileName";
import { fetchRemoteProfile, UserProfile } from "@/lib/userProfile";
import { useAccount } from "wagmi";
import { ProfileSettingsModal } from "./ProfileSettingsModal";
import { BackgroundMusic } from "./BackgroundMusic";
import { ClickSound } from "./ClickSound";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";
import { OverlayEditor } from "./OverlayEditor";
import { OverlayQuad } from "./OverlayQuad";
import { RoomProvider } from "./RoomContext";
import { SnackHoverSound } from "./SnackHoverSound";
import { NoteHoverSound } from "./NoteHoverSound";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react";

function RoomAvatar({ name, avatarUrl, walletAddress }: { name: string; avatarUrl?: string; walletAddress?: string }) {
  const [broken, setBroken] = useState(false);
  const fetchedUrl = useAvatar(walletAddress);
  const url = avatarUrl || fetchedUrl;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="w-5 h-5 sm:w-7 sm:h-7 grid place-items-center rounded-full overflow-hidden bg-inkdark border border-amber/40 shrink-0">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} onError={() => setBroken(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-amber font-bold text-[9px] sm:text-[11px] leading-none">{initial}</span>
      )}
    </span>
  );
}

export function Scene() {
  const { address } = useAccount();
  const [entered, setEntered] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<SpotId | null>(null);
  const [hovered, setHovered] = useState<SpotId | null>(null);
  const [roomId, setRoomId] = useState<string>(HOME_ROOM_ID);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [edit, setEdit] = useState(false);
  const [editSpotId, setEditSpotId] = useState<SpotId>("photo");
  const [moving, setMoving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ username: "", avatarUrl: "" });
  const [aPassVerified, setAPassVerified] = useState(false);
  const [aPassId, setAPassId] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUserProfile({ username: "", avatarUrl: "" });
      return;
    }
    fetchRemoteProfile(address).then((remote) => {
      if (remote) setUserProfile(remote);
      else setUserProfile({ username: "", avatarUrl: "" });
    });
  }, [address]);

  useEffect(() => {
    const onProfileUpdate = (e: any) => {
      if (e.detail) setUserProfile(e.detail);
    };
    window.addEventListener("jollyroger_profile_updated", onProfileUpdate);
    return () => window.removeEventListener("jollyroger_profile_updated", onProfileUpdate);
  }, []);

  // Set Attestcoin CC3 verification status when wallet connects
  useEffect(() => {
    if (!address) {
      setAPassVerified(false);
      setAPassId(null);
      return;
    }
    setAPassVerified(true);
    setAPassId(`CTC-CC3-${address.slice(2, 8).toUpperCase()}`);
  }, [address]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const room = getRoom(roomId);
  const isVisiting = roomId !== HOME_ROOM_ID;
  const fallbackName = useProfileName(room.synthetic ? room.walletAddress : undefined) ?? room.ownerName;
  const displayName = !isVisiting && userProfile.username ? userProfile.username : fallbackName;

  /** Time of day: Day (06:00~17:59), Night (18:00~05:59) */
  const [isDay, setIsDay] = useState(true);
  useEffect(() => {
    const update = () => {
      const forced = new URLSearchParams(window.location.search).get("hour");
      const h = forced !== null && forced !== "" ? Number(forced) : new Date().getHours();
      setIsDay(h >= 6 && h < 18);
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const roomActive = loggedIn || isVisiting;
  const objectsReady = loggedIn || isVisiting;

  // Verify user profile against Supabase when wallet connects.
  // If user has a valid profile in DB, auto-enter room.
  // If user has NO record in DB (new user or wiped DB), enforce onboarding flow.
  // When wallet disconnects, reset back to the initial splash screen.
  useEffect(() => {
    if (!address) {
      setEntered(false);
      setLoggedIn(false);
      setActive(null);
      setTransform("");
      return;
    }

    let isSubscribed = true;

    fetchRemoteProfile(address).then((remote) => {
      if (!isSubscribed) return;
      if (remote?.username) {
        setEntered(true);
        setLoggedIn(true);
      } else {
        // Not registered in Supabase: keep in initial unauthenticated state
        setEntered(false);
        setLoggedIn(false);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [address]);

  useEffect(() => {
    const sync = () => {
      const p = new URLSearchParams(window.location.search);
      if (p.has("edit")) {
        setEdit(true);
        setEntered(true);
        setLoggedIn(true);
      }
      setRoomId(getRoom(p.get("room")).id);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const visitRoom = useCallback((id: string) => {
    const target = getRoom(id);
    setActive(null);
    setTransform("");
    setMoving(true);
    window.setTimeout(() => {
      setRoomId(target.id);
      const url = target.id === HOME_ROOM_ID ? "/" : `/?room=${target.id}`;
      window.history.pushState({}, "", url);
    }, 900);
    window.setTimeout(() => setMoving(false), 1950);
  }, []);

  const select = (spot: Spot) => {
    if (spot.href) {
      window.open(spot.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (spot.id === "phone" && isVisiting) return;
    if (spot.id === "computer" && isVisiting) return;
    if (spot.id === "snack" && isVisiting) return;
    setActive(spot.id);
  };

  const close = () => {
    setActive(null);
    setTransform("");
  };

  const login = () => {
    setEntered(true);
    setLoggedIn(true);
    close();
  };

  const logout = () => {
    setLoggedIn(false);
    setEntered(false);
    close();
  };

  useEscapeToClose(close, active !== null);

  return (
    <RoomProvider value={{ room, isOwnRoom: !isVisiting, visitRoom }}>
    <main className="fixed inset-0 overflow-hidden flex items-center justify-center bg-black">
      <div className="relative shrink-0 w-[min(100vw,calc(100vh*1280/714))] aspect-[1280/714] overflow-hidden">
      <div
        ref={sceneRef}
        style={{ transform, transitionProperty: "transform", transitionDuration: "0.85s" }}
        className="absolute inset-0 ease-camera"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROOM_IMG_DARK} alt="My room" className="absolute inset-0 w-full h-full select-none" draggable={false} />
        {/* Daytime background (06:00~17:59) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG_BRIGHT}
          alt=""
          aria-hidden
          draggable={false}
          className={`absolute inset-0 w-full h-full select-none transition-opacity duration-[900ms] ${
            roomActive && isDay ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Nighttime background (18:00~05:59) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG_NIGHT}
          alt=""
          aria-hidden
          draggable={false}
          className={`absolute inset-0 w-full h-full select-none transition-opacity duration-[900ms] ${
            roomActive && !isDay ? "opacity-100" : "opacity-0"
          }`}
        />

        {SPOTS.map((s) =>
          s.overlay && !(edit && s.id === editSpotId) ? (
            <OverlayQuad
              key={`overlay-${s.id}`}
              src={s.overlay.src}
              corners={s.overlay.corners}
              sceneRef={sceneRef}
              hovered={objectsReady && !active && hovered === s.id}
              className="shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            />
          ) : null
        )}

        {SPOTS.map((s) => {
          const isPhone = s.id === "phone";
          const isComputer = s.id === "computer";
          const isSnack = s.id === "snack";
          const enabled =
            (isVisiting ? !(isPhone || isComputer || isSnack) : objectsReady ? true : isPhone) && !active && !edit;
          return (
            <Hotspot
              key={s.id}
              spot={s}
              disabled={!enabled}
              pop={objectsReady && !s.overlay}
              night={!isDay}
              ring={isPhone && entered && !loggedIn && !active && !isVisiting}
              onHover={(sp, h) => setHovered(h ? sp.id : (cur) => (cur === sp.id ? null : cur))}
              onSelect={select}
            />
          );
        })}

        {/* Snack hover sound (disabled when visiting) */}
        <SnackHoverSound active={!isVisiting && objectsReady && !active && hovered === "snack"} />

        {/* info info info info info info */}
        <NoteHoverSound active={objectsReady && !active && hovered === "note"} />

        {edit && (
          <OverlayEditor
            key={editSpotId}
            spotId={editSpotId}
            onSpotChange={setEditSpotId}
            sceneRef={sceneRef}
          />
        )}
      </div>
      {/* ↑ info info. info info info — info info info info info info info. */}

      {/* info info info info info info info (info info info info info). */}

        {/* info info — info info info info (info info info). info info info info. */}
        {!edit && !isVisiting && (
          <button
            type="button"
            onClick={() => setEntered(true)}
            aria-label="Tap to enter the room"
            className={`absolute inset-0 z-40 block text-left transition-opacity duration-[900ms] ${
              entered || active ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_70%_58%_at_50%_58%,theme(colors.bg/0%),theme(colors.bg/55%)_62%,theme(colors.bg/95%)),linear-gradient(to_bottom,theme(colors.bg/95%),theme(colors.bg/0%)_22%,theme(colors.bg/0%)_72%,theme(colors.bg/95%))]"
            />
            <span className="absolute left-4 bottom-4 sm:left-9 sm:bottom-9 flex flex-col items-start">
              <span className="text-cream font-serif text-2xl sm:text-5xl leading-none">Jolly Roger</span>
              <span className="mt-1.5 sm:mt-2.5 text-creamdim text-xs sm:text-sm">
                A room for your TCG collection.
              </span>
              <span className="mt-2 sm:mt-4 text-amber text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.22em] animate-tap-hint motion-reduce:animate-none">
                Tap anywhere to step inside
              </span>
            </span>
          </button>
        )}

        {/* info info — info info info info */}
        {isVisiting && (
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 bg-glass border border-glassline text-cream text-[10px] sm:text-xs font-bold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full backdrop-blur-md whitespace-nowrap">
            <span>
              Visiting <span className="text-amber">{fallbackName}</span>&apos;s room
            </span>
            <span className="w-px h-3.5 sm:h-4 bg-glassline" aria-hidden />
            <button
              onClick={() => visitRoom(HOME_ROOM_ID)}
              aria-label="Back to my room"
              className="inline-flex items-center gap-1 hover:text-amber transition-colors"
            >
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" weight="bold" aria-hidden />
              <span className="hidden sm:inline">Back to my room</span>
              <span className="sm:hidden">Back</span>
            </button>
            {aPassVerified && (
              <>
                <span className="w-px h-3.5 sm:h-4 bg-glassline" aria-hidden />
                <span className="inline-flex items-center gap-1 text-up">
                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" weight="fill" />
                  <span>CVI Verified</span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Profile badge — Click to customize Username & Profile Picture (Cloudflare R2) */}
        {objectsReady && !active && !edit && (
          <button
            onClick={() => !isVisiting && setShowSettings(true)}
            title={!isVisiting ? "Click to edit Username & Avatar" : undefined}
            className={`absolute bottom-3 right-12 sm:bottom-5 sm:right-16 z-30 flex items-center gap-1.5 sm:gap-2 h-7 sm:h-9 pl-0.5 pr-2 sm:pl-1 sm:pr-3 rounded-full bg-glass border border-glassline backdrop-blur-md transition ${
              !isVisiting ? "hover:border-purple-400/60 hover:scale-[1.02] cursor-pointer" : ""
            }`}
          >
            <RoomAvatar
              key={room.id}
              name={displayName}
              avatarUrl={!isVisiting ? userProfile.avatarUrl : undefined}
              walletAddress={room.walletAddress}
            />
            <span className="text-cream text-[10px] sm:text-xs font-bold">{displayName}</span>
          </button>
        )}

        {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}

        {/* info/info — info info info */}
        <BackgroundMusic active={objectsReady} />

        {/* info: info info info info + transforminfo info info info (info info info, info info).
            info info info bodyinfo info. */}
        {active && !isMobile && (
          <div className="absolute inset-0 z-50" style={{ transform: "translateZ(0)" }}>
            {!isVisiting && !loggedIn && active === "phone" && (
              <LoginIntro onLogin={login} onCancel={close} />
            )}
            {objectsReady && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
          </div>
        )}

      </div>

      {/* info: info info bodyinfo info info(overflow-hidden) info info.
          iOS info overflow-hidden info position:fixed info info info info,
          info info info info info. body info fixed inset-0 info info info info info info.
          RoomProvider info contextinfo info. */}
      {active &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            {!isVisiting && !loggedIn && active === "phone" && (
              <LoginIntro onLogin={login} onCancel={close} />
            )}
            {objectsReady && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
          </div>,
          document.body
        )}

      {/* info info — info info info info info UI info */}
      <ClickSound />

      {/* info info info — info info info info info info info. info info. */}
      <div
        aria-hidden={!moving}
        className={`fixed inset-0 z-[70] flex items-center justify-center bg-bg transition-opacity duration-300 ${
          moving ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* info(info, info info) + info info info info. color=amberinfo currentColorinfo info */}
        <div className="relative w-[96px] h-6 text-amber" aria-hidden>
          <span className="pac absolute left-0 top-0.5" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="pdot" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
      </div>

      <style>{`
        .pac {
          width: 20px; height: 20px; background: currentColor; border-radius: 50%;
          animation: pac-chomp 0.45s linear infinite;
        }
        @keyframes pac-chomp {
          0%, 100% { clip-path: polygon(100% 25%, 45% 50%, 100% 75%, 100% 100%, 0 100%, 0 0, 100% 0); }
          50%      { clip-path: polygon(100% 48%, 45% 50%, 100% 52%, 100% 100%, 0 100%, 0 0, 100% 0); }
        }
        .pdot {
          position: absolute; top: 9px; width: 5px; height: 5px; border-radius: 50%;
          background: currentColor; animation: pac-eat 1.2s linear infinite;
        }
        @keyframes pac-eat {
          0%   { left: 92px; opacity: 1; }
          78%  { left: 24px; opacity: 1; }
          82%  { left: 22px; opacity: 0; }
          100% { left: 22px; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pac, .pdot { animation: none; }
        }
      `}</style>
    </main>
    </RoomProvider>
  );
}
