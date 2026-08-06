import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenShell } from "./ScreenShell";
import { supabase } from "@/lib/supabase";
import { getRoom, HOME_ROOM_ID, isValidAddress, Room } from "@/lib/rooms";
import { useAvatar } from "@/lib/useAvatar";
import { useProfileName } from "@/lib/useProfileName";
import { useRoom } from "../RoomContext";
import { verifyCCPTransaction, CCPCheckResult } from "@/lib/api/cleanverse";
import { Check, Heart, House, Trash, ShieldCheck, X, FileText, CurrencyCircleDollar } from "@phosphor-icons/react";

import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { getLocalProfile } from "@/lib/userProfile";

/** EVM wallet address regex */
const ETH_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

/**        (  ). Supabase `guestbook.comments`(jsonb)  . */
type Comment = { author: string; message: string; at: string };

type Guestbook = {
  id: string;
  owner?: string;
  author?: string;
  nickname: string;
  message: string;
  created_at: string;
  likes?: number;
  comments?: Comment[] | null;
  ccpReport?: CCPCheckResult | null;
};

/**   —   (UI   ) */
const fmtWhen = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function getRoomFromUrl() {
  if (typeof window === "undefined") return getRoom(null);
  return getRoom(new URLSearchParams(window.location.search).get("room"));
}

/** Avatar component */
function Avatar({
  nickname,
  userId,
  avatarUrl,
  size = 40,
}: {
  nickname: string;
  userId?: string;
  avatarUrl?: string;
  size?: number;
}) {
  const live = useAvatar(userId);
  const url = live ?? avatarUrl;
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const initial = nickname.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="shrink-0 grid place-items-center rounded-lg overflow-hidden bg-ambersoft border border-glassline"
      style={{ width: size, height: size }}
    >
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-amber" style={{ fontSize: size * 0.42 }}>
          {initial}
        </span>
      )}
    </span>
  );
}

