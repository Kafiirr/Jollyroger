"use client";

import { useEffect, useState } from "react";
import { Desktop, DeviceMobile, DeviceTablet, LockKey, Copy, Check, ShieldWarning } from "@phosphor-icons/react";

export function DesktopOnlyGuard({ children }: { children: React.ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      if (typeof window === "undefined") return;

      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(ua);
      const isTabletUA = /iPad|Tablet|PlayBook|Kindle/i.test(ua);
      const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
      const isSmallScreen = window.innerWidth < 1024;
      const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

      const blocked = isMobileUA || isTabletUA || isIPadOS || (isTouch && isSmallScreen) || isSmallScreen;
      setIsBlocked(blocked);

      // Build friendly device tag for debugging context
      if (isMobileUA) setDeviceDetails("Mobile Phone Detected");
      else if (isTabletUA || isIPadOS) setDeviceDetails("Tablet Device Detected");
      else if (isSmallScreen) setDeviceDetails(`Viewport Width: ${window.innerWidth}px (< 1024px)`);
      else setDeviceDetails("PC / Desktop Compatible");
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);
    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prevent flash during hydration
  if (!mounted) {
    return <>{children}</>;
  }

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#07070F] text-cream flex items-center justify-center p-4 overflow-y-auto selection:bg-amber/30">
        {/* Neon Background Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-rose-500/10 rounded-full blur-[100px]" />
          
          {/* Retro Grid Background */}
          <div 
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `linear-gradient(to right, #B78CFF 1px, transparent 1px), linear-gradient(to bottom, #B78CFF 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Modal Content Card */}
        <div className="relative w-full max-w-lg bg-glass border border-glassline backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(183,140,255,0.15)] text-center flex flex-col items-center">
          
          {/* Restricted Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <LockKey className="w-3.5 h-3.5 text-rose-400" weight="bold" />
            <span>PC & Desktop Only</span>
          </div>

          {/* Icon Header */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-amber/15 border border-amber/40 flex items-center justify-center shadow-[0_0_30px_rgba(183,140,255,0.3)]">
              <Desktop className="w-10 h-10 text-amber" weight="duotone" />
            </div>
            
            {/* Crossed out mobile indicator floating badge */}
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[#17102E] border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-md">
              <DeviceMobile className="w-5 h-5 opacity-40 line-through" weight="bold" />
              <span className="absolute inset-0 flex items-center justify-center text-rose-500 text-xs font-black select-none">✕</span>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-cream mb-2">
            Desktop Computer Required
          </h1>
          
          <p className="text-creamdim text-sm sm:text-base leading-relaxed mb-6">
            <span className="text-amber font-semibold">Jolly Roger</span> is an interactive 2D gamer hideout optimized strictly for keyboard & mouse navigation on PC and Laptop displays.
          </p>

          {/* Unallowed devices notification box */}
          <div className="w-full bg-inkdark/80 border border-glassline rounded-2xl p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-cream">
              <span className="flex items-center gap-1.5 text-rose-400">
                <ShieldWarning className="w-4 h-4" weight="fill" />
                <span>Unsupported Device</span>
              </span>
              <span className="font-mono text-[10px] text-creamdim bg-white/5 px-2 py-0.5 rounded">
                {deviceDetails}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-creamdim">
              <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                <DeviceMobile className="w-4 h-4 text-rose-400 shrink-0" weight="regular" />
                <span className="line-through text-creamdim/70">Mobile Phone</span>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                <DeviceTablet className="w-4 h-4 text-rose-400 shrink-0" weight="regular" />
                <span className="line-through text-creamdim/70">Tablet / iPad</span>
              </div>
            </div>
          </div>

          {/* Desktop instructions */}
          <p className="text-xs text-creamdim mb-6">
            Please open this site on your desktop or laptop computer browser to step inside the hideout.
          </p>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3 px-4 rounded-xl bg-amber text-inkdark font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_20px_rgba(183,140,255,0.4)] cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" weight="bold" />
                <span>Link Copied! Send to your PC</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" weight="bold" />
                <span>Copy Link to Open on PC</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
