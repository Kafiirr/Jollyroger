"use client";

import { useState } from "react";
import { SpotId } from "@/lib/spots";
import { ScreenShell } from "./screens/ScreenShell";
import { SCREENS } from "./screens/registry";
import { useAccount, useDisconnect } from "wagmi";
import { getLocalProfile } from "@/lib/userProfile";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  WifiHigh,
  BatteryCharging,
  Copy,
  Check,
  ArrowSquareOut,
  SignOut,
  User,
} from "@phosphor-icons/react";

export function truncateAddress(addr?: string | null): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ObjectScreen({
  spot,
  onClose,
  onLogout,
}: {
  spot: SpotId;
  onClose: () => void;
  onLogout: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const profile = getLocalProfile(address);
  const displayAddress = address ? truncateAddress(address) : "0x0000...0000";

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDisconnect = () => {
    try {
      disconnect();
    } catch {
      // ignore
    }
    onLogout();
  };

  if (spot === "phone") {
    return (
      <ScreenShell title="Collector Phone" onClose={onClose}>
        <div className="w-full max-w-[320px] rounded-[2.2rem] bg-glass border border-glassline shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl p-5 flex flex-col items-center text-center space-y-4">
          {/* Phone Top Notch / Status Bar */}
          <div className="w-full flex items-center justify-between px-2 pt-1 text-[11px] text-creamdim/70 font-mono">
            <span className="font-bold text-cream">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="flex items-center gap-2">
              <WifiHigh size={14} weight="bold" />
              <BatteryCharging size={16} weight="bold" className="text-up" />
            </div>
          </div>

          {/* Connected App Header */}
          <div className="pt-1">
            <Eyebrow>Web3 Authenticator</Eyebrow>
            <h3 className="text-base font-bold text-cream">Wallet Device</h3>
          </div>

          {/* Profile & Wallet Card */}
          <div className="w-full bg-ambersoft/50 border border-glassline rounded-2xl p-4 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-bg border-2 border-amber/50 shadow-[0_0_20px_rgba(183,140,255,0.25)] flex items-center justify-center">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={26} weight="duotone" className="text-amber" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-up border-2 border-bg shadow-[0_0_8px_rgba(110,232,200,0.8)]" />
            </div>

            <div className="text-sm font-bold text-cream">{profile.username || "Collector"}</div>

            {/* Address with Copy Action */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-bg/60 border border-glassline hover:border-amber/40 text-xs font-mono text-creamdim hover:text-cream transition-all group"
            >
              <span>{displayAddress}</span>
              <span className="text-amber group-hover:scale-110 transition-transform">
                {copied ? <Check size={14} weight="bold" className="text-up" /> : <Copy size={14} />}
              </span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="w-full space-y-2 pt-1">
            {address && (
              <a
                href={`https://testnet.monadscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cream/[0.04] border border-glassline hover:bg-cream/[0.08] hover:text-amber text-xs font-bold text-cream transition-all"
              >
                <span>View on Monad Explorer</span>
                <ArrowSquareOut size={13} weight="bold" />
              </a>
            )}

            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-glassline hover:border-down/40 hover:bg-down/10 text-xs font-bold text-creamdim hover:text-down transition-all"
            >
              <SignOut size={14} weight="bold" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const Screen = SCREENS[spot];
  if (!Screen) return null;
  return <Screen onClose={onClose} />;
}