export function NoteScreen({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { visitRoom } = useRoom();
  const [room, setRoom] = useState(getRoomFromUrl);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(false);
  const likedKey = `jollyroger_liked_notes_${address?.toLowerCase() || "guest"}`;

  const [liked, setLiked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(likedKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isOwnRoom = room.id === HOME_ROOM_ID;

  // Active target wallet address for this room
  const activeWallet = isOwnRoom ? address : room.walletAddress;
  // Fetch live username for the target wallet from Supabase API (/api/profile)
  const fetchedUsername = useProfileName(activeWallet);
  const localProfile = getLocalProfile(address);

  // Current logged in user identity for signing notes
  const myNickname = localProfile.username || fetchedUsername || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "collector");
  const myAddress = address ? address.toLowerCase() : "";

  // Resolved owner label for current room header ('s notes)
  const ownerLabel = isOwnRoom
    ? (localProfile.username || fetchedUsername || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Home"))
    : (fetchedUsername || room.ownerName || (room.walletAddress ? `${room.walletAddress.slice(0, 6)}...${room.walletAddress.slice(-4)}` : "Collector"));

  // Generate all possible owner keys for the current room to ensure notes are never missed
  const possibleOwnerKeys = useMemo(() => {
    const keys = new Set<string>();
    keys.add("home");
    if (address) keys.add(address.toLowerCase());
    if (room.walletAddress) keys.add(room.walletAddress.toLowerCase());
    if (room.id && room.id !== HOME_ROOM_ID) keys.add(room.id.toLowerCase());
    if (localProfile.username) keys.add(localProfile.username.toLowerCase());
    if (fetchedUsername) keys.add(fetchedUsername.toLowerCase());
    return Array.from(keys);
  }, [address, room.walletAddress, room.id, localProfile.username, fetchedUsername]);

  // Room search state (accepts wallet address 0x... or username)
  const [visitId, setVisitId] = useState("");
  const [visitErr, setVisitErr] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleVisit() {
    const query = visitId.trim();
    if (!query) return;

    setVisitErr("");

    if (ETH_ADDR_RE.test(query)) {
      onClose();
      visitRoom(query.toLowerCase());
      return;
    }

    const cleanUsername = query.replace(/^@/, "").trim().toLowerCase();
    if (!cleanUsername) {
      setVisitErr("Enter a valid wallet address or username.");
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (data && data.id) {
        onClose();
        visitRoom(data.id);
      } else {
        setVisitErr(`No collector found with username "${cleanUsername}".`);
      }
    } catch {
      setVisitErr("Failed to search user by nickname.");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    let lastSearch = window.location.search;
    const syncRoom = () => {
      lastSearch = window.location.search;
      setRoom(getRoomFromUrl());
    };

    syncRoom();
    const interval = window.setInterval(() => {
      if (window.location.search !== lastSearch) syncRoom();
    }, 300);
    window.addEventListener("popstate", syncRoom);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", syncRoom);
    };
  }, []);

  async function likePost(id: string, current: number) {
    if (liked.has(id)) return;
    const nextLiked = new Set(liked).add(id);
    setLiked(nextLiked);
    try {
      localStorage.setItem(likedKey, JSON.stringify(Array.from(nextLiked)));
    } catch {}

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
    await supabase.from("guestbook").update({ likes: current + 1 }).eq("id", id);
  }

  const loadGuestbook = useCallback(async () => {
    if (possibleOwnerKeys.length === 0) return;
    const { data, error } = await supabase
      .from("guestbook")
      .select("*")
      .in("owner", possibleOwnerKeys)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const parsed: Guestbook[] = data.map((d: any) => {
        const rawContent = d.content || d.message || "";
        const authorMatch = rawContent.match(/\[Author: @([^\]]+)\]/);
        const nickname = authorMatch
          ? authorMatch[1]
          : d.nickname
          ? d.nickname
          : d.author && d.author.startsWith("0x")
          ? `${d.author.slice(0, 6)}...${d.author.slice(-4)}`
          : d.author || "collector";
        const cleanMessage = rawContent.replace(/\[Author: @[^\]]+\]/, "").trim();

        return {
          id: String(d.id),
          owner: d.owner,
          author: d.author,
          nickname,
          message: cleanMessage,
          created_at: d.created_at,
          likes: d.likes ?? 0,
          comments: d.comments ?? [],
        };
      });
      setPosts(parsed);
    }
  }, [possibleOwnerKeys]);

  // Real-time Supabase subscription + 4-second auto-poll sync (no manual page refresh needed)
  useEffect(() => {
    loadGuestbook();

    const pollInterval = setInterval(() => {
      loadGuestbook();
    }, 4000);

    const channel = supabase
      .channel("guestbook_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guestbook" },
        () => {
          loadGuestbook();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [loadGuestbook]);

  const [sendTip, setSendTip] = useState(false);
  const [tipAmount, setTipAmount] = useState("0.1");
  const [tipErr, setTipErr] = useState("");
  const [selectedAuditReport, setSelectedAuditReport] = useState<CCPCheckResult | null>(null);

  /** Handle signing and posting a note (with optional flexible MON gift) */
  async function handlePost() {
    if (!message.trim()) return;
    setLoading(true);
    setTipErr("");

    let txHash: string | undefined = undefined;

    // Send MON Gift if checked
    if (sendTip) {
      const numAmount = Number(tipAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setTipErr("Please enter a valid MON gift amount.");
        setLoading(false);
        return;
      }
      const recipientAddress = room.walletAddress || (room.id.startsWith("0x") ? room.id : undefined);
      if (!recipientAddress || !ETH_ADDR_RE.test(recipientAddress)) {
        setTipErr("Recipient does not have a valid EVM wallet address to receive MON.");
        setLoading(false);
        return;
      }

      try {
        const hash = await sendTransactionAsync({
          to: recipientAddress as `0x${string}`,
          value: parseEther(tipAmount),
        });
        txHash = hash;
      } catch (err: any) {
        console.warn("MON transfer error:", err);
        setTipErr(err?.shortMessage || err?.message || "Failed to send MON gift.");
        setLoading(false);
        return;
      }
    }

    const noteText = message.trim();
    let finalContent = noteText;
    if (txHash) {
      finalContent += `\n[🎁 Gifted ${tipAmount} MON | Tx: ${txHash}]`;
    }
    if (myNickname) {
      finalContent += `\n[Author: @${myNickname}]`;
    }

    const targetOwner = isOwnRoom
      ? (address ? address.toLowerCase() : "home")
      : (room.walletAddress ? room.walletAddress.toLowerCase() : room.id.toLowerCase());

    const { error } = await supabase.from("guestbook").insert({
      owner: targetOwner,
      author: myAddress || myNickname,
      content: finalContent,
    });

    setLoading(false);
    if (error) {
      console.error("Guestbook insert error:", error);
      const localNewPost: Guestbook = {
        id: `post_${Date.now()}`,
        owner: targetOwner,
        author: myAddress,
        nickname: myNickname,
        message: finalContent,
        created_at: new Date().toISOString(),
      };
      setPosts((prev) => [localNewPost, ...prev]);
    } else {
      loadGuestbook();
    }
    setMessage("");
    setSendTip(false);
  }

  async function deleteEntry(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("guestbook").delete().eq("id", id);
    if (error) {
      console.error("Delete guestbook entry error:", error);
      loadGuestbook();
    }
  }

  const setDraft = (id: string, val: string) => setDrafts((d) => ({ ...d, [id]: val }));

  async function addComment(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    const commentAuthor = myNickname ? `@${myNickname}` : "collector";
    const c: Comment = { author: commentAuthor, message: text, at: new Date().toISOString() };
    const targetPost = posts.find((p) => p.id === id);
    if (!targetPost) return;
    const nextComments = [...(targetPost.comments ?? []), c];

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: nextComments } : p)));
    setDraft(id, "");

    const { error } = await supabase.from("guestbook").update({ comments: nextComments }).eq("id", id);
    if (error) {
      console.error("Error adding reply comment:", error);
      loadGuestbook();
    }
  }

  async function deleteComment(id: string, index: number) {
    const targetPost = posts.find((p) => p.id === id);
    if (!targetPost) return;
    const nextComments = (targetPost.comments ?? []).filter((_, i) => i !== index);

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: nextComments } : p)));
    const { error } = await supabase.from("guestbook").update({ comments: nextComments }).eq("id", id);
    if (error) {
      console.error("Error deleting reply comment:", error);
      loadGuestbook();
    }
  }

  const visiblePosts = posts;

  // ( ) —
  const commentInputCls =
    "min-w-0 flex-1 rounded-lg border border-glassline bg-cream/[0.05] px-3 py-2 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";
  const paperInputCls =
    "w-full rounded-xl border border-amber/20 bg-cream/70 px-4 py-3 text-[13px] leading-relaxed text-inkdark placeholder:text-inkdark/45 outline-none focus:border-amber transition-colors";

  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <div className="relative w-[min(94vw,880px)] h-[min(82vh,660px)] rounded-[18px] border border-glassline bg-glass backdrop-blur-md shadow-2xl overflow-hidden p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[14px] bg-[radial-gradient(circle_at_18%_14%,theme(colors.amber/14%),transparent_25%),linear-gradient(105deg,theme(colors.cream),theme(colors.cream/90)_48%,theme(colors.creamdim/35)_50%,theme(colors.cream/90)_52%,theme(colors.cream)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[14px] opacity-45 bg-[linear-gradient(theme(colors.inkdark/5%)_1px,transparent_1px)] bg-[length:100%_28px]"
        />

        <div className="relative grid h-full text-inkdark grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[0.92fr_1.08fr] md:grid-rows-1">
          <section className="min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-inkdark/10 px-5 py-4 sm:px-7 sm:py-6">
            <div className="shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-inkdark/55">Notebook</div>
              <h2 className="mt-1 font-serif text-3xl leading-none text-inkdark">Guestbook</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-inkdark/60">
                {isOwnRoom ? (
                  "Your guestbook. Visit another collector's room below."
                ) : (
                  <>Leave a note in {ownerLabel}&apos;s room.</>
                )}
              </p>
            </div>

            {/* Visit a Room Box — only shown in your own room */}
            {isOwnRoom && (
            <div className="mt-5 shrink-0 rounded-xl border border-amber/20 bg-cream/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-inkdark/45">Visit a room</div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={visitId}
                  onChange={(e) => {
                    setVisitId(e.target.value);
                    if (visitErr) setVisitErr("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVisit();
                    }
                  }}
                  placeholder="Wallet address or username"
                  spellCheck={false}
                  className={`${paperInputCls} min-w-0 flex-1 !py-2 font-mono text-[12px]`}
                />
                <button
                  onClick={handleVisit}
                  disabled={!visitId.trim() || isSearching}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-inkdark px-3 py-2 text-[13px] font-bold text-cream transition hover:brightness-125 disabled:opacity-40"
                >
                  {isSearching ? (
                    <span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                  ) : (
                    <>
                      <House size={15} weight="fill" aria-hidden />
                      Visit
                    </>
                  )}
                </button>
              </div>
              {visitErr ? (
                <p className="mt-1.5 text-[11px] font-semibold text-down">{visitErr}</p>
              ) : (
                <p className="mt-1.5 text-[11px] text-inkdark/45">Enter a wallet address or username to visit their room.</p>
              )}
            </div>
            )}

            {/* Signed as footer */}
            {!isOwnRoom && (
              <>
                <div className="mt-4 shrink-0 flex items-center gap-3 rounded-xl border border-amber/20 bg-cream/50 p-3">
                  <Avatar
                    nickname={myNickname}
                    userId={address}
                    avatarUrl={localProfile.avatarUrl}
                    size={38}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-inkdark/45">Signed as</div>
                    <div className="truncate text-sm font-bold text-inkdark">@{myNickname}</div>
                  </div>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Write a note for ${ownerLabel}...`}
                    maxLength={160}
                    className={`${paperInputCls} min-h-[88px] md:min-h-[110px] flex-1 resize-none`}
                  />

                  {/* Flexible MON Gift Option for Monad Testnet */}
                  <div className="mt-2.5 p-3 rounded-xl bg-purple-900/10 border border-purple-500/20 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[12px] font-medium text-inkdark">
                      <input
                        type="checkbox"
                        checked={sendTip}
                        onChange={(e) => {
                          setSendTip(e.target.checked);
                          if (tipErr) setTipErr("");
                        }}
                        className="rounded accent-purple-600 w-4 h-4"
                      />
                      <span className="flex items-center gap-1.5 font-bold text-purple-900">
                        <CurrencyCircleDollar size={18} className="text-purple-600" />
                        Attach MON Gift (Monad Testnet)
                      </span>
                    </label>

                    {sendTip && (
                      <div className="space-y-1.5 pl-6">
                        <div className="flex items-center gap-2 text-[12px] text-inkdark/80">
                          <span className="font-semibold">Amount:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.001"
                            value={tipAmount}
                            onChange={(e) => {
                              setTipAmount(e.target.value);
                              if (tipErr) setTipErr("");
                            }}
                            placeholder="0.1"
                            className="w-28 bg-cream border border-purple-300 rounded-lg px-2.5 py-1 font-mono text-[12px] text-purple-950 font-bold outline-none focus:border-purple-600"
                          />
                          <span className="font-bold text-purple-900">MON</span>
                        </div>
                        <p className="text-[10px] text-purple-700 font-medium">
                          On-chain transfer directly to recipient address ({room.walletAddress ? `${room.walletAddress.slice(0, 6)}...${room.walletAddress.slice(-4)}` : "room owner"})
                        </p>
                      </div>
                    )}
                    {tipErr && <p className="text-[11px] font-semibold text-down pl-6">{tipErr}</p>}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-inkdark/45">{message.length}/160</span>
                    <button
                      onClick={handlePost}
                      disabled={loading || !message.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-sm font-bold transition shadow-sm disabled:opacity-40"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={16} weight="bold" aria-hidden />
                          {sendTip ? `Send Note & ${tipAmount} MON Gift` : "Sign Note"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="min-h-0 flex flex-col px-5 py-5 sm:px-7 sm:py-6">
            <div className="shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[10px] font-bold uppercase tracking-[0.26em] text-inkdark/55">
                  {isOwnRoom ? "Home" : "Collector's Room"}
                </div>
                <h3 className="mt-1 truncate text-lg font-bold text-inkdark">{ownerLabel}&apos;s notes</h3>
              </div>
              <span className="shrink-0 rounded-full border border-inkdark/10 bg-cream/55 px-3 py-1 text-[11px] font-bold text-inkdark/55">
                {visiblePosts.length} notes
              </span>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 -mr-1">
              {visiblePosts.length === 0 && (
                <div className="rounded-xl border border-dashed border-inkdark/15 bg-cream/40 p-8 text-center text-inkdark/55">
                  <div className="font-serif text-xl text-inkdark">No guestbook yet</div>
                  <div className="mt-1 text-xs">Be the first to sign {ownerLabel}&apos;s guestbook.</div>
                </div>
              )}

              {visiblePosts.map((post, idx) => {
                const ownerAddr = post.owner && isValidAddress(post.owner) ? post.owner : post.author && isValidAddress(post.author) ? post.author : isValidAddress(post.nickname) ? post.nickname : undefined;
                const linkedRoom = ownerAddr ? getRoom(ownerAddr) : undefined;
                const isLiked = liked.has(post.id);
                const canDelete = isOwnRoom || (post.author && address && post.author.toLowerCase() === address.toLowerCase()) || (post.nickname && post.nickname.toLowerCase() === myNickname.toLowerCase());
                const no = visiblePosts.length - idx;
                const comments = post.comments ?? [];

                // Extract MON Gift tx info if present
                const txMatch = post.message.match(/\[🎁 Gifted ([0-9.]+) MON \| Tx: (0x[0-9a-fA-F]+)\]/);
                const cleanMsg = post.message.replace(/\[🎁 Gifted [^\]]+\]/, "").trim();

                return (
                  <div key={post.id} className="rounded-xl border border-inkdark/10 bg-bg/85 text-cream shadow-[0_12px_30px_rgba(0,0,0,0.18)] overflow-hidden">
                    <div className="flex items-center justify-between gap-2 bg-cream/[0.08] border-b border-cream/10 px-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[12px] font-medium text-creamdim">No.{no}</span>
                        <span className="text-[12px] font-bold text-cream truncate">@{post.nickname}</span>
                        {linkedRoom && (
                          <button
                            onClick={() => {
                              onClose();
                              visitRoom(linkedRoom.id);
                            }}
                            title={`Visit ${linkedRoom.ownerName}'s room`}
                            aria-label={`Visit ${linkedRoom.ownerName}'s room`}
                            className="shrink-0 leading-none text-amber hover:text-cream transition-colors"
                          >
                            <House size={14} weight="fill" aria-hidden />
                          </button>
                        )}
                        <span className="shrink-0 text-[12px] font-medium text-creamdim">{fmtWhen(post.created_at)}</span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => deleteEntry(post.id)}
                          className="shrink-0 text-[11px] font-bold text-creamdim hover:text-down transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4 p-4">
                      <Avatar
                        nickname={post.nickname}
                        userId={post.author || linkedRoom?.walletAddress}
                        avatarUrl={linkedRoom?.avatarUrl}
                        size={52}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-cream/90">
                          {cleanMsg}
                        </p>

                        {/* On-Chain MON Gift Badge */}
                        {txMatch && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <a
                              href={`https://testnet.monadscan.com/tx/${txMatch[2]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/70 border border-purple-500/50 text-[11px] font-mono text-purple-200 hover:bg-purple-900 transition shadow-sm"
                            >
                              <CurrencyCircleDollar size={15} className="text-amber" />
                              <span className="font-bold text-amber">{txMatch[1]} MON Gifted</span>
                              <span className="text-[10px] text-purple-300 underline underline-offset-2 ml-1">
                                View Tx
                              </span>
                            </a>
                          </div>
                        )}

                        {/* CCP Protocol Audit Badge */}
                        {post.ccpReport && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAuditReport(post.ccpReport ?? null)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300 hover:bg-purple-900/80 transition"
                            >
                              <ShieldCheck size={13} className="text-emerald-400" />
                              <span>CCP Travel Rule Compliant ({post.ccpReport.amount} {post.ccpReport.assetSymbol})</span>
                              <FileText size={12} className="text-purple-400 ml-1" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => likePost(post.id, post.likes ?? 0)}
                          disabled={isLiked}
                          aria-label={isLiked ? "Liked" : "Like this note"}
                          className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${isLiked ? "text-amber" : "text-creamdim hover:text-amber"
                            }`}
                        >
                          <Heart size={15} weight={isLiked ? "fill" : "bold"} aria-hidden />
                          {post.likes ?? 0}
                        </button>
                      </div>
                    </div>

                    {/* Comments / Replies list */}
                    {comments.map((c, ci) => {
                      const cleanAuthor = c.author.toLowerCase().replace(/^@/, "");
                      const isCommentAuthor = cleanAuthor === myNickname.toLowerCase();
                      const canDeleteComment = isOwnRoom || isCommentAuthor;
                      const roleLabel = cleanAuthor === (room.ownerName || "").toLowerCase()
                        ? "room owner"
                        : cleanAuthor === post.nickname.toLowerCase()
                        ? "note author"
                        : "collector";

                      return (
                        <div key={ci} className="border-t border-glassline bg-cream/[0.04] px-4 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[12px] font-bold text-amber">{c.author}</span>
                              <span className="shrink-0 text-[11px] font-medium text-creamdim/70">· {roleLabel}</span>
                              <span className="shrink-0 text-[11px] font-medium text-creamdim/70">{fmtWhen(c.at)}</span>
                            </div>
                            {canDeleteComment && (
                              <button
                                onClick={() => deleteComment(post.id, ci)}
                                aria-label="Delete reply"
                                className="shrink-0 text-creamdim hover:text-down transition-colors"
                              >
                                <Trash size={13} weight="bold" aria-hidden />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-cream/90">
                            {c.message}
                          </p>
                        </div>
                      );
                    })}

                    {/* Reply input box — available to room owner, note author, or any connected collector */}
                    {Boolean(address) && (
                      <div className="flex items-center gap-2 border-t border-glassline bg-bg/25 px-4 py-2.5">
                        <input
                          value={drafts[post.id] ?? ""}
                          onChange={(e) => setDraft(post.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              addComment(post.id);
                            }
                          }}
                          placeholder="Leave a reply..."
                          maxLength={80}
                          className={commentInputCls}
                        />
                        <button
                          onClick={() => addComment(post.id)}
                          disabled={!(drafts[post.id] ?? "").trim()}
                          aria-label="Post reply"
                          className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition disabled:opacity-40"
                        >
                          <Check size={16} weight="bold" aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Cleanverse CCP Audit Report Modal */}
      {selectedAuditReport && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedAuditReport(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-purple-500/40 p-6 text-cream shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedAuditReport(null)} className="absolute top-3 right-3 text-creamdim hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck size={24} className="text-emerald-400" />
              <div>
                <h3 className="font-bold text-base text-white">Cleanverse CCP Audit Report</h3>
                <p className="text-[10px] font-mono text-purple-300">ID: {selectedAuditReport.auditReportId}</p>
              </div>
            </div>

            <div className="bg-neutral-950 rounded-xl p-3.5 space-y-2 border border-neutral-800 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-400">Pre-Tx Rule Check:</span>
                <span className="text-emerald-400 font-bold">APPROVED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Travel Rule Status:</span>
                <span className="text-emerald-400 font-bold">{selectedAuditReport.travelRuleStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">AML Risk Score:</span>
                <span className="text-emerald-400 font-bold">{selectedAuditReport.riskScore} / 100 (Clean)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Asset & Amount:</span>
                <span className="text-white font-bold">{selectedAuditReport.amount} {selectedAuditReport.assetSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Sender / Beneficiary:</span>
                <span className="text-purple-300 truncate max-w-[180px]">{selectedAuditReport.senderAddress} → {selectedAuditReport.recipientAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Anchor Network:</span>
                <span className="text-purple-400">Monad Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Timestamp:</span>
                <span className="text-neutral-400 text-[10px]">{new Date(selectedAuditReport.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  alert(`Audit report exported to Cleanverse Ledger (${selectedAuditReport.auditReportId})`);
                  setSelectedAuditReport(null);
                }}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition"
              >
                Extract Audit Report (PDF / JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
